/**
 * Tests for the channel history commands: `get_history`,
 * `play_history_message` and `get_history_image`, plus the way their
 * replies reach the client through the existing stream and image events.
 *
 * Exercised on a stub `this` via the prototype: constructing a real Session
 * needs the loaded ZCC library and a websocket.
 */

class FakeIncomingMessage {
  constructor(messageData) {
    this.streamId = messageData.stream_id;
    this.messageData = messageData;
  }
  init() {
    return Promise.resolve();
  }
}

class FakeIncomingImage {
  constructor(messageData) {
    this.messageData = messageData;
    this.instanceId = messageData.message_id;
  }
}

jest.mock('../src/classes/utils', () => ({
  getLoadedLibrary: () => ({
    IncomingMessage: FakeIncomingMessage,
    IncomingImage: FakeIncomingImage
  })
}));

const Session = require('../src/classes/session');

const makeStub = () => {
  const sent = [];
  const emitted = [];
  const stub = {
    options: { channel: 'Ops' },
    seq: 0,
    callbacks: {},
    incomingMessages: {},
    getSeq: Session.prototype.getSeq,
    sendCommand: Session.prototype.sendCommand,
    sendCommandWithCallback: Session.prototype.sendCommandWithCallback,
    handleCallbacks: Session.prototype.handleCallbacks,
    emit: (name, ...args) => emitted.push({ name, args }),
    wsConnection: { send: (raw) => sent.push(JSON.parse(raw)) }
  };
  return { stub, sent, emitted };
};

const respond = (stub, seq, response) => stub.callbacks[seq](null, response);
const fail = (stub, seq, error) => stub.callbacks[seq](error);

describe('getHistory', () => {
  test('asks for the session channel with no cursor by default', () => {
    const { stub, sent } = makeStub();

    Session.prototype.getHistory.call(stub);

    expect(sent).toEqual([{ command: 'get_history', channel: 'Ops', seq: 1 }]);
  });

  test('passes the cursor and a channel override through', () => {
    const { stub, sent } = makeStub();

    Session.prototype.getHistory.call(stub, { since: 1758300000000, channel: 'Yard' });

    expect(sent[0]).toEqual({
      command: 'get_history',
      channel: 'Yard',
      since: 1758300000000,
      seq: 1
    });
  });

  test('accepts a callback as the only argument', (done) => {
    const { stub, sent } = makeStub();
    Session.prototype.getHistory.call(stub, (err, data) => {
      expect(err).toBeNull();
      expect(data.messages).toHaveLength(1);
      done();
    });

    expect(sent[0]).toEqual({ command: 'get_history', channel: 'Ops', seq: 1 });
    respond(stub, 1, { success: true, channel: 'Ops', messages: [{ type: 'text' }] });
  });

  test('resolves with the message list', async () => {
    const { stub } = makeStub();
    const messages = [
      { type: 'audio', message_id: 22695, from: 'alex', ts: 1758300001, packet_duration: 60, playable: true },
      { type: 'text', message_id: 22701, from: 'kim', ts: 1758300042, text: 'On my way' }
    ];
    const promise = Session.prototype.getHistory.call(stub);

    respond(stub, 1, { success: true, channel: 'Ops', messages });

    await expect(promise).resolves.toEqual({ success: true, channel: 'Ops', messages });
  });

  test('rejects where history is unavailable', async () => {
    const { stub } = makeStub();
    const promise = Session.prototype.getHistory.call(stub);

    fail(stub, 1, 'not supported');

    await expect(promise).rejects.toEqual('not supported');
  });
});

describe('playHistoryMessage', () => {
  test('sends the message id with the session channel', () => {
    const { stub, sent } = makeStub();

    Session.prototype.playHistoryMessage.call(stub, 22695);

    expect(sent).toEqual([
      { command: 'play_history_message', channel: 'Ops', message_id: 22695, seq: 1 }
    ]);
  });

  test('passes the cursor through without letting it override the id', () => {
    const { stub, sent } = makeStub();

    Session.prototype.playHistoryMessage.call(stub, 22695, { since: 1758300000000, message_id: 1 });

    expect(sent[0]).toEqual({
      command: 'play_history_message',
      channel: 'Ops',
      message_id: 22695,
      since: 1758300000000,
      seq: 1
    });
  });

  test('accepts a callback in place of options', (done) => {
    const { stub } = makeStub();
    Session.prototype.playHistoryMessage.call(stub, 22695, (err, data) => {
      expect(err).toBeNull();
      expect(data.stream_id).toBe(22695);
      done();
    });
    respond(stub, 1, { success: true, message_id: 22695, stream_id: 22695 });
  });

  test('resolves once playback starts and rejects when busy', async () => {
    const { stub } = makeStub();
    const first = Session.prototype.playHistoryMessage.call(stub, 22695);
    const second = Session.prototype.playHistoryMessage.call(stub, 22696);

    respond(stub, 1, { success: true, message_id: 22695, stream_id: 22695 });
    fail(stub, 2, 'busy');

    await expect(first).resolves.toEqual({ success: true, message_id: 22695, stream_id: 22695 });
    await expect(second).rejects.toEqual('busy');
  });

  test('the replay arrives as an incoming voice message carrying message_id', async () => {
    const { stub, emitted } = makeStub();
    const streamStart = {
      command: 'on_stream_start',
      type: 'audio',
      codec: 'opus',
      codec_header: 'gD4BPA==',
      packet_duration: 60,
      stream_id: 22695,
      channel: 'Ops',
      from: 'alex',
      message_id: 22695
    };

    Session.prototype.jsonDataHandler.call(stub, streamStart);
    await Promise.resolve();
    Session.prototype.jsonDataHandler.call(stub, { command: 'on_stream_stop', stream_id: 22695 });

    expect(emitted.map((e) => e.name)).toEqual([
      'incoming_voice_will_start',
      'incoming_voice_did_stop'
    ]);
    const message = emitted[0].args[0];
    expect(message.streamId).toBe(22695);
    expect(message.messageData.message_id).toBe(22695);
    expect(emitted[1].args[0]).toBe(message);
  });
});

describe('getHistoryImage', () => {
  test('sends the message id with the session channel', () => {
    const { stub, sent } = makeStub();

    Session.prototype.getHistoryImage.call(stub, 22710);

    expect(sent).toEqual([
      { command: 'get_history_image', channel: 'Ops', message_id: 22710, seq: 1 }
    ]);
  });

  test('passes the cursor and a channel override through', () => {
    const { stub, sent } = makeStub();

    Session.prototype.getHistoryImage.call(stub, 22710, { since: 1758300000000, channel: 'Yard' });

    expect(sent[0]).toEqual({
      command: 'get_history_image',
      channel: 'Yard',
      message_id: 22710,
      since: 1758300000000,
      seq: 1
    });
  });

  test('accepts a callback in place of options', (done) => {
    const { stub } = makeStub();
    Session.prototype.getHistoryImage.call(stub, 22710, (err, data) => {
      expect(err).toBeNull();
      expect(data).toEqual({ success: true, message_id: 22710 });
      done();
    });
    respond(stub, 1, { success: true, message_id: 22710 });
  });

  test('rejects for an entry that is not an image', async () => {
    const { stub } = makeStub();
    const promise = Session.prototype.getHistoryImage.call(stub, 22695);

    fail(stub, 1, 'message not playable');

    await expect(promise).rejects.toEqual('message not playable');
  });

  test('the image arrives as an incoming_image keyed by message_id', () => {
    const { stub, emitted } = makeStub();
    const image = {
      command: 'on_image',
      channel: 'Ops',
      from: 'kim',
      message_id: 22710,
      source: 'camera',
      width: 591,
      height: 1280,
      type: 'jpeg'
    };

    Session.prototype.jsonDataHandler.call(stub, image);

    expect(emitted).toHaveLength(1);
    expect(emitted[0].name).toBe('incoming_image');
    expect(emitted[0].args[0].instanceId).toBe(22710);
    expect(emitted[0].args[0].messageData).toBe(image);
  });
});

describe('on_channel_status', () => {
  test('carries history_supported through untouched', () => {
    const { stub, emitted } = makeStub();
    const status = {
      command: 'on_channel_status',
      channel: 'Ops',
      status: 'online',
      users_online: 3,
      history_supported: true
    };

    Session.prototype.jsonDataHandler.call(stub, status);

    expect(emitted).toEqual([{ name: 'status', args: [status] }]);
  });
});
