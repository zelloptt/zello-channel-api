const Constants = require('./constants');
const PacedReplay = require('./pacedReplay');

/**
 * @implements Recorder
 * @classdesc A <code>Recorder</code> that sends Opus frames already in memory, one per frame interval, without
 * opening the microphone or running the encoder: the frames a message produced earlier (its
 * <code>data_encoded</code> packets without their 9-byte header, or whatever the app kept) go out again as a
 * new message. Give the message <code>encoder: false</code>, and an <code>encoderFrameSize</code> and
 * <code>encoderSampleRate</code> matching how the frames were encoded, since the stream advertises them.
 *
 * @example
var message = session.startVoiceMessage({
  channels: ['Baker Street 221B'],
  encoder: false,
  encoderFrameSize: 20,
  encoderSampleRate: 16000,
  recorder: new ZCC.OpusReplayRecorder(storedFrames, 20)   // Array<Uint8Array>, 20 ms each
});
message.on('replay_progress', function(sentMs, totalMs) { ... });
message.on('stopped', function(result) { ... });
 **/
class OpusReplayRecorder extends PacedReplay {
  /**
   * @param {Array<Uint8Array>} frames one Opus frame each, in order
   * @param {Number} [frameMs=20] the duration of each frame in milliseconds
   */
  constructor(frames, frameMs = PacedReplay.DEFAULT_FRAME_MS) {
    if (!Array.isArray(frames) || !frames.length || !frames.every((frame) => frame instanceof Uint8Array) ||
      typeof frameMs !== 'number' || !(frameMs > 0)) {
      throw new Error(Constants.ERROR_NOT_ENOUGH_PARAMS);
    }
    super(frameMs);
    this.frames = frames;
  }

  get frameCount() {
    return this.frames.length;
  }

  // Frames handed over so far.
  get position() {
    return this.frameIndex;
  }

  deliver(index) {
    this.onencoded(this.frames[index]);
  }
}

module.exports = OpusReplayRecorder;
