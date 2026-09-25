/**
 * Tests for text message mentions: `sendTextMessage` passes the `mentions`
 * array through on `send_text_message`, and an `on_text_message` carrying
 * `mentions` reaches the client intact on the `incoming_text_message` event.
 *
 * Exercised on a stub `this` via the prototype: constructing a real Session
 * needs the loaded ZCC library and a websocket.
 */

jest.mock('../src/classes/utils', () => ({
  getLoadedLibrary: () => ({})
}));

const Session = require('../src/classes/session');

const TEXT = '@holmes and @watson meet me at the falls';
const MENTIONS = [
  { username: 'holmes', offset: 0, length: 7 },
  { username: 'watson', offset: 12, length: 7 }
];

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

describe('sendTextMessage with mentions', () => {
  test('sends the mentions array as given', () => {
    const { stub, sent } = makeStub();

    Session.prototype.sendTextMessage.call(stub, { text: TEXT, mentions: MENTIONS });

    expect(sent).toEqual([
      { command: 'send_text_message', text: TEXT, mentions: MENTIONS, seq: 1 }
    ]);
  });

  test('sends no mentions field when none are given', () => {
    const { stub, sent } = makeStub();

    Session.prototype.sendTextMessage.call(stub, { text: 'Hello Zello!' });

    expect(sent).toEqual([{ command: 'send_text_message', text: 'Hello Zello!', seq: 1 }]);
  });

  test('keeps mentions alongside a for recipient', () => {
    const { stub, sent } = makeStub();

    Session.prototype.sendTextMessage.call(stub, {
      text: TEXT,
      for: 'watson',
      mentions: MENTIONS
    });

    expect(sent[0]).toMatchObject({ for: 'watson', mentions: MENTIONS });
  });

  test('resolves on success', async () => {
    const { stub } = makeStub();

    const promise = Session.prototype.sendTextMessage.call(stub, { text: TEXT, mentions: MENTIONS });
    respond(stub, 1, { seq: 1, success: true });

    await expect(promise).resolves.toEqual({ seq: 1, success: true });
  });

  test('rejects with the server error when the mentions are refused', async () => {
    const { stub } = makeStub();

    const promise = Session.prototype.sendTextMessage.call(stub, {
      text: TEXT,
      mentions: [{ username: 'holmes', offset: 0, length: TEXT.length + 1 }]
    });
    fail(stub, 1, 'invalid mentions');

    await expect(promise).rejects.toBe('invalid mentions');
  });
});

describe('incoming_text_message with mentions', () => {
  const textMessage = (extra = {}) => ({
    command: 'on_text_message',
    channel: 'Ops',
    from: 'alex',
    for: false,
    message_id: 16777217,
    text: TEXT,
    ...extra
  });

  test('emits the message JSON with the mentions intact', () => {
    const { stub, emitted } = makeStub();

    Session.prototype.jsonDataHandler.call(stub, textMessage({ mentions: MENTIONS }));

    expect(emitted).toEqual([
      { name: 'incoming_text_message', args: [textMessage({ mentions: MENTIONS })] }
    ]);
  });

  test('emits a message without mentions unchanged', () => {
    const { stub, emitted } = makeStub();

    Session.prototype.jsonDataHandler.call(stub, textMessage());

    expect(emitted).toHaveLength(1);
    expect(emitted[0].args[0]).not.toHaveProperty('mentions');
  });
});
