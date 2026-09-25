/**
 * Tests for the user profiles pass-through: the `get_user_profiles` command
 * and the `on_user_profile` -> `user_profile` event.
 *
 * Exercised on a stub `this` via the prototype: constructing a real Session
 * needs the loaded ZCC library and a websocket.
 */

jest.mock('../src/classes/utils', () => ({
  getLoadedLibrary: () => ({})
}));

const Session = require('../src/classes/session');
const Constants = require('../src/classes/constants');

const makeStub = () => {
  const sent = [];
  const emitted = [];
  const stub = {
    options: {},
    seq: 0,
    callbacks: {},
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

describe('getUserProfiles', () => {
  test('sends the user list with the command', () => {
    const { stub, sent } = makeStub();

    Session.prototype.getUserProfiles.call(stub, ['sherlock', 'watson']);

    expect(sent).toEqual([
      { command: 'get_user_profiles', users: ['sherlock', 'watson'], seq: 1 }
    ]);
  });

  test('wraps a single username in a list', () => {
    const { stub, sent } = makeStub();

    Session.prototype.getUserProfiles.call(stub, 'sherlock');

    expect(sent[0].users).toEqual(['sherlock']);
  });

  test('resolves with the acknowledgement', async () => {
    const { stub } = makeStub();
    const promise = Session.prototype.getUserProfiles.call(stub, ['sherlock']);

    respond(stub, 1, { success: true });

    await expect(promise).resolves.toEqual({ success: true });
  });

  test('rejects when the session did not opt into profiles', async () => {
    const { stub } = makeStub();
    const promise = Session.prototype.getUserProfiles.call(stub, ['sherlock']);

    fail(stub, 1, 'not supported');

    await expect(promise).rejects.toEqual('not supported');
  });

  test('fires the callback form as well', (done) => {
    const { stub } = makeStub();
    Session.prototype.getUserProfiles.call(stub, ['sherlock'], (err, data) => {
      expect(err).toBeNull();
      expect(data).toEqual({ success: true });
      done();
    });
    respond(stub, 1, { success: true });
  });
});

describe('on_user_profile', () => {
  test('is emitted as the user_profile event with the payload untouched', () => {
    const { stub, emitted } = makeStub();
    const profile = {
      command: 'on_user_profile',
      username: 'sherlock',
      display_name: 'Sherlock Holmes',
      profile_picture: 'https://example.com/sherlock.jpg',
      profile_picture_thumb: 'https://example.com/sherlock_thumb.jpg',
      profile_ts: 1758700000
    };

    Session.prototype.jsonDataHandler.call(stub, profile);

    expect(Constants.EVENT_USER_PROFILE).toBe('user_profile');
    expect(emitted).toEqual([{ name: 'user_profile', args: [profile] }]);
  });

  test('a profile-less user still reaches the client', () => {
    const { stub, emitted } = makeStub();
    const profile = {
      command: 'on_user_profile',
      username: 'nobody',
      display_name: 'nobody'
    };

    Session.prototype.jsonDataHandler.call(stub, profile);

    expect(emitted).toEqual([{ name: 'user_profile', args: [profile] }]);
  });
});
