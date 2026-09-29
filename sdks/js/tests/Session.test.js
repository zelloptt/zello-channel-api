const Session = require('../src/classes/session');
const Emitter = require('../src/classes/emitter');
const OutgoingMessage = require('../src/classes/outgoingMessage');
const OutgoingImage = require('../src/classes/outgoingImage');
const IncomingMessage = require('../src/classes/incomingMessage');
const IncomingImage = require('../src/classes/incomingImage');
const Constants = require('../src/classes/constants');
const Utils = require('../src/classes/utils');

// A binary frame as the server sends it: 9-byte header plus one payload byte.
const binaryFrame = (type, messageId, packetId, byte) =>
  Utils.buildBinaryPacket(type, messageId, packetId, new Uint8Array([byte])).buffer;

const codecHeader = 'gD4BPA==';

const credentials = {
  serverUrl: 'wss://zellowork.io/ws/example',
  username: 'kiosk',
  password: 'secret',
  version: 'test'
};

// What Sdk.init leaves behind for the session and incoming messages.
const setSdk = (extra = {}) => {
  window.ZCC = Object.assign({ Sdk: { initOptions: {} } }, extra);
};

// A session that records what it would send instead of using a socket.
const bareSession = (options) => {
  const session = Object.create(Session.prototype);
  session.options = options;
  session.seq = 0;
  session.version = 'test';
  session.log = () => {};
  session.emit = () => {};
  session.wasOnline = false;
  session.channelConfigurationError = false;
  session.channelConfigurationErrors = new Set();
  session.sent = [];
  session.sendCommand = (params) => {
    session.sent.push(params);
  };
  session.sendCommandWithCallback = (command, params) => {
    session.sent.push(Object.assign({ command: command }, params));
  };
  return session;
};

beforeEach(() => {
  setSdk();
});

afterEach(() => {
  delete window.ZCC;
  IncomingMessage.PersistentPlayer = undefined;
});

describe('Session channels', () => {
  it('still requires a channel when channels is omitted', () => {
    expect(() => new Session(credentials)).toThrow(Constants.ERROR_NOT_ENOUGH_PARAMS);
  });

  it('fills channels with the single channel', () => {
    const session = new Session(Object.assign({ channel: 'Front' }, credentials));
    expect(session.options.channel).toBe('Front');
    expect(session.options.channels).toEqual(['Front']);
  });

  it('keeps a copy of the caller list, with an optional default from it', () => {
    const names = ['Front', 'Back'];
    const noDefault = new Session(Object.assign({ channels: names }, credentials));
    names.push('Side');
    expect(noDefault.options.channel).toBeUndefined();
    expect(noDefault.options.channels).toEqual(['Front', 'Back']);

    const withDefault = new Session(Object.assign({
      channels: ['Front', 'Back'],
      channel: 'Back'
    }, credentials));
    expect(withDefault.options.channel).toBe('Back');
  });

  it('rejects a default that is not in the list', () => {
    expect(() => {
      Session.prepareChannels({
        channels: ['Front', 'Back'],
        channel: 'Side'
      });
    }).toThrow(Constants.ERROR_CHANNEL_NOT_IN_LIST);
  });

  it('rejects a default that is not a channel name, and an empty list', () => {
    for (const channel of [2, '']) {
      expect(() => {
        Session.prepareChannels({ channels: ['Front', 'Back'], channel: channel });
      }).toThrow(Constants.ERROR_NOT_ENOUGH_PARAMS);
    }
    expect(() => {
      Session.prepareChannels({ channels: [] });
    }).toThrow(Constants.ERROR_NOT_ENOUGH_PARAMS);
  });

  it('logs on with the channels list', () => {
    const session = bareSession({
      channels: ['Front', 'Back'],
      channel: 'Back'
    });
    session.doLogon();
    expect(session.sent[0].channels).toEqual(['Front', 'Back']);
    expect(session.sent[0].channel).toBeUndefined();
  });

  it('records a configuration failure only once every joined channel has one', () => {
    const status = (channel) => ({
      command: 'on_channel_status',
      status: 'offline',
      error: 'not found',
      error_type: 'configuration',
      channel: channel
    });

    const single = bareSession({ channel: 'Front', channels: ['Front'] });
    single.jsonDataHandler(status('Front'));
    expect(single.channelConfigurationError).toBe(true);

    const several = bareSession({ channels: ['Front', 'Back'], channel: 'Back' });
    several.jsonDataHandler(status('Side'));
    several.jsonDataHandler(status('Front'));
    expect(several.channelConfigurationError).toBe(false);
    several.jsonDataHandler(status('Back'));
    expect(several.channelConfigurationError).toBe(true);
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

    session.endDispatchCall(42);
    expect(session.sent[2].channel).toBe('Back');
    expect(session.sent[2].call_id).toBe(42);
  });

  it('ends a dispatch call on the channel the caller names', () => {
    const session = bareSession({
      channels: ['Front', 'Back'],
      channel: 'Back'
    });
    session.endDispatchCall(42, 'Front');
    expect(session.sent[0].channel).toBe('Front');
    expect(session.sent[0].call_id).toBe(42);
  });

  it('fails a send when no channel was passed and there is no default', async () => {
    const session = bareSession({
      channels: ['Front', 'Back']
    });
    const onText = jest.fn();
    await expect(session.sendTextMessage({ text: 'help' }, onText)).rejects.toThrow(Constants.ERROR_NOT_ENOUGH_PARAMS);
    expect(onText).toHaveBeenCalledWith(expect.any(Error));
    expect(session.sent).toEqual([]);

    const onEnd = jest.fn();
    await expect(session.endDispatchCall(42, onEnd)).rejects.toThrow(Constants.ERROR_NOT_ENOUGH_PARAMS);
    expect(onEnd).toHaveBeenCalledWith(expect.any(Error));
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
    message.session = Object.assign(bareSession(sessionOptions), {
      startStream: jest.fn(() => Promise.resolve({ stream_id: 9 })),
      stopStream: jest.fn()
    });
    return message;
  };

  it('resolves the session default when it starts and keeps it for stop', async () => {
    const message = startMessage({
      channels: ['Front', 'Back'],
      channel: 'Back'
    });
    // The default changed after the message was created but before it started.
    message.session.options.channel = 'Front';
    await message.start();
    expect(message.session.startStream.mock.calls[0][0].channel).toBe('Front');

    message.session.options.channel = 'Back';
    message.stop();
    expect(message.session.stopStream.mock.calls[0][0].channel).toBe('Front');
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

  it('reports a missing channel to the callback for start and stop', async () => {
    const message = startMessage({
      channels: ['Front', 'Back']
    });
    const onStart = jest.fn();
    message.userCallback = onStart;
    await expect(message.start()).rejects.toThrow(Constants.ERROR_NOT_ENOUGH_PARAMS);
    expect(onStart).toHaveBeenCalledWith(expect.any(Error));
    expect(message.session.startStream).not.toHaveBeenCalled();

    const onStop = jest.fn();
    await expect(message.stop(onStop)).rejects.toThrow(Constants.ERROR_NOT_ENOUGH_PARAMS);
    expect(onStop).toHaveBeenCalledWith(expect.any(Error));
    expect(message.session.stopStream).not.toHaveBeenCalled();
  });
});

describe('OutgoingImage channel routing', () => {
  const sendImage = (sessionOptions, instanceOptions = {}) => {
    const image = Object.create(OutgoingImage.prototype);
    image.instanceOptions = instanceOptions;
    image.options = Object.assign({}, sessionOptions, instanceOptions);
    image.thumbnailData = new Uint8Array([1]);
    image.fullImageData = new Uint8Array([2]);
    image.fullImageWidth = 1;
    image.fullImageHeight = 1;
    image.source = 'library';
    image.session = bareSession(sessionOptions);
    image.send();
    return image.session.sent[0];
  };

  it('prefers the image channel, otherwise the session default', () => {
    const explicit = sendImage({
      channels: ['Front', 'Back'],
      channel: 'Back'
    }, {
      channel: 'Front'
    });
    expect(explicit.channel).toBe('Front');

    const fallback = sendImage({
      channels: ['Front', 'Back'],
      channel: 'Back'
    });
    expect(fallback.channel).toBe('Back');
  });

  const imageReadyToSend = (sessionOptions, instanceOptions = {}, userCallback = null) => {
    const image = new Emitter();
    Object.setPrototypeOf(image, OutgoingImage.prototype);
    image.instanceOptions = instanceOptions;
    image.options = Object.assign({ preview: true }, sessionOptions, instanceOptions);
    image.thumbnailData = new Uint8Array([1]);
    image.fullImageWidth = 1;
    image.fullImageHeight = 1;
    image.source = 'library';
    image.session = bareSession(sessionOptions);
    image.userCallback = userCallback;
    image.setHandlers();
    return image;
  };

  it('reports a missing channel to the callback and rejects', async () => {
    const onError = jest.fn();
    const image = imageReadyToSend({ channels: ['Front', 'Back'] }, {}, onError);
    image.fullImageData = new Uint8Array([2]);
    await expect(image.send()).rejects.toThrow(Constants.ERROR_NOT_ENOUGH_PARAMS);
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({
      message: Constants.ERROR_NOT_ENOUGH_PARAMS
    }));
    expect(image.session.sent).toHaveLength(0);
  });

  it('reports a missing channel from automatic send instead of throwing', async () => {
    const onError = jest.fn();
    const onEvent = jest.fn();
    const image = imageReadyToSend({ channels: ['Front', 'Back'] }, { preview: false }, onError);
    image.on(Constants.EVENT_ERROR, onEvent);

    image.emit(Constants.EVENT_IMAGE_DATA, new Uint8Array([2]));
    await Promise.resolve();

    expect(onError).toHaveBeenCalledWith(expect.objectContaining({
      message: Constants.ERROR_NOT_ENOUGH_PARAMS
    }));
    expect(onEvent).toHaveBeenCalledWith(expect.objectContaining({
      message: Constants.ERROR_NOT_ENOUGH_PARAMS
    }));
    expect(image.session.sent).toHaveLength(0);
  });

  it('sends automatically when a channel is available', () => {
    const image = imageReadyToSend({
      channels: ['Front', 'Back'],
      channel: 'Back'
    }, {
      preview: false,
      channel: 'Front'
    });
    image.emit(Constants.EVENT_IMAGE_DATA, new Uint8Array([2]));
    expect(image.session.sent[0].channel).toBe('Front');
  });

  it('passes the image callback through sendImage', () => {
    const Created = jest.fn();
    setSdk({ OutgoingImage: Created });
    const session = Object.create(Session.prototype);
    const callback = () => {};
    const options = { preview: false };
    session.sendImage(options, callback);
    expect(Created).toHaveBeenCalledWith(session, options, callback);
  });
});

describe('Incoming image identity', () => {
  it('keeps two pending images apart', () => {
    setSdk({ IncomingImage: IncomingImage });
    const session = new Session(Object.assign({ channels: ['Front', 'Back'] }, credentials));
    const images = {};
    const received = {};
    session.on(Constants.EVENT_INCOMING_IMAGE, (image) => {
      images[image.instanceId] = image;
      received[image.instanceId] = [];
      image.on(Constants.EVENT_THUMBNAIL_DATA, (bytes) => received[image.instanceId].push(['thumbnail', bytes[0]]));
      image.on(Constants.EVENT_IMAGE_DATA, (bytes) => received[image.instanceId].push(['image', bytes[0]]));
    });
    const packet = (messageId, packetId, byte) =>
      session.wsBinaryDataHandler(binaryFrame(Constants.MESSAGE_TYPE_IMAGE, messageId, packetId, byte));

    session.jsonDataHandler({ command: 'on_image', channel: 'Front', message_id: 1, from: 'a', type: 'jpeg' });
    session.jsonDataHandler({ command: 'on_image', channel: 'Back', message_id: 2, from: 'b', type: 'jpeg' });

    packet(1, Constants.IMAGE_TYPE_THUMBNAIL, 11);
    packet(1, Constants.IMAGE_TYPE_FULL, 12);
    packet(2, Constants.IMAGE_TYPE_THUMBNAIL, 21);
    packet(2, Constants.IMAGE_TYPE_FULL, 22);
    packet(1, Constants.IMAGE_TYPE_FULL, 13);

    expect(received[1]).toEqual([['thumbnail', 11], ['image', 12]]);
    expect(received[2]).toEqual([['thumbnail', 21], ['image', 22]]);
    expect(images[2].channel).toBe('Back');
  });
});

describe('Incoming channel identity', () => {
  const incomingSession = () => ({
    log: () => {},
    on: jest.fn(),
    off: jest.fn(),
    onIncomingVoiceDidStart: jest.fn(),
    onIncomingVoiceDecoded: jest.fn(),
    onIncomingVoicePlaybackStopped: jest.fn(),
    options: {
      channels: ['Front', 'Back'],
      channel: 'Back'
    }
  });

  it('keeps the Zello channel name off the playback channel count', () => {
    const message = new IncomingMessage({
      stream_id: 4,
      channel: 'Back',
      codec_header: codecHeader
    }, incomingSession());
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

  it('keeps two overlapping streams apart', async () => {
    const decoders = {};
    function Decoder(options) {
      this.packets = [];
      this.destroyed = false;
      decoders[options.messageData.stream_id] = this;
    }
    Decoder.prototype.decode = function (bytes) {
      this.packets.push(bytes[0]);
    };
    Decoder.prototype.destroy = function () {
      this.destroyed = true;
    };
    setSdk({ Sdk: { initOptions: { decoder: Decoder } }, IncomingMessage: IncomingMessage });
    const session = new Session(Object.assign({ channels: ['Front', 'Back'] }, credentials));
    const packetsSeenBySession = [];
    session.on(Constants.EVENT_INCOMING_VOICE_DATA, (packet) => {
      packetsSeenBySession.push(packet.messageId);
    });
    const streamStart = (streamId, channel) => session.jsonDataHandler({
      command: 'on_stream_start',
      type: 'audio',
      codec: 'opus',
      codec_header: codecHeader,
      packet_duration: 20,
      stream_id: streamId,
      channel: channel
    });
    const packet = (streamId, byte) =>
      session.wsBinaryDataHandler(binaryFrame(Constants.MESSAGE_TYPE_AUDIO, streamId, 1, byte));

    streamStart(1, 'Front');
    streamStart(2, 'Back');
    await new Promise((resolve) => setTimeout(resolve, 0));

    packet(1, 11);
    packet(2, 22);
    expect(decoders[1].packets).toEqual([11]);
    expect(decoders[2].packets).toEqual([22]);
    expect(session.incomingMessages[1].packetCount).toBe(1);
    expect(session.incomingMessages[2].packetCount).toBe(1);
    // App-level listeners still see every packet.
    expect(packetsSeenBySession).toEqual([1, 2]);

    session.jsonDataHandler({ command: 'on_stream_stop', stream_id: 1 });
    expect(decoders[1].destroyed).toBe(true);
    expect(decoders[2].destroyed).toBe(false);
    expect(session.incomingMessages[2].isPlaybackComplete).toBe(false);

    packet(2, 23);
    expect(decoders[2].packets).toEqual([22, 23]);
  });

  it('drives the shared player per stream', async () => {
    const player = {
      setSampleRate: jest.fn(),
      setFlushingTime: jest.fn(),
      feed: jest.fn(),
      reset: jest.fn(),
      endStream: jest.fn(),
      mute: jest.fn()
    };
    IncomingMessage.PersistentPlayer = player;
    const create = (streamId) => new IncomingMessage({
      stream_id: streamId,
      channel: 'Back',
      codec_header: codecHeader
    }, incomingSession());

    const message = create(5);
    await message.init();
    expect(player.setSampleRate).toHaveBeenCalledWith(24000, '5');
    expect(player.setFlushingTime).toHaveBeenCalledWith(240);

    const pcm = new Float32Array([1]);
    message.emit(Constants.EVENT_INCOMING_VOICE_DATA_DECODED, pcm);
    expect(player.feed).toHaveBeenCalledWith(pcm, '5');

    message.mute(true);
    expect(player.mute).toHaveBeenCalledWith(true, '5');

    // Ended early by the server: cancel this stream's audio only.
    message.stopPlayback(false);
    expect(player.reset).toHaveBeenCalledWith('5');
    expect(player.endStream).not.toHaveBeenCalled();

    // Played to the end: let buffered samples finish, then release the track.
    const complete = create(6);
    await complete.init();
    complete.stopPlayback(true);
    expect(player.endStream).toHaveBeenCalledWith('6');
    expect(player.reset).toHaveBeenCalledTimes(1);
  });
});
