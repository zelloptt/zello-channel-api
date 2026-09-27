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

type OnEndedCallback = (feedCounter: number, streamId: string) => void;

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

/**
 * Gestures that can carry user activation. A touch `pointerdown` does not,
 * so the listeners stay armed until one of them actually starts the context.
 */
const RESUME_GESTURE_EVENTS = ['pointerdown', 'pointerup', 'click', 'touchend', 'keydown'] as const;

/** Track used by callers that never pass a stream id. */
const DEFAULT_STREAM = '';

/**
 * Playback state of one incoming stream. Every track schedules its buffers
 * on the shared GainNode, so streams that overlap in time are mixed by Web
 * Audio instead of being appended to one timeline.
 */
interface Track {
  chunks: Float32Array[];
  totalSamples: number;
  feedCounter: number;
  /** Where this track's next buffer starts on the context timeline. */
  startTime: number;
  sampleRate: number;
  muted: boolean;
  /** Set by {@link PCMPlayer.endStream}: release the track once it has drained. */
  ending: boolean;
  /** Scheduled sources that have not fired `onended` yet, so reset can stop them. */
  sources: Set<AudioBufferSourceNode>;
}

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

  /**
   * One track per incoming stream, keyed by stream id. Callers that never
   * pass a stream id share the default track, which keeps the single-stream
   * behaviour of earlier versions.
   */
  private tracks: Map<string, Track> = new Map();

  private audioCtx: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private audioEl: HTMLAudioElement | null = null;
  private mediaStreamDest: MediaStreamAudioDestinationNode | null = null;

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

  private resumeOnGesture: (() => void) | null = null;

  /**
   * The resume() the flush timer has in flight. A refused resume() can stay
   * pending in Chrome, so the timer must not stack one per tick.
   */
  private pendingResume: Promise<void> | null = null;

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
   * Note: Browsers create the AudioContext suspended when the page has had
   * no user gesture yet. This method installs gesture listeners that resume
   * the context on the first gesture the browser accepts, and {@link flush}
   * holds samples until then. Apps can also call {@link resume} from their
   * own gesture handlers so playback does not depend on which DOM event
   * reaches the listeners first.
   */
  public async init(): Promise<void> {
    if (this.destroyed) {
      return;
    }

    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    this.audioCtx = new AudioCtx();
    // Armed before any await so a tap during the touch unlock also counts.
    this.installResumeOnGesture();

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

    for (const track of this.tracks.values()) {
      track.startTime = this.audioCtx.currentTime;
    }
    this.startTimestampMs = Date.now();
    this.flushTimeSyncMs = this.options.flushingTime;
    this.scheduleFlush(this.flushTimeSyncMs);
  }

  /**
   * Buffers PCM sample data for playback. Data is accumulated in chunks and
   * flushed to the audio output on the next flush cycle. Each stream id has
   * its own buffer and timeline, so two streams fed at the same time play
   * mixed rather than one after the other.
   * @param data Raw PCM samples as a typed array.
   * @param streamId Stream the samples belong to. Omit for single-stream use.
   */
  public feed(data: Float32Array | ArrayBufferView, streamId: string = DEFAULT_STREAM) {
    if (this.muted || this.destroyed) {
      return;
    }
    if (!this.isTypedArray(data)) {
      return;
    }
    const track = this.track(streamId);
    if (track.muted) {
      return;
    }

    const formatted = this.formatSamples(data);
    track.chunks.push(formatted);
    track.totalSamples += formatted.length;
    track.feedCounter++;
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
   * Updates the sample rate used for subsequent flush cycles. With a stream
   * id only that stream's track changes, so a second stream at another rate
   * does not retime samples the first stream already buffered. Without one,
   * the default track and the rate given to new tracks change.
   * @param sampleRate The new sample rate in Hz.
   * @param streamId Stream to change. Omit for single-stream use.
   */
  public setSampleRate(sampleRate: number, streamId?: string) {
    if (streamId === undefined) {
      this.options.sampleRate = sampleRate;
    }
    this.track(streamId ?? DEFAULT_STREAM).sampleRate = sampleRate;
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
   * Updates the flush cadence in milliseconds. Cancels any pending flush
   * timer and reschedules one at the new cadence, re-anchoring the
   * drift-correction clock so the next flush fires one new-cadence tick
   * from now rather than catching up or stalling at the old rate.
   *
   * If called before {@link init} has finished (including while init is
   * awaiting the first user gesture via {@link webAudioTouchUnlock}),
   * only the option is updated and the first flush scheduled by init()
   * uses the new value. Non-positive or non-finite values are ignored.
   *
   * @param flushingTime The new flush cadence in milliseconds.
   */
  public setFlushingTime(flushingTime: number) {
    if (this.destroyed) {
      return;
    }
    if (!Number.isFinite(flushingTime) || flushingTime <= 0) {
      return;
    }
    this.options.flushingTime = flushingTime;
    if (!this.gainNode) {
      // `audioCtx` alone is not a reliable "initialized" signal because
      // init() sets it early (before `await webAudioTouchUnlock`). Gate
      // on `gainNode`, which init() only sets after the unlock resolves,
      // so a call during the await does not schedule a flush that init()
      // will later duplicate without clearing.
      return;
    }
    const elapsedMs = Date.now() - this.startTimestampMs;
    this.flushTimeSyncMs = elapsedMs + flushingTime;
    this.clearFlushTimer();
    this.scheduleFlush(flushingTime);
  }

  /**
   * Resumes the AudioContext if the browser left it suspended and plays any
   * samples held in the meantime. Call it from the app's own user gesture
   * handler (a button press, a tap) so the browser's autoplay policy lets
   * the context start. A no-op when the context is already running, before
   * {@link init}, or after {@link destroy}.
   */
  public resume(): Promise<void> {
    if (this.destroyed || !this.audioCtx || this.audioCtx.state !== 'suspended') {
      return Promise.resolve();
    }
    return this.audioCtx.resume().then(() => this.onContextResumed());
  }

  /**
   * Mutes or unmutes the player. When muted, calls to feed() are ignored.
   * With a stream id only that stream is affected, which lets an app keep
   * one stream audible while dropping another that plays at the same time.
   * @param isMuted Whether to mute.
   * @param streamId Stream to mute. Omit to mute every stream.
   */
  public mute(isMuted: boolean, streamId?: string) {
    if (streamId === undefined) {
      this.muted = isMuted;
      return;
    }
    this.track(streamId).muted = isMuted;
  }

  /**
   * Marks a stream as finished. Samples it already buffered still play; the
   * track is released once they have. Streams that stop early should call
   * {@link reset} with their id instead.
   * @param streamId Stream that has ended.
   */
  public endStream(streamId: string) {
    const track = this.tracks.get(streamId);
    if (!track) {
      return;
    }
    track.ending = true;
    this.releaseIfDrained(streamId, track);
  }

  /**
   * Clears all buffered sample data and resets the feed counter. Also
   * stops any BufferSourceNodes that were scheduled on the audio timeline
   * but have not yet finished playing, cancelling both actively-playing
   * audio and audio queued to play in the future. Each source's
   * `onended` handler is cleared before `stop()` so no stale
   * {@link OnEndedCallback} fires against the caller after reset. If
   * `audioCtx` is present, `reset()` immediately re-anchors
   * {@link startTime} to `audioCtx.currentTime`.
   *
   * This makes `reset()` a true "cancel playback and start fresh"
   * operation for consumers that reuse a single player across multiple
   * logical owners.
   * @param streamId Stream to cancel. Omit to cancel every stream.
   */
  public reset(streamId?: string) {
    if (streamId !== undefined) {
      this.resetTrack(streamId);
      return;
    }
    // Deleting the current entry while iterating a Map is well defined.
    for (const id of this.tracks.keys()) {
      this.resetTrack(id);
    }
  }

  /** Stops a track's scheduled audio, drops its samples, and forgets it. */
  private resetTrack(streamId: string) {
    const track = this.tracks.get(streamId);
    if (!track) {
      return;
    }
    this.clearTrackBuffers(track);
    for (const source of track.sources) {
      source.onended = null;
      try {
        source.stop();
      } catch {
        // stop() throws InvalidStateError if the source never started.
        // All tracked sources were started via source.start() in flush(),
        // so this is defensive.
      }
      source.disconnect();
    }
    track.sources.clear();
    this.tracks.delete(streamId);
  }

  private clearTrackBuffers(track: Track) {
    track.chunks = [];
    track.totalSamples = 0;
    track.feedCounter = 0;
  }

  /** The track for a stream, created on first use. */
  private track(streamId: string): Track {
    let track = this.tracks.get(streamId);
    if (!track) {
      track = {
        chunks: [],
        totalSamples: 0,
        feedCounter: 0,
        startTime: this.audioCtx ? this.audioCtx.currentTime : 0,
        sampleRate: this.options.sampleRate,
        muted: false,
        ending: false,
        sources: new Set()
      };
      this.tracks.set(streamId, track);
    }
    return track;
  }

  private releaseIfDrained(streamId: string, track: Track) {
    if (track.ending && track.totalSamples === 0 && track.sources.size === 0) {
      this.tracks.delete(streamId);
    }
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
    this.removeResumeOnGesture();
    this.clearFlushTimer();

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
   * For every track, concatenates buffered chunks, creates an AudioBuffer
   * with fade-in/fade-out, and schedules it on that track's timeline.
   * Automatically reschedules itself with drift correction relative to
   * wall-clock time.
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

    // A suspended context keeps currentTime frozen. Scheduling into that
    // timeline plays only after the context resumes, which can be long
    // after the message arrived. Hold the samples, keep asking, and keep the
    // gesture listeners armed so the next tap can unlock the context.
    if (this.audioCtx.state === 'suspended') {
      if (!this.pendingResume) {
        this.pendingResume = this.audioCtx.resume().then(
          () => {
            this.pendingResume = null;
            this.onContextResumed();
          },
          () => {
            this.pendingResume = null;
          }
        );
      }
      return;
    }

    for (const [streamId, track] of this.tracks) {
      if (track.totalSamples === 0) {
        this.releaseIfDrained(streamId, track);
        continue;
      }
      this.scheduleTrack(streamId, track);
    }
  }

  /**
   * Schedules one track's buffered samples as the next buffer on its own
   * timeline. Every track connects to the shared GainNode, so buffers from
   * different tracks that overlap in time are summed by Web Audio.
   */
  private scheduleTrack(streamId: string, track: Track) {
    if (!this.audioCtx || !this.gainNode) {
      return;
    }
    const samples = this.concatenateChunks(track);
    const capturedFeedCount = track.feedCounter;
    this.clearTrackBuffers(track);

    const { channels } = this.options;
    const length = (samples.length / channels) | 0;
    const audioBuffer = this.audioCtx.createBuffer(
      channels,
      length,
      track.sampleRate
    );

    for (let ch = 0; ch < channels; ch++) {
      const channelData = audioBuffer.getChannelData(ch);
      this.fillChannelData(channelData, samples, ch, channels, length);
    }

    if (track.startTime < this.audioCtx.currentTime) {
      track.startTime = this.audioCtx.currentTime;
    }

    const source = this.audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.gainNode);
    source.start(track.startTime);

    track.sources.add(source);

    const callback = this.onEndedCallback;
    source.onended = () => {
      track.sources.delete(source);
      source.disconnect();
      if (callback) {
        callback(capturedFeedCount, streamId);
      }
      this.releaseIfDrained(streamId, track);
    };

    track.startTime += audioBuffer.duration;
  }

  /**
   * Merges a track's buffered chunks into a single Float32Array.
   * When only one chunk is present, returns it directly (zero-copy).
   */
  private concatenateChunks(track: Track): Float32Array {
    if (track.chunks.length === 1) {
      return track.chunks[0];
    }
    const result = new Float32Array(track.totalSamples);
    let offset = 0;
    for (let i = 0; i < track.chunks.length; i++) {
      result.set(track.chunks[i], offset);
      offset += track.chunks[i].length;
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

  private clearFlushTimer(): void {
    if (this.flushTimer !== null) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
  }

  /**
   * Plays samples held while the context was suspended. Runs after any
   * resume() the browser accepted, whether it came from a gesture listener,
   * a flush retry, or {@link resume}.
   */
  private onContextResumed(): void {
    if (this.destroyed || !this.audioCtx || this.audioCtx.state === 'suspended') {
      return;
    }
    if (!this.gainNode) {
      // init() has not finished; its first flush plays whatever was fed.
      return;
    }
    this.clearFlushTimer();
    this.flush();
  }

  /**
   * Arms capture-phase gesture listeners on the document that resume a
   * suspended context. They stay armed for the player's lifetime: the browser
   * may refuse the attempt from a touch `pointerdown` and accept the one from
   * the `pointerup` or `click` of the same tap, and a context the browser
   * suspends later needs the next gesture too. Capture phase so an app
   * handler that stops propagation cannot hide the gesture.
   */
  private installResumeOnGesture(): void {
    if (!this.audioCtx || this.resumeOnGesture || typeof document === 'undefined') {
      return;
    }
    const resume = () => {
      if (this.destroyed || !this.audioCtx) {
        this.removeResumeOnGesture();
        return;
      }
      if (this.audioCtx.state !== 'suspended') {
        return;
      }
      this.audioCtx.resume().then(
        () => this.onContextResumed(),
        () => undefined
      );
    };
    this.resumeOnGesture = resume;
    for (const type of RESUME_GESTURE_EVENTS) {
      document.addEventListener(type, resume, true);
    }
  }

  private removeResumeOnGesture(): void {
    const resume = this.resumeOnGesture;
    this.resumeOnGesture = null;
    if (!resume || typeof document === 'undefined') {
      return;
    }
    for (const type of RESUME_GESTURE_EVENTS) {
      document.removeEventListener(type, resume, true);
    }
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

      // No latch: a touchstart carries no user activation, so the browser
      // can refuse its resume() and accept the one from the touchend of the
      // same tap. Every touch event retries until one is accepted.
      const unlock = () => {
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
  export const resumeGestureEvents = RESUME_GESTURE_EVENTS;
}

export = PCMPlayer;
