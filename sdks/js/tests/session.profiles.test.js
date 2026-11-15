/**
 * Tests for the user profiles pass-through: the `on_user_profiles` event is
 * emitted as `user_profiles` with the profiles array. Profiles are push-only;
 * there is no command. Exercised on a stub `this` via the prototype:
 * constructing a real Session needs the loaded ZCC library and a websocket.
 */

jest.mock('../src/classes/utils', () => ({
  getLoadedLibrary: () => ({})
}));

const Session = require('../src/classes/session');
const Constants = require('../src/classes/constants');

const makeStub = () => {
  const emitted = [];
  const stub = {
    options: {},
    callbacks: {},
    handleCallbacks: Session.prototype.handleCallbacks,
    emit: (name, ...args) => emitted.push({ name, args })
  };
  return { stub, emitted };
};

describe('on_user_profiles', () => {
  test('is emitted as user_profiles with the profiles array', () => {
    const { stub, emitted } = makeStub();
    const profiles = [
      {
        username: 'sherlock',
        display_name: 'Sherlock Holmes',
        profile_picture: 'https://example.com/sherlock.jpg',
        profile_picture_thumb: 'https://example.com/sherlock_thumb.jpg',
        profile_ts: 1758700000
      },
      { username: 'watson', display_name: 'watson' }
    ];

    Session.prototype.jsonDataHandler.call(stub, {
      command: 'on_user_profiles',
      profiles
    });

    expect(Constants.EVENT_USER_PROFILES).toBe('user_profiles');
    expect(emitted).toEqual([{ name: 'user_profiles', args: [profiles] }]);
  });

  test('a malformed event without a profiles array emits an empty batch', () => {
    const { stub, emitted } = makeStub();

    Session.prototype.jsonDataHandler.call(stub, {
      command: 'on_user_profiles'
    });

    expect(emitted).toEqual([{ name: 'user_profiles', args: [[]] }]);
  });
});
