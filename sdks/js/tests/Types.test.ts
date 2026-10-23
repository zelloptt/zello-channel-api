/// <reference path="../types/zcc.d.ts" />

// Compile-time coverage of types/zcc.d.ts: ts-jest type-checks this file, so a
// declaration that drifts from the API breaks the suite. The runtime assertions
// are deliberately trivial; the ZCC global is never loaded here.

const sessionOptions: ZCC.SessionOptions = {
  serverUrl: 'wss://zellowork.io/ws/example',
  username: 'me',
  authToken: 'token',
  tokenVersion: 'ls-v1',
  channels: ['Front', 'Back'],
  muteIncomingAudio: true,
  maxConnectAttempts: 1
};

const voiceOptions: ZCC.VoiceMessageOptions = {
  channels: ['Front', 'Back'],
  replay: { samples: new Float32Array(320), sampleRate: 16000 }
};

const describeSession = (session: ZCC.Session): Promise<string[]> =>
  session
    .whenChannelsReady(4000)
    .then((ready: boolean) => (ready ? session.options.channels : []));

const onStart: ZCC.Callback<ZCC.VoiceMessageStartResult> = (err, result) => {
  if (!err && result) {
    const accepted: number = result.stream_id;
    const perChannel: ZCC.ChannelStreamResults = result.streams;
    return accepted + Object.keys(perChannel).length;
  }
  return undefined;
};

const statusListener: ZCC.SessionEvents['status'] = (status) => status.users_online;
const endedListener: ZCC.SessionEvents['outgoing_voice_did_stop'] = (streamId, channel) =>
  `${streamId}:${channel ?? ''}`;
const progressListener: ZCC.OutgoingMessageEvents['replay_progress'] = (sent, total) => sent / total;

describe('types/zcc.d.ts', () => {
  it('describes the public surface the console and demo use', () => {
    expect(sessionOptions.channels).toEqual(['Front', 'Back']);
    expect(voiceOptions.replay?.sampleRate).toBe(16000);
    expect(typeof describeSession).toBe('function');
    expect(typeof onStart).toBe('function');
    expect(statusListener({ command: 'on_channel_status', channel: 'Front', status: 'online', users_online: 3 })).toBe(3);
    expect(endedListener(7, 'Front')).toBe('7:Front');
    expect(progressListener(1, 2)).toBe(0.5);
  });
});
