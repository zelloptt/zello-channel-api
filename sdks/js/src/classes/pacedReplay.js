// Default frame interval when the message gives none: the encoder's own default.
const DEFAULT_FRAME_MS = 20;

/**
 * Hands a bounded, pre-captured source to an outgoing message one frame per frame interval, so the server sees
 * real-time pacing (it drops a stream whose packets arrive much faster than that). This class owns the clock;
 * a subclass says how many frames there are and delivers one, either as PCM through <code>ondata</code> or
 * already encoded through <code>onencoded</code>.
 *
 * Implements the <code>Recorder</code> interface, so an instance is handed to <code>startVoiceMessage</code>
 * as its <code>recorder</code>.
 *
 * @abstract
 */
class PacedReplay {
  constructor(frameMs) {
    this.frameMs = frameMs || DEFAULT_FRAME_MS;
    this.encoder = null;
    this.frameIndex = 0;
    this.framesSent = 0;
    this.startedAt = 0;
    this.timer = null;
    this.state = 'inactive';
  }

  static isRecordingSupported() {
    return true;
  }

  /**
   * How many frames the source holds.
   * @abstract
   * @return {Number}
   */
  get frameCount() {
    return 0;
  }

  /**
   * Hands frame <code>index</code> to the message, through <code>ondata</code> or <code>onencoded</code>.
   * @abstract
   * @param {Number} index
   */
  deliver(index) {} // eslint-disable-line no-unused-vars

  /**
   * Total length of the audio in milliseconds.
   * @return {Number}
   */
  get durationMs() {
    return this.frameCount * this.frameMs;
  }

  // Milliseconds handed over so far.
  get sentMs() {
    return this.frameIndex * this.frameMs;
  }

  /**
   * Called by the outgoing message before <code>init()</code> with its options and encoder:
   * the encoder, if any, is told when the audio is over.
   * @param {object} options the outgoing message options
   * @param {object} encoder the message's encoder, or null when the message has none
   */
  attach(options, encoder) {
    this.encoder = encoder;
  }

  init() {
    this.state = 'ready';
    return Promise.resolve().then(() => {
      if (this.state === 'ready') {
        this.onready();
      }
    });
  }

  start() {
    if (this.state !== 'ready') {
      return;
    }
    this.state = 'replaying';
    this.startedAt = Date.now();
    this.framesSent = 0;
    this.tick();
  }

  tick() {
    this.timer = null;
    if (this.state !== 'replaying') {
      return;
    }
    // Every frame whose slot has passed goes out now, so a late timer never
    // stretches the message; the server tolerates short bursts. A listener
    // may stop the replay from inside deliver or onprogress, so the state is
    // checked again after each.
    const due = Math.floor((Date.now() - this.startedAt) / this.frameMs) + 1;
    while (this.framesSent < due && this.frameIndex < this.frameCount) {
      this.deliver(this.frameIndex);
      this.frameIndex++;
      this.framesSent++;
      if (this.state !== 'replaying') {
        return;
      }
    }
    this.onprogress(this.sentMs, this.durationMs);
    if (this.state !== 'replaying') {
      return;
    }
    if (this.frameIndex >= this.frameCount) {
      this.finish();
      return;
    }
    const nextAt = this.startedAt + this.framesSent * this.frameMs;
    this.timer = setTimeout(() => this.tick(), Math.max(0, nextAt - Date.now()));
  }

  finish() {
    this.stop();
    this.onend();
  }

  stop() {
    if (this.state === 'inactive') {
      return;
    }
    this.state = 'inactive';
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.encoder && typeof this.encoder.postMessage === 'function') {
      this.encoder.postMessage({command: 'done'});
    }
  }

  setRecordingGain() {}

  setMonitorGain() {}

  /**
   * Emit a PCM portion for the outgoing message to encode.
   * @method PacedReplay#ondata
   * @param {Array<Float32Array>} buffers one buffer per channel
   */
  ondata(buffers) {} // eslint-disable-line no-unused-vars

  /**
   * Emit a frame that is already encoded, for the outgoing message to send as is.
   * @method PacedReplay#onencoded
   * @param {Uint8Array} frame one Opus frame
   */
  onencoded(frame) {} // eslint-disable-line no-unused-vars

  onready() {}

  /**
   * Fired as the audio goes out.
   * @method PacedReplay#onprogress
   * @param {Number} sentMs milliseconds handed over so far
   * @param {Number} totalMs total length
   */
  onprogress(sentMs, totalMs) {} // eslint-disable-line no-unused-vars

  /**
   * Fired once the last frame has been handed over.
   * @method PacedReplay#onend
   */
  onend() {}
}

PacedReplay.DEFAULT_FRAME_MS = DEFAULT_FRAME_MS;

module.exports = PacedReplay;
