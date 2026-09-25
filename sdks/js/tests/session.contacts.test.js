/**
 * Tests for the `get_contacts` session command.
 *
 * Exercised on a stub `this` via the prototype: constructing a real Session
 * needs the loaded ZCC library and a websocket.
 */

const Session = require('../src/classes/session');

const makeStub = () => {
  const sent = [];
  const stub = {
    options: {},
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

const contacts = {
  success: true,
  users: [
    { username: 'sherlock', display_name: 'Sherlock Holmes', status: 'online', tags: ['Everyone'] },
    { username: 'watson', display_name: 'watson', tags: ['Everyone'] }
  ],
  channels: [
    { name: 'Dispatch', dispatch: true, team: false },
    { name: 'Everyone', dispatch: false, team: true }
  ]
};

describe('getContacts', () => {
  test('sends the bare command', () => {
    const { stub, sent } = makeStub();

    Session.prototype.getContacts.call(stub);

    expect(sent).toEqual([{ command: 'get_contacts', seq: 1 }]);
  });

  test('resolves with the users and channels', async () => {
    const { stub } = makeStub();
    const promise = Session.prototype.getContacts.call(stub);

    respond(stub, 1, contacts);

    await expect(promise).resolves.toEqual(contacts);
  });

  test('rejects for sessions without a contact list', async () => {
    const { stub } = makeStub();
    const promise = Session.prototype.getContacts.call(stub);

    fail(stub, 1, 'not supported');

    await expect(promise).rejects.toEqual('not supported');
  });

  test('fires the callback form as well', (done) => {
    const { stub } = makeStub();
    Session.prototype.getContacts.call(stub, (err, data) => {
      expect(err).toBeNull();
      expect(data).toEqual(contacts);
      done();
    });
    respond(stub, 1, contacts);
  });
});
