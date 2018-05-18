const Emitter = require('component-emitter');
const Constants = require('./constants');
const Utils = require('./utils');

class IncomingMessage extends Emitter {
  constructor(params, session) {
    super();
    this.messageDidStart = false;
    this.options =
      Object.assign({
        incomingMessageDecoder: () => {
          let library = Utils.getLoadedLibrary();
          return new library.Decoder({
            channels: 1,
            fallback: true
          });
        },
        incomingMessagePlayer: (decoder) => {
          const sampleRate = decoder.getSampleRate();
          let library = Utils.getLoadedLibrary();
          return new library.Player({
            encoding: '32bitFloat',
            channels: 1,
            sampleRate: sampleRate,
            flushingTime: 100
          });
        }
      },
      session.options,
      {messageData: params}
    );

    this.initDecoder();
    this.initPlayer();

    this.session = session;
    this.session.on(Constants.EVENT_INCOMING_VOICE_DATA, (parsedAudioPacket) => {
      if (!this.messageDidStart) {
        this.messageDidStart = true;
        this.emit(Constants.EVENT_INCOMING_VOICE_DID_START, parsedAudioPacket);
        this.session.emit(Constants.EVENT_INCOMING_VOICE_DID_START, this);
      }
      this.emit(Constants.EVENT_INCOMING_VOICE_DATA, parsedAudioPacket);
      this.decode(parsedAudioPacket);
    });

    this.session.on(Constants.EVENT_INCOMING_VOICE_DID_STOP, () => {
      this.emit(Constants.EVENT_INCOMING_VOICE_DID_STOP, this);
    });

    this.on(Constants.EVENT_INCOMING_VOICE_DATA_DECODED, (pcmData) => {
      this.player.feed(pcmData);
    });
  }

  decode(parsedAudioPacket) {
    this.decoder.decode(parsedAudioPacket.messageData);
  }

  initDecoder() {
    if (typeof this.options.incomingMessageDecoder !== 'function') {
      throw new Error(Constants.ERROR_INVALID_DECODER);
    }
    this.decoder = this.options.incomingMessageDecoder();
    if (
      this.decoder === undefined ||
      typeof this.decoder.decode !== 'function' ||
      typeof this.decoder.getSampleRate !== 'function' ||
      typeof this.decoder.on !== 'function'
    ) {
      throw new Error(Constants.ERROR_INVALID_DECODER);
    }
    this.decoder.on('decode', (pcmData) => {
      this.emit(Constants.EVENT_INCOMING_VOICE_DATA_DECODED, pcmData);
    });
  }

  initPlayer() {
    if (typeof this.options.incomingMessagePlayer !== 'function') {
      throw new Error(Constants.ERROR_INVALID_PLAYER);
    }
    this.player = this.options.incomingMessagePlayer(this.decoder);
    if (
      this.player === undefined ||
      typeof this.player.feed !== 'function'
    ) {
      throw new Error(Constants.ERROR_INVALID_PLAYER);
    }
  }
}


module.exports = IncomingMessage;