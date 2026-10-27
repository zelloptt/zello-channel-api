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
 * Picked automatically when <code>startVoiceMessage</code> is given a <code>replay</code> option:
 * @example
var message = session.startVoiceMessage({
  channels: ['Baker Street 221B', 'Reichenbach Falls'],
  replay: {
    samples: recordedPcm,   // Float32Array, mono, -1..1
    sampleRate: 48000       // the rate the samples were captured at
  }
});
message.on('replay_progress', function(sentMs, totalMs) { ... });
// the message stops itself once the last sample has gone out; the outcome
// arrives through the message's 'stopped' or 'stop_failed' event
message.on('stopped', function(result) { ... });
message.on('stop_failed', function(err) { ... });
 **/
class ReplayRecorder {
  /**
   * @param {object} options the outgoing message options; reads <code>options.replay.samples</code>,
   * <code>options.replay.sampleRate</code> and <code>options.encoderFrameSize</code>
   * @param {object} encoder the encoder to tell when the input is over
   */
  constructor(options, encoder) {
    const replay = options.replay || {};
    if (!(replay.samples instanceof Float32Array) || !replay.samples.length ||
      typeof replay.sampleRate !== 'number' || !(replay.sampleRate > 0)) {
      throw new Error(Constants.ERROR_NOT_ENOUGH_PARAMS);
    }
    this.samples = replay.samples;
    this.sampleRate = replay.sampleRate;
    this.frameMs = options.encoderFrameSize || DEFAULT_FRAME_MS;
    this.chunkSamples = Math.max(1, Math.round(this.sampleRate * this.frameMs / 1000));
    this.encoder = encoder;
    this.position = 0;
    this.chunksSent = 0;
    this.startedAt = 0;
    this.timer = null;
    this.state = 'inactive';
  }

  static isRecordingSupported() {
    return true;
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
      const chunk = this.samples.subarray(this.position, this.position + this.chunkSamples);
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
