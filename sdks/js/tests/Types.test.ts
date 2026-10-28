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

// Type-checked only: the ZCC global is not loaded, so the recorder is built lazily.
const replayFor = (pcm: Float32Array): ZCC.ReplayRecorder => new ZCC.ReplayRecorder(pcm, 16000);
const voiceOptionsFor = (recorder: ZCC.Recorder): ZCC.VoiceMessageOptions => ({
  channels: ['Front', 'Back'],
  recorder
});
const voiceOptions: ZCC.VoiceMessageOptions = {
  channels: ['Front', 'Back'],
  encoderFrameSize: 20,
  beforeRecording: (result) => new Promise<void>((resolve) => setTimeout(resolve, result.stream_id))
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
const stoppedListener: ZCC.OutgoingMessageEvents['stopped'] = (result) =>
  result.stream_id === null ? 0 : Object.keys(result.streams).length;

describe('types/zcc.d.ts', () => {
  it('describes the public surface the console and demo use', () => {
    expect(sessionOptions.channels).toEqual(['Front', 'Back']);
    expect(voiceOptions.encoderFrameSize).toBe(20);
    expect(typeof replayFor).toBe('function');
    expect(typeof voiceOptionsFor).toBe('function');
    expect(typeof describeSession).toBe('function');
    expect(typeof onStart).toBe('function');
    expect(statusListener({ command: 'on_channel_status', channel: 'Front', status: 'online', users_online: 3 })).toBe(3);
    expect(endedListener(7, 'Front')).toBe('7:Front');
    expect(progressListener(1, 2)).toBe(0.5);
    expect(stoppedListener({ stream_id: null, streams: {} })).toBe(0);
  });
});
