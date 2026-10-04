/**
 * Tests for the `get_channel_users` session command.
 *
 * Exercised on a stub `this` via the prototype: constructing a real Session
 * needs the loaded ZCC library and a websocket.
 */

const Session = require('../src/classes/session');

const makeStub = () => {
  const sent = [];
  const stub = {
    options: { channel: 'Baker Street' },
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

const roster = {
  success: true,
  users: [
    { username: 'sherlock', display_name: 'Sherlock Holmes' },
    { username: 'lestrade', display_name: 'DI Lestrade', dispatcher: true }
  ]
};

describe('getChannelUsers', () => {
  test('defaults to the session channel', () => {
    const { stub, sent } = makeStub();

    Session.prototype.getChannelUsers.call(stub);

    expect(sent).toEqual([
      { command: 'get_channel_users', channel: 'Baker Street', seq: 1 }
    ]);
  });

  test('sends an explicit channel instead when given', () => {
    const { stub, sent } = makeStub();

    Session.prototype.getChannelUsers.call(stub, 'Reichenbach Falls');

    expect(sent[0].channel).toBe('Reichenbach Falls');
  });

  test('resolves with the roster', async () => {
    const { stub } = makeStub();
    const promise = Session.prototype.getChannelUsers.call(stub);

    respond(stub, 1, roster);

    await expect(promise).resolves.toEqual(roster);
  });

  test('rejects for a channel the session is not connected to', async () => {
    const { stub } = makeStub();
    const promise = Session.prototype.getChannelUsers.call(stub, 'Other');

    fail(stub, 1, 'channel not found');

    await expect(promise).rejects.toEqual('channel not found');
  });

  test('fires the callback form as well', (done) => {
    const { stub } = makeStub();
    Session.prototype.getChannelUsers.call(stub, null, (err, data) => {
      expect(err).toBeNull();
      expect(data).toEqual(roster);
      done();
    });
    respond(stub, 1, roster);
  });
});
