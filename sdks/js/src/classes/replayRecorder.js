const Constants = require('./constants');

// Default frame size when the message gives none: the encoder's own default.
const DEFAULT_FRAME_MS = 20;

/**
 * @implements Recorder
 * @classdesc A <code>Recorder</code> that plays back PCM already in memory instead of opening the microphone,
 * at the pace it was captured, so a recorded announcement can be sent through <code>Session.startVoiceMessage</code>
 * like a live one. The server drops a stream whose packets arrive much faster than real time, so the samples are
 * handed to the encoder one frame per frame interval.
 *
 * Hand an instance to <code>startVoiceMessage</code> as its recorder:
 * @example
var message = session.startVoiceMessage({
  channels: ['Baker Street 221B', 'Reichenbach Falls'],
  recorder: new ZCC.ReplayRecorder(
    recordedPcm,   // Float32Array, mono, -1..1
    48000          // the rate the samples were captured at
  )
});
message.on('replay_progress', function(sentMs, totalMs) { ... });
// the message stops itself once the last sample has gone out; the outcome
// arrives through the message's 'stopped' or 'stop_failed' event
message.on('stopped', function(result) { ... });
message.on('stop_failed', function(err) { ... });
 **/
class ReplayRecorder {
  /**
   * @param {Float32Array} samples mono PCM in the -1..1 range
   * @param {Number} sampleRate the rate the samples were captured at
   */
  constructor(samples, sampleRate) {
    if (!(samples instanceof Float32Array) || !samples.length ||
      typeof sampleRate !== 'number' || !(sampleRate > 0)) {
      throw new Error(Constants.ERROR_NOT_ENOUGH_PARAMS);
    }
    this.samples = samples;
    this.sampleRate = sampleRate;
    this.encoder = null;
    this.setFrameMs(DEFAULT_FRAME_MS);
    this.position = 0;
    this.chunksSent = 0;
    this.startedAt = 0;
    this.timer = null;
    this.state = 'inactive';
  }

  static isRecordingSupported() {
    return true;
  }

  /**
   * Called by the outgoing message before <code>init()</code> with its options and encoder:
   * the frames go out at the message's frame size, and the encoder is told when the audio is over.
   * @param {object} options the outgoing message options
   * @param {object} encoder the message's encoder
   */
  attach(options, encoder) {
    this.setFrameMs(options.encoderFrameSize || DEFAULT_FRAME_MS);
    this.encoder = encoder;
  }

  setFrameMs(frameMs) {
    this.frameMs = frameMs;
    this.chunkSamples = Math.max(1, Math.round(this.sampleRate * this.frameMs / 1000));
  }

  init() {
    this.state = 'ready';
    return Promise.resolve().then(() => {
      if (this.state === 'ready') {
        this.onready();
      }
    });
  }

  getSampleRate() {
    return this.sampleRate;
  }

  /**
   * Total length of the audio in milliseconds.
   * @return {Number}
   */
  get durationMs() {
    return this.samples.length / this.sampleRate * 1000;
  }

  start() {
    if (this.state !== 'ready') {
      return;
    }
    this.state = 'replaying';
    this.startedAt = Date.now();
    this.chunksSent = 0;
    this.tick();
  }

  tick() {
    this.timer = null;
    if (this.state !== 'replaying') {
      return;
    }
    // Every frame whose slot has passed goes out now, so a late timer never
    // stretches the message; the server tolerates short bursts.
    const due = Math.floor((Date.now() - this.startedAt) / this.frameMs) + 1;
    while (this.chunksSent < due && this.position < this.samples.length) {
      // A copy, not a view: posting a view to the encoder worker would clone the
      // whole recording's buffer with every chunk.
      const chunk = this.samples.slice(this.position, this.position + this.chunkSamples);
      this.position += chunk.length;
      this.chunksSent++;
      this.ondata([chunk]);
    }
    this.onprogress(this.position / this.sampleRate * 1000, this.durationMs);
    if (this.position >= this.samples.length) {
      this.finish();
      return;
    }
    const nextAt = this.startedAt + this.chunksSent * this.frameMs;
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
   * @method ReplayRecorder#ondata
   * @param {Array<Float32Array>} buffers one buffer per channel
   */
  ondata(buffers) {}

  onready() {}

  /**
   * Fired as the audio goes out.
   * @method ReplayRecorder#onprogress
   * @param {Number} sentMs milliseconds handed to the encoder so far
   * @param {Number} totalMs total length
   */
  onprogress(sentMs, totalMs) {}

  /**
   * Fired once the last sample has been handed to the encoder.
   * @method ReplayRecorder#onend
   */
  onend() {}
}

module.exports = ReplayRecorder;
