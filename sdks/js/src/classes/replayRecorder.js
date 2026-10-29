const Constants = require('./constants');
const PacedReplay = require('./pacedReplay');

/**
 * @implements Recorder
 * @classdesc A <code>Recorder</code> that plays back PCM already in memory instead of opening the microphone,
 * at the pace it was captured, so a recorded announcement can be sent through <code>Session.startVoiceMessage</code>
 * like a live one. The samples are handed to the message's encoder one frame per frame interval.
 * For audio that is already Opus, see <code>OpusReplayRecorder</code>.
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
class ReplayRecorder extends PacedReplay {
  /**
   * @param {Float32Array} samples mono PCM in the -1..1 range
   * @param {Number} sampleRate the rate the samples were captured at
   */
  constructor(samples, sampleRate) {
    if (!(samples instanceof Float32Array) || !samples.length ||
      typeof sampleRate !== 'number' || !(sampleRate > 0)) {
      throw new Error(Constants.ERROR_NOT_ENOUGH_PARAMS);
    }
    super();
    this.samples = samples;
    this.sampleRate = sampleRate;
    this.setFrameMs(PacedReplay.DEFAULT_FRAME_MS);
  }

  /**
   * Called by the outgoing message before <code>init()</code> with its options and encoder:
   * the frames go out at the message's frame size, and the encoder is told when the audio is over.
   * @param {object} options the outgoing message options
   * @param {object} encoder the message's encoder
   */
  attach(options, encoder) {
    super.attach(options, encoder);
    this.setFrameMs(options.encoderFrameSize || PacedReplay.DEFAULT_FRAME_MS);
  }

  setFrameMs(frameMs) {
    this.frameMs = frameMs;
    this.chunkSamples = Math.max(1, Math.round(this.sampleRate * this.frameMs / 1000));
  }

  getSampleRate() {
    return this.sampleRate;
  }

  get frameCount() {
    return Math.ceil(this.samples.length / this.chunkSamples);
  }

  // Samples handed over so far.
  get position() {
    return Math.min(this.frameIndex * this.chunkSamples, this.samples.length);
  }

  get durationMs() {
    return this.samples.length / this.sampleRate * 1000;
  }

  get sentMs() {
    return this.position / this.sampleRate * 1000;
  }

  deliver(index) {
    // A copy, not a view: posting a view to the encoder worker would clone the
    // whole recording's buffer with every chunk.
    const chunk = this.samples.slice(index * this.chunkSamples, (index + 1) * this.chunkSamples);
    this.ondata([chunk]);
  }
}

module.exports = ReplayRecorder;
