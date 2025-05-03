const Emitter = require('./emitter');
const Constants = require('./constants');
const Utils = require('./utils');

/**
 * @hideconstructor
 * @classdesc Incoming audio message class. Instances are returned as arguments for corresponding <code>ZCC.Session</code> events
 **/
class IncomingMessage extends Emitter {

  static get PersistentPlayer() {
    return IncomingMessage.persistentPlayer;
  }

  static set PersistentPlayer(player) {
    IncomingMessage.persistentPlayer = player;
  }

  constructor(messageData, session) {
    super();
    this.streamId = messageData.stream_id;
    this.codecDetails = Utils.parseCodedHeader(messageData.codec_header);
    this.messageDidStart = false;
    this.messageStartTime = 0;
    this.packetCount = 0;
    this.isPlaybackComplete = false;
    let library = Utils.getLoadedLibrary();
    this.options =
      Object.assign({
        encoding: '32bitFloat',
        channels: 1,
        sampleRate: IncomingMessage.detectSampleRate(this.codecDetails.rate),
        flushingTime: 240,
        burstJitter: 1000
      },
      session.options,
      {messageData: messageData}
    );

    if (this.options.decoder && !Utils.isFunction(this.options.decoder)) {
      this.options.decoder = library.Decoder;
    }

    if (this.options.player && !Utils.isFunction(this.options.player)) {
      this.options.player = library.Player;
    }
    this.session = session;
    this.instanceId = messageData.stream_id.toString();
  }

  init() {
    return this.initPlayer().then(() => {
      this.initDecoder();
      this.initEventHandlers();
    });
  }


  // default decoder supports 8k, 12k, 16k, 24k and 48k
  // safari supports 24k and 48k only
  static detectSampleRate(codecSampleRate) {
    if (codecSampleRate <= 24000) {
      return 24000;
    }
    return 48000;
  }

  stopPlayback(isComplete) {
    this.session.log(`Stopping playback, isComplete: ${isComplete}`);

    this.isPlaybackComplete = !!isComplete;
    if (this.stopPlaybackTimer) {
      clearTimeout(this.stopPlaybackTimer);
    }
    /**
     * Incoming voice message stopped
     * @event IncomingMessage#incoming_voice_did_stop
     * @param {ZCC.IncomingMessage} incomingMessage incoming message instance (self)
     */
    this.emit(Constants.EVENT_INCOMING_VOICE_DID_STOP, this);
    if (this.decoder && Utils.isFunction(this.decoder.destroy)) {
      this.decoder.destroy();
      this.decoder = undefined;
    }
    if (this.player && Utils.isFunction(this.player.destroy) && !IncomingMessage.PersistentPlayer) {
      this.session.log(`Destroying player`);
      this.player.mute(true);
      this.player.destroy();
      this.player = undefined;
    } else if (!isComplete && this.player && Utils.isFunction(this.player.reset)) {
      this.session.log(`Resetting player`);
      this.player.reset();
    }
    this.session.off([Constants.EVENT_INCOMING_VOICE_DATA, this.instanceId], this.incomingVoiceHandler);
    this.session.off([Constants.EVENT_INCOMING_VOICE_DID_STOP, this.instanceId], this.incomingVoiceDidStopHandler);
    this.session.onIncomingVoicePlaybackStopped(this);
  }

  initEventHandlers() {
    this.decodedAudioHandler = (pcmData) => {
      if (this.player && Utils.isFunction(this.player.feed)) {
        this.player.feed(pcmData);
      }
    };

    this.incomingVoiceDidStopHandler = () => {
      const elapsed = Date.now() - this.messageStartTime;
      const frameDuration = this.codecDetails.framesPerPacket * this.codecDetails.frameSize;
      const playbackDuration = frameDuration > 0 ? this.packetCount * frameDuration : this.packetCount * 20;

      if (elapsed + this.options.burstJitter < playbackDuration) {
        this.session.log(`Incoming message ended early, waiting another ${playbackDuration - elapsed}ms`);
        this.stopPlaybackTimer = setTimeout(() => {
          this.stopPlayback(true);
        }, playbackDuration - elapsed);
      } else {
        this.stopPlayback(true);
      }
    };

    this.incomingVoiceHandler = (parsedAudioPacket) => {
      if (!this.messageDidStart) {
        this.messageDidStart = true;
        this.messageStartTime = Date.now();
        /**
         * Incoming voice message started
         * @event IncomingMessage#incoming_voice_did_start
         * @param {ZCC.IncomingMessage} incomingMessage incoming message instance (self)
         */
        this.emit(Constants.EVENT_INCOMING_VOICE_DID_START, this);
        this.session.onIncomingVoiceDidStart(this);
      }

      this.packetCount++;

      /**
       * Incoming voice message packet (with encoded audio)
       * @event IncomingMessage#incoming_voice_data
       * @param {Object} incomingVoicePacket voice message packet object
       * @property {Uint8Array} messageData encoded (opus) data
       * @property {Number} messageId incoming message id
       * @property {Number} packetId incoming packet id
       */
      this.emit(Constants.EVENT_INCOMING_VOICE_DATA, parsedAudioPacket);
      if (this.decoder) {
        this.decode(parsedAudioPacket);
      }
    };

    this.session.on(
      [Constants.EVENT_INCOMING_VOICE_DATA, this.instanceId],
      this.incomingVoiceHandler
    );
    this.session.on(
      [Constants.EVENT_INCOMING_VOICE_DID_STOP, this.instanceId],
      this.incomingVoiceDidStopHandler
    );
    this.on(
      [Constants.EVENT_INCOMING_VOICE_DATA_DECODED, this.instanceId],
      this.decodedAudioHandler
    );
  }

  decode(parsedAudioPacket) {
    this.decoder.decode(parsedAudioPacket.messageData);
  }

  initDecoder() {
    if (!this.options.decoder) {
      return;
    }
    this.decoder = new this.options.decoder(this.options);
    this.decoder.ondata = (pcmData) => {
      if (!pcmData) {
        return;
      }
      /**
       * Incoming voice message packet decoded
       * @event IncomingMessage#incoming_voice_data_decoded
       * @param {Float32Array} pcmData decoded pcm packet
       */
      this.emit(Constants.EVENT_INCOMING_VOICE_DATA_DECODED, pcmData);
      this.session.onIncomingVoiceDecoded(pcmData, this);
    }
  }

  initPlayer() {
    return new Promise((resolve, reject) => {
      if (IncomingMessage.PersistentPlayer && !this.options.noPersistentPlayer) {
        this.player = IncomingMessage.PersistentPlayer;
        this.player.setSampleRate(this.options.sampleRate);
      } else if (this.options.player) {
        this.player = new this.options.player(this.options);
        if (!this.options.noPersistentPlayer) {
          IncomingMessage.PersistentPlayer = this.player;
        }

        if (Utils.isFunction(this.player.init)) {
          const ret = this.player.init();

          if (Utils.isPromise(ret)) {
            // If the player has an asynchronous init() method - wait here until it's resolved
            ret.then(() => resolve()).catch((err) => {
              if (!this.options.noPersistentPlayer && IncomingMessage.PersistentPlayer) {
                IncomingMessage.PersistentPlayer = undefined;
                delete IncomingMessage.PersistentPlayer;
              }
              if (this.options.player && this.player) {
                this.player = undefined;
                delete this.player;
              }
              reject('Player init failed' + (err ? ': ' + err.toString() : ''));
            });
            return;
          }
        }
      }
      resolve();
    });
  }
}


module.exports = IncomingMessage;