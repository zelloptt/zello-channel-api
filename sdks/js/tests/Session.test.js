const Session = require('../src/classes/session');
const OutgoingMessage = require('../src/classes/outgoingMessage');
const IncomingMessage = require('../src/classes/incomingMessage');
const Constants = require('../src/classes/constants');

const codecHeader = 'gD4BPA==';

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

describe('Session multiple channels', () => {
  const credentials = {
    serverUrl: 'wss://zellowork.io/ws/example',
    username: 'kiosk',
    password: 'secret'
  };

  it('still requires one channel when no subscription list is given', () => {
    expect(() => {
      Session.validateInitialOptions(credentials);
    }).toThrow(Constants.ERROR_NOT_ENOUGH_PARAMS);
  });

  it('accepts a single channel', () => {
    expect(() => {
      Session.validateInitialOptions(Object.assign({ channel: 'Front' }, credentials));
    }).not.toThrow();
  });

  it('accepts a subscription list without a single channel', () => {
    expect(() => {
      Session.validateInitialOptions(Object.assign({
        subscribedChannels: ['Front', 'Back']
      }, credentials));
    }).not.toThrow();
  });

  it('rejects an empty subscription list', () => {
    expect(() => {
      Session.validateInitialOptions(Object.assign({
        subscribedChannels: []
      }, credentials));
    }).toThrow(Constants.ERROR_NOT_ENOUGH_PARAMS);
  });

  it('logs on with channels and leaves the single channel off the command', () => {
    const names = ['Front', 'Back'];
    const session = bareSession({
      subscribedChannels: names,
      channel: ''
    });
    session.doLogon();
    expect(session.sent[0].channels).toEqual(['Front', 'Back']);
    expect(session.sent[0].channel).toBeUndefined();
    names.push('Side');
    expect(session.sent[0].channels).toEqual(['Front', 'Back']);
  });

  it('logs on with the single channel when there is no subscription list', () => {
    const session = bareSession({ channel: 'Front' });
    session.doLogon();
    expect(session.sent[0].channel).toBe('Front');
    expect(session.sent[0].channels).toBeUndefined();
  });

  it('does not treat one offline channel as a session failure when several are joined', () => {
    const session = bareSession({
      subscribedChannels: ['Front', 'Back'],
      channel: ''
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
    const session = bareSession({ channel: 'Front' });
    session.jsonDataHandler({
      command: 'on_channel_status',
      status: 'offline',
      error: 'not found',
      error_type: 'configuration',
      channel: 'Front'
    });
    expect(session.channelConfigurationError).toBe(true);
  });

  it('stamps the selected channel onto a text message only while several channels are joined', () => {
    const multi = bareSession({
      subscribedChannels: ['Front', 'Back'],
      channel: 'Back'
    });
    multi.sendTextMessage({ text: 'help' });
    expect(multi.sent[0].channel).toBe('Back');

    const single = bareSession({ channel: 'Front' });
    single.sendTextMessage({ text: 'help' });
    expect(single.sent[0].channel).toBeUndefined();
  });
});

describe('OutgoingMessage channel routing', () => {
  const startMessage = (options) => {
    const message = Object.create(OutgoingMessage.prototype);
    message.options = Object.assign({
      encoderSampleRate: 16000,
      encoderFrameSize: 60
    }, options);
    message.instanceOptions = {};
    message.userCallback = null;
    message.startRecording = () => {};
    message.destroy = () => {};
    message.currentMessageId = 9;
    message.session = {
      startStream: jest.fn(() => Promise.resolve({ stream_id: 9 })),
      stopStream: jest.fn()
    };
    return message;
  };

  it('names the channel on start and stop only for a multi-channel session', async () => {
    const multi = startMessage({
      subscribedChannels: ['Front', 'Back'],
      channel: 'Back'
    });
    multi.start();
    await Promise.resolve();
    expect(multi.session.startStream.mock.calls[0][0].channel).toBe('Back');
    multi.stop();
    expect(multi.session.stopStream.mock.calls[0][0].channel).toBe('Back');

    const single = startMessage({ channel: 'Front' });
    single.start();
    await Promise.resolve();
    expect(single.session.startStream.mock.calls[0][0].channel).toBeUndefined();
    single.stop();
    expect(single.session.stopStream.mock.calls[0][0].channel).toBeUndefined();
  });
});

describe('IncomingMessage channel', () => {
  it('keeps the Zello channel name off the audio channel count', () => {
    const message = new IncomingMessage({
      stream_id: 4,
      channel: 'Back',
      codec_header: codecHeader
    }, {
      log: () => {},
      options: {
        subscribedChannels: ['Front', 'Back'],
        channels: 1
      }
    });
    expect(message.channel).toBe('Back');
    expect(message.options.channels).toBe(1);
  });
});
