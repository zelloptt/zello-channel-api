/**
 * Tests for the dispatch call session commands.
 *
 * The methods are thin wrappers over sendCommandWithCallback, so they are
 * exercised on a stub `this` via the prototype: constructing a real Session
 * needs the loaded ZCC library and a websocket.
 */

const Session = require('../src/classes/session');

const makeStub = () => {
  const sent = [];
  const stub = {
    options: { channel: 'kiosk-channel' },
    seq: 0,
    callbacks: {},
    getSeq: Session.prototype.getSeq,
    sendCommand: Session.prototype.sendCommand,
    sendCommandWithCallback: Session.prototype.sendCommandWithCallback,
    wsConnection: { send: (raw) => sent.push(JSON.parse(raw)) }
  };
  return { stub, sent };
};

const respond = (stub, seq, response) => stub.callbacks[seq](null, response);
const fail = (stub, seq, error) => stub.callbacks[seq](error);

describe('getDispatchCalls', () => {
  test('sends the command for the session channel', () => {
    const { stub, sent } = makeStub();

    Session.prototype.getDispatchCalls.call(stub);

    expect(sent).toEqual([
      { command: 'get_dispatch_calls', channel: 'kiosk-channel', seq: 1 }
    ]);
  });

  test('resolves with the calls list', async () => {
    const { stub } = makeStub();
    const promise = Session.prototype.getDispatchCalls.call(stub);
    const response = {
      success: true,
      calls: [{ id: 171234, user: 'guest', status: 'pending', messages: [] }]
    };

    respond(stub, 1, response);

    await expect(promise).resolves.toEqual(response);
  });
});

describe('takeDispatchCall', () => {
  test('sends the call id with the command', () => {
    const { stub, sent } = makeStub();

    Session.prototype.takeDispatchCall.call(stub, 171234);

    expect(sent).toEqual([
      {
        command: 'take_dispatch_call',
        channel: 'kiosk-channel',
        call_id: 171234,
        seq: 1
      }
    ]);
  });

  test('rejects when another dispatcher holds the call', async () => {
    const { stub } = makeStub();
    const promise = Session.prototype.takeDispatchCall.call(stub, 171234);

    fail(stub, 1, 'taken');

    await expect(promise).rejects.toEqual('taken');
  });

  test('fires the callback form as well', (done) => {
    const { stub } = makeStub();

    Session.prototype.takeDispatchCall.call(stub, 171234, (err, data) => {
      expect(err).toBeNull();
      expect(data).toEqual({ success: true, call: { id: 171234 } });
      done();
    });

    respond(stub, 1, { success: true, call: { id: 171234 } });
  });
});

describe('playDispatchMessage', () => {
  test('sends the call and message ids with the command', () => {
    const { stub, sent } = makeStub();

    Session.prototype.playDispatchMessage.call(stub, 171234, 411);

    expect(sent).toEqual([
      {
        command: 'play_dispatch_message',
        channel: 'kiosk-channel',
        call_id: 171234,
        message_id: 411,
        seq: 1
      }
    ]);
  });

  test('resolves with the stream id when playback starts', async () => {
    const { stub } = makeStub();
    const promise = Session.prototype.playDispatchMessage.call(
      stub,
      171234,
      411
    );

    respond(stub, 1, { success: true, stream_id: 411 });

    await expect(promise).resolves.toEqual({ success: true, stream_id: 411 });
  });

  test('rejects while another playback is running', async () => {
    const { stub } = makeStub();
    const promise = Session.prototype.playDispatchMessage.call(
      stub,
      171234,
      411
    );

    fail(stub, 1, 'busy');

    await expect(promise).rejects.toEqual('busy');
  });
});
