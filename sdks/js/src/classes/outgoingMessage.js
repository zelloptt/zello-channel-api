const Emitter = require('./emitter');
const Constants = require('./constants');
const Utils = require('./utils');

/**
 * @hideconstructor
 * @classdesc Outgoing audio message class. Instances are returned from <code>Session.startVoiceMessage</code> method
 **/
class OutgoingMessage extends Emitter {
  constructor(session, instanceOptions = {}, userCallback) {
    super();
    const library = Utils.getLoadedLibrary();
    this.options =
      Object.assign({
        autoStart: true,
        recorderSampleRate: 44100, // fallback for recorder with no getOriginalSampleRate method
        encoderFrameSize: 20,
        encoderSampleRate: 16000,
        encoderApplication: 2048,
        numberOfChannels: 1,
        log: session.log
      }, session.options, instanceOptions);
    this.userCallback = userCallback;
    this.instanceOptions = instanceOptions;

    if (this.options.recorder && !Utils.isFunction(this.options.recorder)) {
      this.options.recorder = library.Recorder;
    }

    if (this.options.encoder && !Utils.isFunction(this.options.encoder)) {
      this.options.encoder = library.Encoder;
    }

    this.session = session;
    this.currentMessageId = null;
    this.currentPacketId = 0;

    this.initEncoder();
    this.initRecorder();

    // start message explicitly if no recorder present.
    // if recorder is there it will start from Recorder.onready
    if (!this.recorder && this.options.autoStart) {
      this.start();
    }
  }

  initEncoder() {
    if (!this.options.encoder) {
      return;
    }
    this.options.encoder.prototype.ondata = (data) => {
      if (Array.isArray(data)) {
        data.forEach((frame) =>
          this.processEncodedData(frame)
        );
        return;
      }
      this.processEncodedData(data);
    };
    this.encoder = new this.options.encoder;
  }

  processEncodedData(data) {
    let packet = Utils.buildBinaryPacket(1, this.currentMessageId, ++this.currentPacketId, data);
    /**
     * Outgoing message packet encoded and ready to be sent to zello server. Session is following this event and sends data automatically
     *
     * @event OutgoingMessage#data_encoded
     * @param {Uint8Array} packet encoded opus packet with headers
     */
    this.emit(Constants.EVENT_DATA_ENCODED, packet);
  }

  initRecorder() {
    if (!this.options.recorder) {
      return;
    }

    this.options.recorder.prototype.ondata = (data) => {
      if (!this.encoder) {
        return;
      }
      /**
       * Outgoing message pcm data from recorder is ready to be encoded
       *
       * @event OutgoingMessage#data
       * @param {Float32Array} data pcm data portion
       */
      this.emit(Constants.EVENT_DATA, data);
      this.encoder.encode(data);
    };
    this.options.recorder.prototype.onready = () => {
      if (this.destroyed) {
        if (this.recorder) {
          // This is necessary to fix a race condition where
          // the recorder is stopped before it has started.
          // This appears to be a no-op in the recorder code,
          // which results in the recorder not actually stopping.
          // This is the first chance we have to stop the recorder.
          this.recorder.stop();
        }
        return;
      }
      this.sendEncoderInitMessage();
      if (this.options.autoStart) {
        this.start();
      }
    };
    this.recorder = new this.options.recorder(this.options, this.encoder);
    if (Utils.isFunction(this.recorder.init)) {
      this.recorder.init();
    }
  }

  sendEncoderInitMessage() {
    if (!this.encoder || !Utils.isFunction(this.encoder.postMessage)) {
      return;
    }
    let recorderSampleRate = this.options.recorderSampleRate;
    if (Utils.isFunction(this.recorder.getSampleRate)) {
      recorderSampleRate = this.recorder.getSampleRate();
    }
    this.encoder.postMessage(Object.assign({
      command: 'init',
      originalSampleRate: recorderSampleRate
    }, this.options));
  }

  startRecording() {
    if (this.recorder && this.recorder.start) {
      this.recorder.start();
    }
  }

  /**
   * Stops outgoing message
   *
   * @param {Function} userCallback user callback that is called when server <code>stop_stream</code> command is done
   * @returns {Promise} promise that resolves when server <code>stop_stream</code> command is done
   * @example
// callback
outgoingMessage.stop(function(err, result) {
  if (err) {
    console.trace(err);
    return;
  }
  console.warn('Message stopped');
});

// promise
outgoingMessage.then(function(result) {
  console.warn('Message stopped');
}).catch(function(err) {
  console.trace(err);
});
  */
  stop(userCallback) {
    this.destroy();
    return this.session.stopStream({
      stream_id: this.currentMessageId
    }, userCallback);
  }

  destroy() {
    this.destroyed = true;
    if (this.encoder && Utils.isFunction(this.encoder.destroy)) {
      this.encoder.destroy();
      this.encoder = null;
    }
    if (this.recorder && Utils.isFunction(this.recorder.stop)) {
      this.recorder.stop();
    }
    this.removeAllListeners();
  }

/**
 * Starts an outgoing message
 * if <code>options.autoStart</code> is <code>true</code> (default behaviour) then message is started automatically
 * when instance is created by <code>session.startVoiceMessage</code>
 * **/
  start() {
    const params = {
      'type': 'audio',
      'codec': 'opus',
      'codec_header': Utils.buildCodecHeader(this.options.encoderSampleRate, 1, this.options.encoderFrameSize),
      'packet_duration': this.options.encoderFrameSize
    };
    if (this.instanceOptions.for) {
      params.for = this.options.for;
    }
    if (this.instanceOptions.username) {
      params.username = this.options.username;
    }
    if (this.instanceOptions.talkPriority !== undefined) {
      params.talk_priority = this.options.talkPriority;
    }
    if (this.instanceOptions.retransmissionInterval !== undefined) {
      params.retransmissionInterval = this.instanceOptions.retransmissionInterval;
    }
    if (this.instanceOptions.retransmissionDuration !== undefined) {
      params.retransmissionDuration = this.instanceOptions.retransmissionDuration;
    }
    this.session
      .startStream(params, this.userCallback)
      .then((result) => {
        this.currentMessageId = result.stream_id;
        this.startRecording();
      })
      .catch(() => {
        this.destroy();
      });
  }

  static get talkPriorityLow() {
    return Constants.TALK_PRIORITY_VALUE_LOW;
  }

  static get talkPriorityNormal() {
    return Constants.TALK_PRIORITY_VALUE_NORMAL;
  }

}

module.exports = OutgoingMessage;
