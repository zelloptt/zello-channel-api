const Emitter = require('./emitter');
const Constants = require('./constants');
const Utils = require('./utils');

// A recorder handed over ready-made rather than as a constructor.
function isRecorderInstance(recorder) {
  return typeof recorder === 'object' && Utils.isFunction(recorder.start) && Utils.isFunction(recorder.stop);
}

// How much encoded audio to hold back while the server is still answering
// start_stream, so the first words of a message are not lost.
const MAX_PENDING_MS = 5000;
// How long stop() waits for the encoder to hand over its final frames before
// closing the streams anyway.
const ENCODER_DONE_TIMEOUT_MS = 1000;

/**
 * @hideconstructor
 * @classdesc Outgoing audio message class. Instances are returned from <code>Session.startVoiceMessage</code> method.
 *
 * A message goes to one channel (<code>options.channel</code>, or the session default) or to several at once
 * (<code>options.channels</code>): one stream is opened per channel and every encoded frame is sent to each of
 * them. Channels that refuse the stream are reported through <code>stream_failed</code> and left out; the message
 * fails only when none accepts.
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

    // The recorder option is a constructor, a ready-made instance (such as a
    // ReplayRecorder holding audio to send), or a flag for the microphone recorder.
    if (this.options.recorder && !Utils.isFunction(this.options.recorder) && !isRecorderInstance(this.options.recorder)) {
      this.options.recorder = library.Recorder;
    }

    if (this.options.encoder && !Utils.isFunction(this.options.encoder)) {
      this.options.encoder = library.Encoder;
    }

    this.session = session;
    // The first accepted stream, for callers that expect a single id.
    this.currentMessageId = null;
    /**
     * @deprecated Packet counters live on <code>streams</code>; this mirrors the first stream's.
     */
    this.currentPacketId = 0;
    // Set once the server has accepted the stream and the beforeRecording hook has settled.
    this.recordingAllowed = false;
    // Set when recorder.init() fails; start() then rejects with it.
    this.recorderError = null;
    // One entry per channel that accepted the stream: {channel, streamId, packetId, ended}.
    this.streams = [];
    // True from the moment the streams are open until they are closed; frames
    // keep flowing while stop() drains the encoder.
    this.started = false;
    this.stopping = false;
    this.stopRequested = false;
    this.pendingFrames = [];
    this.maxPendingFrames = Math.ceil(MAX_PENDING_MS / this.options.encoderFrameSize);

    this.initEncoder();
    this.initRecorder();

    // start message explicitly if no recorder present.
    // if recorder is there it will start from Recorder.onready
    if (!this.recorder && this.options.autoStart) {
      this.start().catch(() => {});
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
    if (!this.started) {
      if (this.pendingFrames.length < this.maxPendingFrames) {
        this.pendingFrames.push(data);
      }
      return;
    }
    this.sendFrame(data);
  }

  // Sends one encoded frame to every open stream, each under its own stream
  // and packet ids.
  sendFrame(data) {
    this.streams.forEach((stream) => {
      if (stream.ended) {
        return;
      }
      stream.packetId++;
      if (stream.streamId === this.currentMessageId) {
        this.currentPacketId = stream.packetId;
      }
      /**
       * Outgoing message packet encoded and ready to be sent to zello server. Session is following this event and sends data automatically
       *
       * @event OutgoingMessage#data_encoded
       * @param {Uint8Array} packet encoded opus packet with headers
       */
      this.emit(Constants.EVENT_DATA_ENCODED, Utils.buildBinaryPacket(1, stream.streamId, stream.packetId, data));
    });
  }

  /**
   * The channels this message is addressed to: <code>options.channels</code>, else the single channel resolved
   * from <code>options.channel</code> and the session default.
   *
   * @return {Array<String>}
   */
  resolveChannels() {
    const channels = this.instanceOptions.channels;
    if (channels === undefined) {
      return [this.session.resolveChannel(this.instanceOptions.channel)];
    }
    if (!Array.isArray(channels) || channels.length === 0 ||
      !channels.every((channel) => typeof channel === 'string' && channel.length > 0)) {
      throw new Error(Constants.ERROR_NOT_ENOUGH_PARAMS);
    }
    const unique = channels.filter((channel, index) => channels.indexOf(channel) === index);
    const joined = this.session.options.channels;
    if (Array.isArray(joined) && unique.some((channel) => joined.indexOf(channel) === -1)) {
      throw new Error(Constants.ERROR_CHANNEL_NOT_IN_LIST);
    }
    return unique;
  }

  /**
   * Marks a stream the server closed on its own (another user took the channel, the channel went offline).
   * No more packets go to it; the other streams carry on. Called by the session on <code>on_stream_stop</code>.
   *
   * @param {Number} streamId
   * @return {String|undefined} the channel the stream was on
   */
  streamEnded(streamId) {
    const stream = this.streams.find((item) => item.streamId === streamId);
    if (!stream || stream.ended) {
      return undefined;
    }
    stream.ended = true;
    /**
     * The server ended one of this message's streams while the message was still going
     * @event OutgoingMessage#stream_ended
     * @param {String} channel channel name
     * @param {Number} streamId stream id
     */
    this.emit(Constants.EVENT_STREAM_ENDED, stream.channel, streamId);
    return stream.channel;
  }

  initRecorder() {
    if (!this.options.recorder) {
      return;
    }

    if (Utils.isFunction(this.options.recorder)) {
      this.recorder = new this.options.recorder(this.options, this.encoder);
    } else {
      this.recorder = this.options.recorder;
      if (Utils.isFunction(this.recorder.attach)) {
        this.recorder.attach(this.options, this.encoder);
      }
    }

    this.recorder.ondata = (data) => {
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
    // A recorder that runs out of input (a replay) ends the message itself;
    // the outcome reaches the caller through the stopped / stop_failed events.
    // A recorder that already has encoded frames hands them over as they are.
    this.recorder.onencoded = (frame) => this.processEncodedData(frame);
    this.recorder.onend = () => {
      if (!this.destroyed && this.started) {
        this.stop().catch(() => {});
      }
    };
    this.recorder.onprogress = (sentMs, totalMs) => {
      /**
       * A replayed message's progress
       * @event OutgoingMessage#replay_progress
       * @param {Number} sentMs milliseconds handed to the encoder so far
       * @param {Number} totalMs total length of the audio
       */
      this.emit(Constants.EVENT_REPLAY_PROGRESS, sentMs, totalMs);
    };
    this.recorder.onready = () => {
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
        this.start().catch(() => {});
      } else if (this.recordingAllowed) {
        // start() was called, and the server accepted the stream, before the
        // recorder finished initializing. Begin recording now that it is ready.
        this.startRecording();
      }
    };
    if (Utils.isFunction(this.recorder.init)) {
      const ready = this.recorder.init();
      // A recorder that fails to start (no microphone, a missing input device)
      // never calls onready, so report the failure instead of waiting forever.
      if (ready && Utils.isFunction(ready.catch)) {
        ready.catch((err) => {
          if (this.destroyed || (err && err.code === 'RecorderTornDown')) {
            return;
          }
          this.recorderError = err;
          if (!this.startPromise) {
            // Nothing started yet. Fail now; a later start() rejects with the same error.
            this.fail(err, this.userCallback).catch(() => {});
          } else if (this.recordingAllowed) {
            // start() already succeeded, but nothing can be recorded: close the streams.
            this.stop().catch(() => {});
          }
          // Otherwise start() is still waiting on the server or beforeRecording,
          // and rejects with this error once they are done.
        });
      }
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
    const initOptions = Object.assign({}, this.options);
    // The worker takes encoder settings; the pipeline objects stay here (a
    // recorder instance may hold a whole recording).
    delete initOptions.recorder;
    delete initOptions.encoder;
    this.encoder.postMessage(Object.assign({
      command: 'init',
      originalSampleRate: recorderSampleRate
    }, initOptions));
  }

  startRecording() {
    if (this.destroyed) {
      return;
    }
    if (this.recorder && this.recorder.start) {
      this.recorder.start();
    }
  }

  /**
   * Stops outgoing message: hands the encoder's final frames to every open stream, then closes each one.
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
    if (this.stopping) {
      return this.stopPromise;
    }
    if (!this.started) {
      // The server has not answered start_stream yet; the streams it opens
      // are closed as soon as it does.
      if (!this.startPromise) {
        try {
          this.resolveChannels();
        } catch (err) {
          return this.fail(err, userCallback);
        }
      }
      this.stopRequested = true;
      this.stopping = true;
      this.destroy();
      const whenStarted = this.startPromise ? this.startPromise.catch(() => null) : Promise.resolve(null);
      this.stopPromise = whenStarted.then((started) => {
        if (!started) {
          const result = {stream_id: this.currentMessageId, streams: {}};
          if (Utils.isFunction(userCallback)) {
            userCallback(null, result);
          }
          return result;
        }
        return this.stopStreams(userCallback);
      });
      this.stopPromise.finally(() => this.removeAllListeners()).catch(() => {});
      return this.stopPromise;
    }
    this.stopping = true;
    this.stopPromise = this.finishEncoding().then(() => {
      this.destroy();
      return this.stopStreams(userCallback);
    });
    this.stopPromise.finally(() => this.removeAllListeners()).catch(() => {});
    return this.stopPromise;
  }

  // Resolves once the encoder has emitted the frames for the audio already
  // recorded, or after a bound, so stop_stream does not cut off the ending.
  finishEncoding() {
    const encoder = this.encoder;
    if (this.recorder && Utils.isFunction(this.recorder.stop)) {
      // Stops the microphone and tells the encoder the input is over.
      this.recorder.stop();
    }
    if (!encoder || !Utils.isFunction(encoder.once)) {
      return Promise.resolve();
    }
    // started stays true meanwhile, so the frames the encoder still emits
    // reach the streams before they are closed.
    return new Promise((resolve) => {
      let settled = false;
      const done = () => {
        if (!settled) {
          settled = true;
          resolve();
        }
      };
      encoder.once(Constants.EVENT_ENCODER_DONE, done);
      setTimeout(done, ENCODER_DONE_TIMEOUT_MS);
    });
  }

  stopStreams(userCallback) {
    const open = this.streams.filter((stream) => !stream.ended);
    const results = {};
    return Promise.all(open.map((stream) =>
      this.session.stopStream({stream_id: stream.streamId, channel: stream.channel})
        .then(() => {
          results[stream.channel] = {stream_id: stream.streamId};
        })
        .catch((err) => {
          results[stream.channel] = {stream_id: stream.streamId, error: err};
        })
    )).then(() => {
      this.started = false;
      const result = {stream_id: this.currentMessageId, streams: results};
      const failed = open.filter((stream) => results[stream.channel].error !== undefined);
      if (open.length && failed.length === open.length) {
        const err = results[failed[0].channel].error;
        if (Utils.isFunction(userCallback)) {
          userCallback(err);
        }
        /**
         * Closing the streams failed on every channel
         * @event OutgoingMessage#stop_failed
         * @param {*} err the server's error
         */
        this.emit(Constants.EVENT_STOP_FAILED, err);
        throw err;
      }
      if (Utils.isFunction(userCallback)) {
        userCallback(null, result);
      }
      /**
       * The message's streams are closed; also fires when the message stopped itself
       * @event OutgoingMessage#stopped
       * @param {Object} result <code>{stream_id, streams}</code>, per channel <code>{stream_id}</code> or <code>{stream_id, error}</code>
       */
      this.emit(Constants.EVENT_STOPPED, result);
      return result;
    });
  }

  fail(err, userErrorCallback) {
    this.destroy();
    if (Utils.isFunction(userErrorCallback)) {
      userErrorCallback(err);
    }
    return Promise.reject(err);
  }

  destroy() {
    this.destroyed = true;
    if (this.recorder && Utils.isFunction(this.recorder.stop)) {
      this.recorder.stop();
    }
    if (this.encoder && Utils.isFunction(this.encoder.destroy)) {
      this.encoder.destroy();
      this.encoder = null;
    }
    this.pendingFrames = [];
  }

/**
 * Starts an outgoing message
 * if <code>options.autoStart</code> is <code>true</code> (default behaviour) then message is started automatically
 * when instance is created by <code>session.startVoiceMessage</code>
 *
 * Opens one stream per channel. Resolves with <code>{stream_id, streams}</code>: the first accepted stream id,
 * and per channel either <code>{stream_id}</code> or <code>{error}</code>. Rejects only when no channel accepted.
 * **/
  start() {
    if (this.startPromise) {
      return this.startPromise;
    }
    if (this.recorderError) {
      // The start callback already heard about it from initRecorder.
      return Promise.reject(this.recorderError);
    }
    let channels;
    try {
      channels = this.resolveChannels();
    } catch (err) {
      return this.fail(err, this.userCallback);
    }
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
    if (this.instanceOptions.callId !== undefined) {
      params.call_id = this.instanceOptions.callId;
    }
    if (this.instanceOptions.broadcast) {
      params.broadcast = true;
    }
    if (this.instanceOptions.retransmissionInterval !== undefined) {
      params.retransmissionInterval = this.instanceOptions.retransmissionInterval;
    }
    if (this.instanceOptions.retransmissionDuration !== undefined) {
      params.retransmissionDuration = this.instanceOptions.retransmissionDuration;
    }
    const results = {};
    const streams = channels.map((channel) =>
      this.session.startStream(Object.assign({}, params, {channel: channel}))
        .then((result) => {
          results[channel] = {stream_id: result.stream_id};
          this.streams.push({channel: channel, streamId: result.stream_id, packetId: 0, ended: false});
          /**
           * A channel accepted the stream
           * @event OutgoingMessage#stream_started
           * @param {String} channel channel name
           * @param {Number} streamId stream id
           */
          this.emit(Constants.EVENT_STREAM_STARTED, channel, result.stream_id);
        })
        .catch((err) => {
          results[channel] = {error: err};
          /**
           * A channel refused the stream; the message carries on to the others
           * @event OutgoingMessage#stream_failed
           * @param {String} channel channel name
           * @param {*} err the server's error
           */
          this.emit(Constants.EVENT_STREAM_FAILED, channel, err);
        })
    );
    this.startPromise = Promise.all(streams).then(() => {
      if (!this.streams.length) {
        throw results[channels[0]].error;
      }
      // Streams are answered in any order; keep the caller's channel order.
      this.streams.sort((a, b) => channels.indexOf(a.channel) - channels.indexOf(b.channel));
      this.activeChannel = this.streams[0].channel;
      this.currentMessageId = this.streams[0].streamId;
      this.started = true;
      this.pendingFrames.splice(0).forEach((frame) => this.sendFrame(frame));
      const result = {stream_id: this.currentMessageId, streams: results};
      if (this.stopRequested) {
        return result;
      }
      return this.waitBeforeRecording(result).then(() => {
        if (this.stopRequested) {
          return result;
        }
        if (this.recorderError) {
          // The recorder failed while the server was answering: close what it opened.
          const err = this.recorderError;
          return this.stopStreams().then(() => { throw err; }, () => { throw err; });
        }
        this.recordingAllowed = true;
        this.startRecording();
        if (Utils.isFunction(this.userCallback)) {
          this.userCallback(null, result);
        }
        return result;
      });
    });
    this.startPromise.catch((err) => {
      this.destroy();
      if (Utils.isFunction(this.userCallback)) {
        this.userCallback(err);
      }
    });
    return this.startPromise;
  }

  /**
   * Runs the <code>beforeRecording</code> option, if any, once the server has accepted
   * the stream. Recording waits for the promise it returns, so an app can play a
   * ready-to-send sound without recording it.
   */
  waitBeforeRecording(result) {
    const hook = this.options.beforeRecording;
    if (!Utils.isFunction(hook)) {
      return Promise.resolve();
    }
    return new Promise((resolve) => resolve(hook(result))).then(
      () => {},
      (err) => {
        // A hook that fails, such as a sound that cannot play, must not keep the user from talking.
        if (Utils.isFunction(this.options.log)) {
          this.options.log(`beforeRecording failed, recording anyway: ${err}`);
        }
      }
    );
  }

  static get talkPriorityLow() {
    return Constants.TALK_PRIORITY_VALUE_LOW;
  }

  static get talkPriorityNormal() {
    return Constants.TALK_PRIORITY_VALUE_NORMAL;
  }

}

module.exports = OutgoingMessage;
