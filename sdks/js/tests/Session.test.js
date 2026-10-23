const Session = require('../src/classes/session');
const OutgoingMessage = require('../src/classes/outgoingMessage');
const OutgoingImage = require('../src/classes/outgoingImage');
const IncomingMessage = require('../src/classes/incomingMessage');
const IncomingImage = require('../src/classes/incomingImage');
const Constants = require('../src/classes/constants');
const Utils = require('../src/classes/utils');

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
  session.channelConfigurationErrors = new Set();
  session.channelStatuses = {};
  session.channelsReadyWaiters = [];
  session.incomingMessages = {};
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
    message.streams = [];
    message.pendingFrames = [];
    message.maxPendingFrames = 250;
    message.started = false;
    message.session = Object.assign(bareSession(sessionOptions), {
      startStream: jest.fn(() => Promise.resolve({ stream_id: 9 })),
      stopStream: jest.fn(() => Promise.resolve({}))
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
    await message.stop();
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
  beforeEach(() => {
    jest.spyOn(OutgoingImage.prototype, 'handleCamera').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

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

  // Real OutgoingImage, without opening a camera. sendImage is the public entry.
  const openImage = (sessionOptions, instanceOptions = {}, userCallback = null) => {
    setSdk({ OutgoingImage: OutgoingImage });
    const session = bareSession(sessionOptions);
    const image = session.sendImage(instanceOptions, userCallback);
    image.thumbnailData = new Uint8Array([1]);
    image.fullImageWidth = 1;
    image.fullImageHeight = 1;
    image.source = 'library';
    return image;
  };

  it('rejects a direct send when no channel can be resolved', async () => {
    const onEvent = jest.fn();
    const image = openImage({ channels: ['Front', 'Back'] });
    image.fullImageData = new Uint8Array([2]);
    image.on(Constants.EVENT_ERROR, onEvent);

    await expect(image.send()).rejects.toThrow(Constants.ERROR_NOT_ENOUGH_PARAMS);
    expect(onEvent).toHaveBeenCalledWith(expect.objectContaining({
      message: Constants.ERROR_NOT_ENOUGH_PARAMS
    }));
    expect(image.session.sent).toHaveLength(0);
  });

  it('reports a missing channel from automatic send instead of throwing', async () => {
    const onError = jest.fn();
    const image = openImage({ channels: ['Front', 'Back'] }, { preview: false }, onError);

    image.emit(Constants.EVENT_IMAGE_DATA, new Uint8Array([2]));
    await Promise.resolve();

    expect(onError).toHaveBeenCalledWith(expect.objectContaining({
      message: Constants.ERROR_NOT_ENOUGH_PARAMS
    }));
    expect(image.session.sent).toHaveLength(0);
  });

  it('reports a server rejection to the error callback instead of throwing', () => {
    const onError = jest.fn();
    const image = openImage({ channel: 'Front' }, {}, onError);
    image.fullImageData = new Uint8Array([2]);
    image.session.sendCommand = (params, callback) => callback('channel is not ready');

    expect(() => image.send()).not.toThrow();
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({
      message: 'channel is not ready'
    }));
  });

  it('sends automatically when a channel is available', () => {
    const image = openImage({
      channels: ['Front', 'Back'],
      channel: 'Back'
    }, {
      preview: false
    });
    image.emit(Constants.EVENT_IMAGE_DATA, new Uint8Array([2]));
    expect(image.session.sent[0]).toEqual(expect.objectContaining({
      command: 'send_image',
      channel: 'Back'
    }));
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
      endTrack: jest.fn(),
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
    expect(player.endTrack).not.toHaveBeenCalled();

    // Played to the end: let buffered samples finish, then release the track.
    const complete = create(6);
    await complete.init();
    complete.stopPlayback(true);
    expect(player.endTrack).toHaveBeenCalledWith('6');
    expect(player.reset).toHaveBeenCalledTimes(1);
  });
});

describe('Session channel readiness', () => {
  const statusFor = (session, channel, status = 'online') => session.jsonDataHandler({
    command: 'on_channel_status',
    channel: channel,
    status: status,
    users_online: 3
  });

  it('keeps the last status per channel and reports when every channel has one', () => {
    const session = new Session(Object.assign({ channels: ['Front', 'Back'] }, credentials));
    expect(session.channelsReady).toBe(false);
    expect(session.getChannelStatus('Front')).toBeUndefined();
    statusFor(session, 'Front');
    expect(session.channelsReady).toBe(false);
    statusFor(session, 'Back', 'offline');
    expect(session.channelsReady).toBe(true);
    expect(session.getChannelStatus('Back')).toMatchObject({ status: 'offline', users_online: 3 });
    // a status for a channel the session did not join is kept but does not count
    statusFor(session, 'Other');
    expect(session.channelsReady).toBe(true);
  });

  it('resolves whenChannelsReady once the last channel reports', async () => {
    const session = new Session(Object.assign({ channels: ['Front', 'Back'] }, credentials));
    const ready = session.whenChannelsReady();
    let settled = false;
    ready.then(() => { settled = true; });
    statusFor(session, 'Front');
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(settled).toBe(false);
    statusFor(session, 'Back');
    await expect(ready).resolves.toBe(true);
    // already ready: resolves at once
    await expect(session.whenChannelsReady()).resolves.toBe(true);
  });

  // Real timers throughout: Q settles promises on the scheduler it captured at
  // load, which Jest's fake timers would stall.
  it('resolves whenChannelsReady with false on timeout and on disconnect', async () => {
    const session = new Session(Object.assign({ channels: ['Front'] }, credentials));
    await expect(session.whenChannelsReady(20)).resolves.toBe(false);

    const dropped = session.whenChannelsReady(10000);
    session.disconnect();
    await expect(dropped).resolves.toBe(false);
    expect(session.channelsReadyWaiters).toEqual([]);
  });

  it('rejects the connect promise and calls back when every attempt is used up', async () => {
    const session = new Session(Object.assign({ channels: ['Front'], maxConnectAttempts: 0 }, credentials));
    const callback = jest.fn();
    await expect(session.connect(callback)).rejects.toBe('Failed to connect');
    expect(callback).toHaveBeenCalledWith('Failed to connect');
  });
});

describe('Session muteIncomingAudio', () => {
  const streamStart = (session) => session.jsonDataHandler({
    command: 'on_stream_start',
    type: 'audio',
    codec: 'opus',
    codec_header: codecHeader,
    packet_duration: 20,
    stream_id: 7,
    channel: 'Front'
  });

  const withPlayer = () => {
    const player = {
      setSampleRate: jest.fn(),
      setFlushingTime: jest.fn(),
      feed: jest.fn(),
      reset: jest.fn(),
      endTrack: jest.fn(),
      mute: jest.fn()
    };
    IncomingMessage.PersistentPlayer = player;
    function Decoder() {}
    Decoder.prototype.decode = () => {};
    Decoder.prototype.destroy = () => {};
    setSdk({ Sdk: { initOptions: { decoder: Decoder } }, IncomingMessage: IncomingMessage });
    return player;
  };

  it('mutes every incoming message when asked', async () => {
    const player = withPlayer();
    const session = new Session(Object.assign({ channels: ['Front'], muteIncomingAudio: true }, credentials));
    const started = jest.fn();
    session.on(Constants.EVENT_INCOMING_VOICE_WILL_START, started);
    streamStart(session);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(player.mute).toHaveBeenCalledWith(true, '7');
    // the message still reaches the application
    expect(started).toHaveBeenCalledTimes(1);
  });

  it('leaves playback alone by default', async () => {
    const player = withPlayer();
    const session = new Session(Object.assign({ channels: ['Front'] }, credentials));
    streamStart(session);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(player.mute).not.toHaveBeenCalled();
  });
});

describe('OutgoingMessage to several channels', () => {
  const ids = { Front: 11, Back: 22, Side: 33 };

  // A message with no recorder or encoder, started by hand, on a session that
  // answers start_stream per channel.
  const multiMessage = (channels, { refuse = [], instance = {} } = {}) => {
    setSdk({ OutgoingMessage: OutgoingMessage });
    const session = Object.assign(bareSession({ channels: ['Front', 'Back', 'Side'] }), {
      startStream: jest.fn((params) =>
        refuse.includes(params.channel)
          ? Promise.reject('failed to start stream')
          : Promise.resolve({ stream_id: ids[params.channel] })
      ),
      stopStream: jest.fn(() => Promise.resolve({})),
      log: () => {}
    });
    const callback = jest.fn();
    const message = new OutgoingMessage(session, Object.assign({
      channels: channels,
      autoStart: false,
      recorder: false,
      encoder: false
    }, instance), callback);
    const packets = [];
    message.on(Constants.EVENT_DATA_ENCODED, (packet) => packets.push(packet));
    return { session, message, callback, packets };
  };

  const streamIdOf = (packet) => new DataView(packet.buffer).getInt32(1, false);
  const packetIdOf = (packet) => new DataView(packet.buffer).getInt32(5, false);

  it('opens one stream per channel and sends every frame to each under its own ids', async () => {
    const { session, message, callback, packets } = multiMessage(['Front', 'Back']);
    const started = [];
    message.on(Constants.EVENT_STREAM_STARTED, (channel, streamId) => started.push([channel, streamId]));
    const result = await message.start();
    expect(session.startStream.mock.calls.map((call) => call[0].channel)).toEqual(['Front', 'Back']);
    expect(session.startStream.mock.calls[0][0]).toMatchObject({ type: 'audio', codec: 'opus', packet_duration: 20 });
    expect(result).toEqual({ stream_id: 11, streams: { Front: { stream_id: 11 }, Back: { stream_id: 22 } } });
    expect(callback).toHaveBeenCalledWith(null, result);
    expect(started).toEqual([['Front', 11], ['Back', 22]]);

    message.processEncodedData(new Uint8Array([1]));
    message.processEncodedData(new Uint8Array([2]));
    expect(packets.map((packet) => [streamIdOf(packet), packetIdOf(packet), packet[9]])).toEqual([
      [11, 1, 1], [22, 1, 1], [11, 2, 2], [22, 2, 2]
    ]);
    expect(message.currentMessageId).toBe(11);
    expect(message.currentPacketId).toBe(2);

    const onStop = jest.fn();
    const stopped = await message.stop(onStop);
    expect(session.stopStream.mock.calls.map((call) => call[0])).toEqual([
      { stream_id: 11, channel: 'Front' },
      { stream_id: 22, channel: 'Back' }
    ]);
    expect(stopped.streams).toEqual({ Front: { stream_id: 11 }, Back: { stream_id: 22 } });
    expect(onStop).toHaveBeenCalledWith(null, stopped);
  });

  it('holds frames encoded before the server answers and flushes them in order', async () => {
    const { message, packets } = multiMessage(['Front']);
    message.processEncodedData(new Uint8Array([7]));
    message.processEncodedData(new Uint8Array([8]));
    expect(packets).toEqual([]);
    await message.start();
    expect(packets.map((packet) => [streamIdOf(packet), packetIdOf(packet), packet[9]])).toEqual([
      [11, 1, 7], [11, 2, 8]
    ]);
  });

  it('leaves a channel that refuses the stream out and reports it', async () => {
    const { message, packets, callback } = multiMessage(['Front', 'Back'], { refuse: ['Back'] });
    const failed = [];
    message.on(Constants.EVENT_STREAM_FAILED, (channel, err) => failed.push([channel, err]));
    const result = await message.start();
    expect(result).toEqual({ stream_id: 11, streams: { Front: { stream_id: 11 }, Back: { error: 'failed to start stream' } } });
    expect(failed).toEqual([['Back', 'failed to start stream']]);
    expect(callback).toHaveBeenCalledWith(null, result);
    message.processEncodedData(new Uint8Array([1]));
    expect(packets.map(streamIdOf)).toEqual([11]);
  });

  it('fails only when no channel accepts', async () => {
    const { message, callback, session } = multiMessage(['Front', 'Back'], { refuse: ['Front', 'Back'] });
    await expect(message.start()).rejects.toBe('failed to start stream');
    expect(callback).toHaveBeenCalledWith('failed to start stream');
    expect(session.stopStream).not.toHaveBeenCalled();
  });

  it('stops sending to a stream the server ended and skips it on stop', async () => {
    const { session, message, packets } = multiMessage(['Front', 'Back']);
    await message.start();
    const ended = [];
    message.on(Constants.EVENT_STREAM_ENDED, (channel, streamId) => ended.push([channel, streamId]));
    session.activeOutgoingMessage = message;
    const sessionEvents = [];
    session.emit = (event, ...args) => sessionEvents.push([event, ...args]);
    session.jsonDataHandler({ command: 'on_stream_stop', stream_id: 22 });
    expect(ended).toEqual([['Back', 22]]);
    expect(sessionEvents).toContainEqual([Constants.EVENT_OUTGOING_VOICE_DID_STOP, 22, 'Back']);
    message.processEncodedData(new Uint8Array([1]));
    expect(packets.map(streamIdOf)).toEqual([11]);
    await message.stop();
    expect(session.stopStream.mock.calls.map((call) => call[0].channel)).toEqual(['Front']);
  });

  it('closes the streams the server opens after stop was requested', async () => {
    let accept;
    const { session, message } = multiMessage(['Front']);
    session.startStream = jest.fn(() => new Promise((resolve) => { accept = resolve; }));
    const starting = message.start();
    const stopping = message.stop();
    accept({ stream_id: 11 });
    await starting;
    await stopping;
    expect(session.stopStream).toHaveBeenCalledWith({ stream_id: 11, channel: 'Front' });
  });

  it('rejects channels the session did not join, and an empty list', () => {
    const { message } = multiMessage(['Front', 'Elsewhere']);
    expect(() => message.resolveChannels()).toThrow(Constants.ERROR_CHANNEL_NOT_IN_LIST);
    const empty = multiMessage([]).message;
    expect(() => empty.resolveChannels()).toThrow(Constants.ERROR_NOT_ENOUGH_PARAMS);
  });

  it('waits for the encoder to finish before closing a single stream', async () => {
    const { session, message } = multiMessage(['Front']);
    await message.start();
    const encoder = new (require('../src/classes/emitter'))();
    encoder.destroy = jest.fn();
    message.encoder = encoder;
    const stopping = message.stop();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(session.stopStream).not.toHaveBeenCalled();
    encoder.emit(Constants.EVENT_ENCODER_DONE);
    await stopping;
    expect(session.stopStream).toHaveBeenCalledWith({ stream_id: 11, channel: 'Front' });
    expect(encoder.destroy).toHaveBeenCalled();
  });
});
