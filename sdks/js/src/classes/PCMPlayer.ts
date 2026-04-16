interface PCMPlayerOptions {
  encoding?: string;
  channels?: number;
  sampleRate?: number;
  flushingTime?: number;
  gain?: number;
  useAudioElement?: boolean;
  outputDeviceId?: string;
  autoResume?: boolean;
}

type OnEndedCallback = (feedCounter: number) => void;

const ENCODING_MAX_VALUES: Record<string, number> = {
  '8bitInt': 128,
  '16bitInt': 32768,
  '32bitInt': 2147483648,
  '32bitFloat': 1
};

type SupportedTypedArrayConstructor =
  | Int8ArrayConstructor
  | Int16ArrayConstructor
  | Int32ArrayConstructor
  | Float32ArrayConstructor;

const ENCODING_TYPED_ARRAYS: Record<string, SupportedTypedArrayConstructor> = {
  '8bitInt': Int8Array,
  '16bitInt': Int16Array,
  '32bitInt': Int32Array,
  '32bitFloat': Float32Array
};

const FADE_SAMPLES = 50;
const DEFAULT_ENCODING = '16bitInt';

const DEFAULT_OPTIONS: Required<PCMPlayerOptions> = {
  encoding: DEFAULT_ENCODING,
  channels: 1,
  sampleRate: 8000,
  flushingTime: 1000,
  gain: 1,
  useAudioElement: false,
  outputDeviceId: '',
  autoResume: false,
};

/**
 * PCM audio player built on the Web Audio API.
 *
 * Accepts raw PCM data via {@link feed}, buffers it in chunks, and periodically
 * flushes the accumulated samples into scheduled AudioBufferSourceNodes for
 * gapless playback. Supports multiple PCM encodings (8/16/32-bit integer and
 * 32-bit float), configurable sample rates, multichannel audio, and optional
 * output device routing via an Audio element.
 *
 * Design notes:
 *  - Sample buffering uses a chunked approach: feed() appends in O(1) and
 *    flush() concatenates once in O(n), keeping total work linear.
 *  - 32-bit float data (the common path) bypasses per-sample conversion
 *    entirely. Other encodings use multiplication by a precomputed reciprocal.
 *  - Fade-in/fade-out is split into three tight loops so the main body loop
 *    is branch-free.
 *  - All Web Audio resources (AudioContext, GainNode, AudioBufferSourceNodes,
 *    Audio element, MediaStream) are fully released on destroy().
 *  - All public methods are safe to call before init() or after destroy().
 */
class PCMPlayer {
  private readonly options: Required<PCMPlayerOptions>;

  private onEndedCallback: OnEndedCallback | null;
  private readonly maxValue: number;
  private readonly typedArrayCtor: SupportedTypedArrayConstructor;

  private chunks: Float32Array[] = [];
  private totalSamples = 0;
  private feedCounter = 0;

  private audioCtx: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private audioEl: HTMLAudioElement | null = null;
  private mediaStreamDest: MediaStreamAudioDestinationNode | null = null;

  private startTime = 0;
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private startTimestampMs = 0;
  private flushTimeSyncMs = 0;

  private muted = false;
  private destroyed = false;

  /**
   * AbortController used to cancel an in-flight {@link webAudioTouchUnlock}
   * promise when {@link destroy} runs before the first user gesture. Non-null
   * only while a touch unlock is pending; cleared on resolution, rejection,
   * or abort.
   */
  private touchUnlockAbort: AbortController | null = null;

  constructor(options?: PCMPlayerOptions, onEndedCallback?: OnEndedCallback) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    if (!this.isValidGain(this.options.gain)) {
      this.options.gain = 1;
    }

    this.onEndedCallback = onEndedCallback ?? null;

    const encoding = this.options.encoding;
    this.maxValue =
      ENCODING_MAX_VALUES[encoding] ?? ENCODING_MAX_VALUES[DEFAULT_ENCODING];
    this.typedArrayCtor =
      ENCODING_TYPED_ARRAYS[encoding] ?? ENCODING_TYPED_ARRAYS[DEFAULT_ENCODING];
  }

  /**
   * Initializes the AudioContext, GainNode, and flush timer.
   * Must be called (and awaited) before feeding data.
   *
   * Note: On mobile browsers (iOS/Safari) the AudioContext may start in a
   * "suspended" state. This method installs touch event listeners that will
   * resume the context on the first user interaction. Callers should ensure
   * init() is invoked in response to a user gesture (e.g. a button tap) so
   * the context can be resumed immediately.
   */
  public async init(): Promise<void> {
    if (this.destroyed) {
      return;
    }

    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    this.audioCtx = new AudioCtx();

    if (this.options.autoResume) {
      await this.audioCtx.resume();
    } else {
      await this.webAudioTouchUnlock(this.audioCtx);
    }

    if (!this.audioCtx) {
      return;
    }

    this.gainNode = this.audioCtx.createGain();
    this.gainNode.gain.value = this.options.gain;

    if (this.options.useAudioElement) {
      this.createAudioElement();
    } else {
      this.gainNode.connect(this.audioCtx.destination);
    }

    this.startTime = this.audioCtx.currentTime;
    this.startTimestampMs = Date.now();
    this.flushTimeSyncMs = this.options.flushingTime;
    this.scheduleFlush(this.flushTimeSyncMs);
  }

  /**
   * Buffers PCM sample data for playback. Data is accumulated in chunks and
   * flushed to the audio output on the next flush cycle.
   * @param data Raw PCM samples as a typed array.
   */
  public feed(data: Float32Array | ArrayBufferView) {
    if (this.muted || this.destroyed) {
      return;
    }
    if (!this.isTypedArray(data)) {
      return;
    }

    const formatted = this.formatSamples(data);
    this.chunks.push(formatted);
    this.totalSamples += formatted.length;
    this.feedCounter++;
  }

  /**
   * Sets the playback gain.
   * @param gain Desired gain value. Expected range is [0, 2].
   * @returns false if the gain is invalid, undefined otherwise.
   */
  public setGain(gain: number): boolean | undefined {
    if (!this.isValidGain(gain)) {
      return false;
    }
    this.options.gain = gain;
    if (this.gainNode) {
      this.gainNode.gain.value = gain;
    }
    return undefined;
  }

  /**
   * Routes audio output to the specified device.
   * Only effective when the player was initialized with useAudioElement.
   * @param deviceId The audio output device identifier.
   */
  public setSinkId(deviceId: string) {
    if (this.audioEl && typeof (this.audioEl as any).setSinkId === 'function') {
      (this.audioEl as any).setSinkId(deviceId);
    }
  }

  /**
   * Updates the sample rate used for subsequent flush cycles.
   * @param sampleRate The new sample rate in Hz.
   */
  public setSampleRate(sampleRate: number) {
    this.options.sampleRate = sampleRate;
  }

  /**
   * Replaces the onEnded callback. The callback is invoked with the
   * captured feed counter each time a scheduled audio buffer finishes
   * playing.
   *
   * The callback is captured into a local at the moment each buffer is
   * scheduled in {@link flush}, so reassigning it never retargets buffers
   * that are already in flight. New buffers scheduled after the call use
   * the new callback. This makes it safe to swap the handler mid-session
   * when reusing a single player across multiple logical owners.
   *
   * @param onEndedCallback The new onEnded callback, or null to clear it.
   */
  public setOnEnded(onEndedCallback: OnEndedCallback | null) {
    this.onEndedCallback = onEndedCallback;
  }

  /**
   * Mutes or unmutes the player. When muted, calls to feed() are ignored.
   * @param isMuted Whether the player should be muted.
   */
  public mute(isMuted: boolean) {
    this.muted = isMuted;
  }

  /**
   * Clears all buffered sample data and resets the feed counter.
   */
  public reset() {
    this.chunks = [];
    this.totalSamples = 0;
    this.feedCounter = 0;
  }

  /**
   * Releases all resources: clears buffers, cancels the flush timer,
   * disconnects audio nodes, closes the AudioContext, and tears down
   * the Audio element if present. Safe to call multiple times.
   */
  public destroy() {
    if (this.destroyed) {
      return;
    }
    this.destroyed = true;

    this.reset();

    if (this.touchUnlockAbort) {
      this.touchUnlockAbort.abort();
      this.touchUnlockAbort = null;
    }

    if (this.flushTimer !== null) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    if (this.audioEl) {
      this.audioEl.pause();
      if (
        typeof MediaStream !== 'undefined' &&
        this.audioEl.srcObject instanceof MediaStream
      ) {
        this.audioEl.srcObject.getTracks().forEach((track) => track.stop());
      }
      this.audioEl.srcObject = null;
      this.audioEl = null;
    }
    this.mediaStreamDest = null;

    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }

    if (this.audioCtx) {
      this.audioCtx.close();
      this.audioCtx = null;
    }

    this.startTimestampMs = 0;
    this.flushTimeSyncMs = 0;
  }

  /**
   * Concatenates buffered chunks, creates an AudioBuffer with fade-in/fade-out,
   * and schedules it for playback. Automatically reschedules itself with drift
   * correction relative to wall-clock time.
   */
  private flush() {
    if (this.destroyed || !this.audioCtx || !this.gainNode) {
      return;
    }

    this.flushTimeSyncMs += this.options.flushingTime;
    const elapsedMs = Date.now() - this.startTimestampMs;
    let delayMs = this.flushTimeSyncMs - elapsedMs;
    if (delayMs < 0 || delayMs > this.options.flushingTime * 2) {
      delayMs = this.options.flushingTime;
    }
    this.scheduleFlush(delayMs);

    if (this.totalSamples === 0) {
      return;
    }

    const samples = this.concatenateChunks();
    const capturedFeedCount = this.feedCounter;

    this.reset();

    const { channels, sampleRate } = this.options;
    const length = (samples.length / channels) | 0;
    const audioBuffer = this.audioCtx.createBuffer(
      channels,
      length,
      sampleRate
    );

    for (let ch = 0; ch < channels; ch++) {
      const channelData = audioBuffer.getChannelData(ch);
      this.fillChannelData(channelData, samples, ch, channels, length);
    }

    if (this.startTime < this.audioCtx.currentTime) {
      this.startTime = this.audioCtx.currentTime;
    }

    const source = this.audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.gainNode);
    source.start(this.startTime);

    const callback = this.onEndedCallback;
    source.onended = () => {
      source.disconnect();
      if (callback) {
        callback(capturedFeedCount);
      }
    };

    this.startTime += audioBuffer.duration;
  }

  /**
   * Merges all buffered chunks into a single Float32Array.
   * When only one chunk is present, returns it directly (zero-copy).
   */
  private concatenateChunks(): Float32Array {
    if (this.chunks.length === 1) {
      return this.chunks[0];
    }
    const result = new Float32Array(this.totalSamples);
    let offset = 0;
    for (let i = 0; i < this.chunks.length; i++) {
      result.set(this.chunks[i], offset);
      offset += this.chunks[i].length;
    }
    return result;
  }

  /**
   * Fills a single channel's audio data from the interleaved sample buffer,
   * applying fade-in at the start and fade-out at the end to prevent clicks.
   *
   * For buffers longer than 2 x FADE_SAMPLES the work is split into three
   * tight loops so the hot middle loop is completely branch-free.
   */
  private fillChannelData(
    audioData: Float32Array,
    samples: Float32Array,
    channel: number,
    channels: number,
    length: number
  ) {
    let offset = channel;

    const fadeOutStart = length - (FADE_SAMPLES + 1);

    if (fadeOutStart >= FADE_SAMPLES) {
      for (let i = 0; i < FADE_SAMPLES; i++) {
        audioData[i] = (samples[offset] * i) / FADE_SAMPLES;
        offset += channels;
      }

      for (let i = FADE_SAMPLES; i < fadeOutStart; i++) {
        audioData[i] = samples[offset];
        offset += channels;
      }

      let dec = FADE_SAMPLES;
      for (let i = fadeOutStart; i < length; i++) {
        audioData[i] = (samples[offset] * dec--) / FADE_SAMPLES;
        offset += channels;
      }
    } else {
      let dec = FADE_SAMPLES;
      for (let i = 0; i < length; i++) {
        audioData[i] = samples[offset];
        if (i < FADE_SAMPLES) {
          audioData[i] = (audioData[i] * i) / FADE_SAMPLES;
        }
        if (i >= length - (FADE_SAMPLES + 1)) {
          audioData[i] = (audioData[i] * dec--) / FADE_SAMPLES;
        }
        offset += channels;
      }
    }
  }

  /**
   * Converts raw PCM data to Float32Array.
   *
   * 32-bit float encoding (maxValue === 1) creates a typed view with zero
   * per-sample work. Other encodings multiply by a precomputed reciprocal.
   */
  private formatSamples(data: ArrayBufferView): Float32Array {
    const buffer = data.buffer as ArrayBuffer;

    if (this.maxValue === 1) {
      return new Float32Array(buffer, data.byteOffset, data.byteLength / 4);
    }

    const typedData = new this.typedArrayCtor(
      buffer,
      data.byteOffset,
      data.byteLength / this.typedArrayCtor.BYTES_PER_ELEMENT
    );
    const float32 = new Float32Array(typedData.length);
    const reciprocal = 1 / this.maxValue;
    for (let i = 0; i < typedData.length; i++) {
      float32[i] = typedData[i] * reciprocal;
    }
    return float32;
  }

  private isValidGain(gain: number): boolean {
    return isFinite(gain) && gain >= 0 && gain <= 2;
  }

  private isTypedArray(data: any): data is ArrayBufferView {
    return (
      data != null &&
      data.byteLength !== undefined &&
      data.buffer instanceof ArrayBuffer
    );
  }

  private scheduleFlush(delayMs: number) {
    this.flushTimer = setTimeout(() => this.flush(), delayMs);
  }

  private createAudioElement() {
    if (!this.audioCtx || !this.gainNode) {
      return;
    }

    this.mediaStreamDest = this.audioCtx.createMediaStreamDestination();
    this.gainNode.connect(this.mediaStreamDest);

    this.audioEl = new Audio();
    this.audioEl.srcObject = this.mediaStreamDest.stream;

    if (
      this.options.outputDeviceId &&
      typeof (this.audioEl as any).setSinkId === 'function'
    ) {
      (this.audioEl as any).setSinkId(this.options.outputDeviceId);
    }

    this.audioEl.play().catch(() => {
      // Autoplay may be blocked by browser policy
    });
  }

  private webAudioTouchUnlock(context: AudioContext): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (context.state !== 'suspended' || !('ontouchstart' in window)) {
        resolve(false);
        return;
      }

      const abort = new AbortController();
      this.touchUnlockAbort = abort;

      const cleanup = () => {
        document.body.removeEventListener('touchstart', unlock);
        document.body.removeEventListener('touchend', unlock);
        if (this.touchUnlockAbort === abort) {
          this.touchUnlockAbort = null;
        }
      };

      let didUnlock = false;
      const unlock = () => {
        if (didUnlock) {
          return;
        }
        didUnlock = true;
        context.resume().then(
          () => {
            cleanup();
            resolve(true);
          },
          (reason) => {
            cleanup();
            reject(reason);
          }
        );
      };

      abort.signal.addEventListener(
        'abort',
        () => {
          cleanup();
          resolve(false);
        },
        { once: true }
      );

      document.body.addEventListener('touchstart', unlock, false);
      document.body.addEventListener('touchend', unlock, false);
    });
  }
}

// Merge the namespace so types are accessible alongside the class export
// eslint-disable-next-line @typescript-eslint/no-namespace
namespace PCMPlayer {
  export type Options = PCMPlayerOptions;
  export type OnEndedCb = OnEndedCallback;
}

export = PCMPlayer;
