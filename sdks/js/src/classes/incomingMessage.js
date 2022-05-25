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
    let library = Utils.getLoadedLibrary();
    this.options =
      Object.assign({
        encoding: '32bitFloat',
        channels: 1,
        sampleRate: IncomingMessage.detectSampleRate(this.codecDetails.rate),
        flushingTime: 240,
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

  initEventHandlers() {
    this.decodedAudioHandler = (pcmData) => {
      if (this.player && Utils.isFunction(this.player.feed)) {
        this.player.feed(pcmData);
      }
    };

    this.incomingVoiceDidStopHandler = () => {
      /**
       * Incoming voice message stopped
       * @event IncomingMessage#incoming_voice_did_stop
       * @param {ZCC.IncomingMessage} incomingMessage incoming message instance (self)
       */
      this.emit(Constants.EVENT_INCOMING_VOICE_DID_STOP, this);
      if (this.player && Utils.isFunction(this.player.destroy) && !IncomingMessage.PersistentPlayer) {
        this.player.destroy();
      }
      if (this.decoder && Utils.isFunction(this.decoder.destroy)) {
        this.decoder.destroy();
      }
      this.session.off([Constants.EVENT_INCOMING_VOICE_DATA, this.instanceId], this.incomingVoiceHandler);
      this.session.off([Constants.EVENT_INCOMING_VOICE_DID_STOP, this.instanceId], this.incomingVoiceDidStopHandler);
    };

    this.incomingVoiceHandler = (parsedAudioPacket) => {
      if (!this.messageDidStart) {
        this.messageDidStart = true;
        /**
         * Incoming voice message started
         * @event IncomingMessage#incoming_voice_did_start
         * @param {ZCC.IncomingMessage} incomingMessage incoming message instance (self)
         */
        this.emit(Constants.EVENT_INCOMING_VOICE_DID_START, this);
        this.session.onIncomingVoiceDidStart(this);
      }

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
              reject(err);
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