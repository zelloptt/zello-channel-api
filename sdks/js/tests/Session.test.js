const Session = require('../src/classes/session');
const OutgoingMessage = require('../src/classes/outgoingMessage');
const OutgoingImage = require('../src/classes/outgoingImage');
const IncomingMessage = require('../src/classes/incomingMessage');
const IncomingImage = require('../src/classes/incomingImage');
const Constants = require('../src/classes/constants');

const codecHeader = 'gD4BPA==';

const credentials = {
  serverUrl: 'wss://zellowork.io/ws/example',
  username: 'kiosk',
  password: 'secret',
  version: 'test'
};

const bareSession = (options) => {
  const session = Object.create(Session.prototype);
  session.options = options;
  session.seq = 0;
  session.version = 'test';
  session.log = () => {};
  session.emit = () => {};
  session.wasOnline = false;
  session.channelConfigurationError = false;
  session.sent = [];
  session.sendCommand = (params) => {
    session.sent.push(params);
  };
  session.sendCommandWithCallback = (command, params) => {
    session.sent.push(Object.assign({ command: command }, params));
  };
  return session;
};

describe('Session channels', () => {
  beforeEach(() => {
    window.ZCC = {
      Sdk: {
        initOptions: {}
      }
    };
  });

  it('still requires a channel when channels is omitted', () => {
    expect(() => {
      Session.validateInitialOptions(credentials);
    }).toThrow(Constants.ERROR_NOT_ENOUGH_PARAMS);
  });

  it('fills channels with the single channel', () => {
    const session = new Session(Object.assign({ channel: 'Front' }, credentials));
    expect(session.options.channel).toBe('Front');
    expect(session.options.channels).toEqual(['Front']);
  });

  it('keeps a caller-supplied list and copies it', () => {
    const names = ['Front', 'Back'];
    const session = new Session(Object.assign({
      channels: names
    }, credentials));
    names.push('Side');
    expect(session.options.channel).toBeUndefined();
    expect(session.options.channels).toEqual(['Front', 'Back']);
  });

  it('accepts a default that is in the list', () => {
    const session = new Session(Object.assign({
      channels: ['Front', 'Back'],
      channel: 'Back'
    }, credentials));
    expect(session.options.channel).toBe('Back');
    expect(session.options.channels).toEqual(['Front', 'Back']);
  });

  it('rejects a default that is not in the list', () => {
    expect(() => {
      Session.prepareChannels({
        channels: ['Front', 'Back'],
        channel: 'Side'
      });
    }).toThrow(Constants.ERROR_CHANNEL_NOT_IN_LIST);
  });

  it('rejects an empty channels list', () => {
    expect(() => {
      Session.prepareChannels({
        channels: []
      });
    }).toThrow(Constants.ERROR_NOT_ENOUGH_PARAMS);
  });

  it('logs on with the channels list', () => {
    const names = ['Front', 'Back'];
    const session = bareSession({
      channels: names,
      channel: 'Back'
    });
    session.doLogon();
    expect(session.sent[0].channels).toEqual(['Front', 'Back']);
    expect(session.sent[0].channel).toBeUndefined();
    names.push('Side');
    expect(session.sent[0].channels).toEqual(['Front', 'Back']);
  });

  it('logs on with one channel when only channel was provided', () => {
    const session = bareSession({
      channel: 'Front',
      channels: ['Front']
    });
    session.doLogon();
    expect(session.sent[0].channels).toEqual(['Front']);
    expect(session.sent[0].channel).toBeUndefined();
  });

  it('does not treat one offline channel as a session failure when several are joined', () => {
    const session = bareSession({
      channels: ['Front', 'Back'],
      channel: 'Back'
    });
    session.jsonDataHandler({
      command: 'on_channel_status',
      status: 'offline',
      error: 'not found',
      error_type: 'configuration',
      channel: 'Front'
    });
    expect(session.channelConfigurationError).toBe(false);
  });

  it('still records a configuration failure for a single channel', () => {
    const session = bareSession({
      channel: 'Front',
      channels: ['Front']
    });
    session.jsonDataHandler({
      command: 'on_channel_status',
      status: 'offline',
      error: 'not found',
      error_type: 'configuration',
      channel: 'Front'
    });
    expect(session.channelConfigurationError).toBe(true);
  });

  it('prefers an explicit channel and otherwise uses the default', () => {
    const session = bareSession({
      channels: ['Front', 'Back'],
      channel: 'Back'
    });
    const text = { text: 'help' };
    session.sendTextMessage(text);
    expect(text.channel).toBeUndefined();
    expect(text.command).toBeUndefined();
    expect(session.sent[0].channel).toBe('Back');
    expect(session.sent[0].text).toBe('help');

    session.sendTextMessage({ text: 'help', channel: 'Front' });
    expect(session.sent[1].channel).toBe('Front');

    session.sendLocation({ lat: 1 });
    expect(session.sent[2].channel).toBe('Back');

    session.endDispatchCall(42);
    expect(session.sent[3].channel).toBe('Back');
    expect(session.sent[3].call_id).toBe(42);

    session.startStream({ for: 'sam' });
    expect(session.sent[4].channel).toBe('Back');
    expect(session.sent[4].for).toBe('sam');
  });

  it('fails a send when no channel was passed and there is no default', () => {
    const session = bareSession({
      channels: ['Front', 'Back']
    });
    expect(() => {
      session.sendTextMessage({ text: 'help' });
    }).toThrow(Constants.ERROR_NOT_ENOUGH_PARAMS);
    expect(() => {
      session.endDispatchCall(42);
    }).toThrow(Constants.ERROR_NOT_ENOUGH_PARAMS);
  });
});

describe('OutgoingMessage channel routing', () => {
  const startMessage = (sessionOptions = {}, instanceOptions = {}) => {
    const message = Object.create(OutgoingMessage.prototype);
    message.options = Object.assign({
      encoderSampleRate: 16000,
      encoderFrameSize: 60
    }, sessionOptions, instanceOptions);
    message.instanceOptions = instanceOptions;
    message.userCallback = null;
    message.startRecording = () => {};
    message.destroy = () => {};
    message.currentMessageId = 9;
    message.session = {
      options: sessionOptions,
      resolveChannel: Session.prototype.resolveChannel,
      startStream: jest.fn(() => Promise.resolve({ stream_id: 9 })),
      stopStream: jest.fn()
    };
    return message;
  };

  it('uses the live default channel and keeps it for stop', async () => {
    const message = startMessage({
      channels: ['Front', 'Back'],
      channel: 'Back'
    });
    await message.start();
    expect(message.session.startStream.mock.calls[0][0].channel).toBe('Back');
    message.session.options.channel = 'Front';
    message.stop();
    expect(message.session.stopStream.mock.calls[0][0].channel).toBe('Back');
  });

  it('prefers the channel passed to the voice message', async () => {
    const message = startMessage({
      channels: ['Front', 'Back'],
      channel: 'Back'
    }, {
      channel: 'Front'
    });
    await message.start();
    expect(message.session.startStream.mock.calls[0][0].channel).toBe('Front');
  });

  it('fails to start when neither channel is set', async () => {
    const message = startMessage({
      channels: ['Front', 'Back']
    });
    await expect(message.start()).rejects.toThrow(Constants.ERROR_NOT_ENOUGH_PARAMS);
    expect(message.session.startStream).not.toHaveBeenCalled();
  });
});

describe('OutgoingImage channel routing', () => {
  const sendImage = (sessionOptions, callOptions = {}) => {
    const image = Object.create(OutgoingImage.prototype);
    image.callOptions = callOptions;
    image.options = Object.assign({}, sessionOptions, callOptions);
    image.thumbnailData = new Uint8Array([1]);
    image.fullImageData = new Uint8Array([2]);
    image.fullImageWidth = 1;
    image.fullImageHeight = 1;
    image.source = 'library';
    image.sent = null;
    image.session = {
      options: sessionOptions,
      resolveChannel: Session.prototype.resolveChannel,
      getSeq: () => 1,
      sendCommand: (params) => {
        image.sent = params;
      }
    };
    image.send();
    return image;
  };

  it('prefers the image channel and otherwise uses the session default', () => {
    const explicit = sendImage({
      channels: ['Front', 'Back'],
      channel: 'Back'
    }, {
      channel: 'Front'
    });
    expect(explicit.sent.channel).toBe('Front');

    const fallback = sendImage({
      channels: ['Front', 'Back'],
      channel: 'Back'
    });
    expect(fallback.sent.channel).toBe('Back');
  });

  it('fails when the image has no channel and the session has no default', () => {
    expect(() => {
      sendImage({
        channels: ['Front', 'Back']
      });
    }).toThrow(Constants.ERROR_NOT_ENOUGH_PARAMS);
  });
});

describe('Incoming channel identity', () => {
  it('keeps the Zello channel name off the playback channel count', () => {
    const message = new IncomingMessage({
      stream_id: 4,
      channel: 'Back',
      codec_header: codecHeader
    }, {
      log: () => {},
      options: {
        channels: ['Front', 'Back'],
        channel: 'Back'
      }
    });
    expect(message.channel).toBe('Back');
    expect(message.options.channels).toBe(1);

    let received = null;
    message.options.log = () => {};
    message.options.player = function Player() {};
    message.options.decoder = function Decoder(options) {
      received = options;
    };
    message.initDecoder();
    expect(received.channels).toBe(1);
    expect(received.log).toBeUndefined();
    expect(received.player).toBeUndefined();
    expect(received.decoder).toBeUndefined();
  });

  it('sets the shared player flush interval from the message', async () => {
    const setFlushingTime = jest.fn();
    const setSampleRate = jest.fn();
    IncomingMessage.PersistentPlayer = {
      setSampleRate: setSampleRate,
      setFlushingTime: setFlushingTime
    };
    const message = new IncomingMessage({
      stream_id: 5,
      channel: 'Back',
      codec_header: codecHeader
    }, {
      log: () => {},
      options: {
        channels: ['Front', 'Back'],
        channel: 'Back'
      }
    });
    await message.initPlayer();
    expect(setSampleRate).toHaveBeenCalledWith(24000);
    expect(setFlushingTime).toHaveBeenCalledWith(240);
    IncomingMessage.PersistentPlayer = undefined;
  });

  it('exposes the channel on an incoming image', () => {
    const image = new IncomingImage({
      message_id: 3,
      channel: 'Back'
    }, {
      options: {},
      on: () => {}
    });
    expect(image.channel).toBe('Back');
  });
});
