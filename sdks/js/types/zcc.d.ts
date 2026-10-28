// Type declarations for the Zello Channel API JS SDK (the `ZCC` global the
// UMD bundles register, loaded with `ZCC.Sdk.init`). They mirror
// src/classes; keep them in step with the JSDoc there.

export as namespace ZCC;
export = ZCC;

declare namespace ZCC {
  // SDK functions take an optional Node-style callback and also return a promise.
  type Callback<T = unknown> = (err: unknown, result?: T) => void;

  interface Emitter {
    on(event: string | string[], listener: (...args: any[]) => void): this;
    once(event: string | string[], listener: (...args: any[]) => void): this;
    off(event: string | string[], listener: (...args: any[]) => void): this;
    onAny(listener: (event: string | string[], ...args: any[]) => void): this;
    removeAllListeners(event?: string | string[]): this;
  }

  // ---- Sdk --------------------------------------------------------------

  interface SdkInitOptions {
    player?: boolean | PlayerConstructor;
    decoder?: boolean | DecoderConstructor;
    recorder?: boolean | RecorderConstructor;
    encoder?: boolean | EncoderConstructor;
    widget?: boolean;
    enableLogging?: boolean;
  }

  const Sdk: {
    init(options?: SdkInitOptions, callback?: (err?: unknown) => void): Promise<void>;
    initOptions: SdkInitOptions;
  };

  // ---- Session ----------------------------------------------------------

  interface SessionOptions {
    serverUrl: string;
    username?: string;
    password?: string;
    authToken?: string;
    tokenVersion?: string;
    /** The default channel for outgoing messages; one of `channels` when both are set. */
    channel?: string;
    /** Every channel the session joins (Zello Work only). */
    channels?: string[];
    listenOnly?: boolean;
    maxConnectAttempts?: number;
    connectRetryTimeoutMs?: number;
    connectTimeoutMs?: number;
    autoSendAudio?: boolean;
    noPersistentPlayer?: boolean;
    /** Keep incoming voice silent while still raising its events; for a session that only sends. */
    muteIncomingAudio?: boolean;
    platformName?: string;
    platformType?: string;
    language?: string;
    features?: Record<string, boolean>;
    clientPing?: { intervalMs: number; consecutiveMissedPongsThreshold: number };
    enableLogging?: boolean;
    player?: PlayerConstructor;
    decoder?: DecoderConstructor;
    recorder?: RecorderConstructor;
    encoder?: EncoderConstructor;
    encoderSampleRate?: number;
    encoderFrameSize?: number;
    encoderApplication?: number;
  }

  interface ChannelStatus {
    command: 'on_channel_status';
    channel: string;
    status: 'online' | 'offline';
    users_online?: number;
    images_supported?: boolean;
    texting_supported?: boolean;
    locations_supported?: boolean;
    error?: string;
    error_type?: string;
  }

  interface StreamStartData {
    stream_id: number;
    channel: string;
    from: string;
    for?: string | false;
    call_id?: number;
    message_id?: number;
    language?: string;
    packet_duration?: number;
  }

  interface TextMessageEvent {
    channel: string;
    from: string;
    for?: string | false;
    message_id: number;
    text: string;
    call_id?: number;
  }

  interface LocationEvent {
    channel: string;
    from: string;
    for?: string | false;
    message_id: number;
    latitude: number;
    longitude: number;
    accuracy?: number;
    formatted_address?: string;
  }

  interface TranscriptionEvent {
    stream_id?: number;
    text: string;
    confidence?: number;
    sender?: string;
    language?: string;
    truncated?: boolean;
    translations?: { language: string; message: string }[];
  }

  interface DispatchCallStatusEvent {
    channel: string;
    status: 'received' | 'taken' | 'ended';
    call_id: number;
    dispatcher?: string;
    dispatcher_display_name?: string;
    dispatcher_profile_picture?: string;
  }

  interface DispatchMessage {
    message_id: number;
    type: string;
    author: string;
    ts: number;
    packet_duration?: number;
  }

  interface DispatchCall {
    id: number;
    user: string;
    status: 'pending' | 'active';
    dispatcher?: string;
    initiator?: string;
    messages?: DispatchMessage[];
  }

  interface TargetOptions {
    channel?: string;
    for?: string;
    call_id?: number;
    broadcast?: boolean;
  }

  interface StreamStartOptions extends TargetOptions {
    type: 'audio';
    codec: 'opus';
    codec_header: string;
    packet_duration: number;
    talk_priority?: number;
  }

  interface StreamStartResult {
    stream_id: number;
  }

  interface Session extends Emitter {
    readonly options: SessionOptions & { channels: string[] };
    /** Whether every joined channel has reported a status since logon. */
    readonly channelsReady: boolean;
    readonly activeOutgoingMessage: OutgoingMessage | null;
    connect(callback?: Callback): Promise<unknown>;
    disconnect(): void;
    /** The last `on_channel_status` for a joined channel, or `undefined` before the first. */
    getChannelStatus(channel: string): ChannelStatus | undefined;
    /** Resolves with `channelsReady` once every channel reports, on timeout, or on disconnect. */
    whenChannelsReady(timeoutMs?: number): Promise<boolean>;
    resolveChannel(explicitChannel?: string): string;
    startVoiceMessage(options?: VoiceMessageOptions, callback?: Callback<VoiceMessageStartResult>): OutgoingMessage;
    startStream(options: StreamStartOptions, callback?: Callback<StreamStartResult>): Promise<StreamStartResult>;
    stopStream(options: { stream_id: number; channel?: string }, callback?: Callback): Promise<unknown>;
    sendBinary(packet: Uint8Array): void;
    sendTextMessage(options: TargetOptions & { text: string }, callback?: Callback): Promise<unknown>;
    sendLocation(
      options: TargetOptions & { latitude: number; longitude: number; accuracy?: number; formatted_address?: string },
      callback?: Callback
    ): Promise<unknown>;
    sendImage(options?: ImageOptions, onError?: (err: unknown) => void): OutgoingImage;
    getDispatchCalls(channel?: string, callback?: Callback<{ calls?: DispatchCall[] }>): Promise<{ calls?: DispatchCall[] }>;
    getDispatchCalls(callback: Callback<{ calls?: DispatchCall[] }>): Promise<{ calls?: DispatchCall[] }>;
    takeDispatchCall(callId: number, channel?: string, callback?: Callback): Promise<unknown>;
    takeDispatchCall(callId: number, callback: Callback): Promise<unknown>;
    endDispatchCall(callId: number, channel?: string, callback?: Callback): Promise<unknown>;
    endDispatchCall(callId: number, callback: Callback): Promise<unknown>;
    playDispatchMessage(callId: number, messageId: number, channel?: string, callback?: Callback): Promise<unknown>;
    playDispatchMessage(callId: number, messageId: number, callback: Callback): Promise<unknown>;
    stopDispatchMessage(callback?: Callback): Promise<unknown>;
  }

  const Session: {
    new (options: SessionOptions): Session;
    prepareChannels(options: SessionOptions): { channel?: string; channels: string[] };
  };

  // ---- Outgoing voice ---------------------------------------------------

  interface VoiceMessageOptions {
    /** One channel; the session default when omitted and `channels` is not given. */
    channel?: string;
    /** Several channels of the session: one stream each, the same audio to all. */
    channels?: string[];
    for?: string;
    callId?: number;
    broadcast?: boolean;
    talkPriority?: number;
    username?: string;
    retransmissionInterval?: number;
    retransmissionDuration?: number;
    autoStart?: boolean;
    /**
     * Runs once the server has accepted the stream; recording waits for the returned promise to
     * settle, so a ready-to-send sound played here is not recorded. A rejection still records.
     */
    beforeRecording?: (result: VoiceMessageStartResult) => Promise<unknown> | unknown;
    /** A recorder constructor, or a ready-made instance such as a `ReplayRecorder` holding audio to send. */
    recorder?: RecorderConstructor | Recorder | false;
    encoder?: EncoderConstructor | false;
    recorderSampleRate?: number;
    encoderSampleRate?: number;
    encoderFrameSize?: number;
    encoderApplication?: number;
    recordingGain?: number;
    monitorGain?: number;
    mediaConstraints?: MediaStreamConstraints;
  }

  /** Per channel: the stream the server opened, or why it refused. */
  type ChannelStreamResults = Record<string, { stream_id: number; error?: unknown } | { error: unknown }>;

  interface VoiceMessageStartResult {
    /** The first accepted stream id. */
    stream_id: number;
    streams: ChannelStreamResults;
  }

  interface VoiceMessageStopResult {
    /** The first accepted stream id, or null when no channel had accepted before the stop. */
    stream_id: number | null;
    streams: ChannelStreamResults;
  }

  interface OutgoingStream {
    channel: string;
    streamId: number;
    packetId: number;
    ended: boolean;
  }

  interface OutgoingMessage extends Emitter {
    /** The first accepted stream id. */
    readonly currentMessageId: number | null;
    /** One entry per channel that accepted the stream. */
    readonly streams: ReadonlyArray<Readonly<OutgoingStream>>;
    readonly recorder?: Recorder;
    start(): Promise<VoiceMessageStartResult>;
    stop(callback?: Callback<VoiceMessageStopResult>): Promise<VoiceMessageStopResult>;
    resolveChannels(): string[];
  }

  const OutgoingMessage: {
    readonly talkPriorityLow: number;
    readonly talkPriorityNormal: number;
  };

  // ---- Incoming voice ---------------------------------------------------

  interface IncomingMessage extends Emitter {
    readonly streamId: number;
    readonly channel: string;
    readonly instanceId: string;
    readonly options: { messageData: StreamStartData; sampleRate?: number } & Record<string, unknown>;
    readonly isPlaybackComplete?: boolean;
    init(): Promise<void>;
    mute(isMuted: boolean): void;
    stopPlayback(isComplete?: boolean): void;
  }

  const IncomingMessage: {
    PersistentPlayer: Player | undefined;
    detectSampleRate(codecSampleRate: number): number;
  };

  // ---- Images -----------------------------------------------------------

  interface ImageOptions {
    channel?: string;
    for?: string;
    /** Set to false to send without previewing. */
    preview?: boolean;
    file?: File;
  }

  interface ImageEventData {
    channel: string;
    from: string;
    for?: string | false;
    message_id: number;
    width?: number;
    height?: number;
    source?: string;
    type?: string;
  }

  interface OutgoingImage extends Emitter {
    send(): Promise<unknown> | void;
  }

  interface IncomingImage extends Emitter {
    readonly channel: string;
    readonly instanceId: number;
    readonly messageData: ImageEventData;
  }

  // ---- Audio pipeline ---------------------------------------------------

  /** Captures PCM for an outgoing message; a custom one implements this shape. */
  interface Recorder {
    /** On an instance given to `startVoiceMessage`: receives the message options and encoder before `init()`. */
    attach?(options: Record<string, unknown>, encoder: Pick<Encoder, 'postMessage'>): void;
    init(): Promise<void> | void;
    start(): void;
    stop(): void;
    getSampleRate?(): number;
    setRecordingGain?(gain: number): void;
    setMonitorGain?(gain: number): void;
    changeInputDevice?(deviceId: string): Promise<void>;
    pause?(): void;
    resume?(): void;
    /** Called with one buffer per channel when PCM is ready. */
    ondata: (buffers: Float32Array[]) => void;
    onready: () => void;
    /** Called when the input is exhausted (a replay); ends the message. */
    onend?: () => void;
    onprogress?: (sentMs: number, totalMs: number) => void;
  }

  interface RecorderConstructor {
    new (options: Record<string, unknown>, encoder: Pick<Encoder, 'postMessage'>): Recorder;
    isRecordingSupported?(): boolean;
  }

  const Recorder: RecorderConstructor & {
    isRecordingSupported(): boolean;
    getAudioContext(): typeof AudioContext | undefined;
  };

  /** Plays back PCM already in memory at real-time pace; pass an instance as the message's `recorder`. */
  interface ReplayRecorder extends Recorder {
    attach(options: Record<string, unknown>, encoder: Pick<Encoder, 'postMessage'>): void;
    readonly durationMs: number;
    readonly position: number;
    getSampleRate(): number;
  }

  const ReplayRecorder: {
    /** @param samples mono PCM in the -1..1 range @param sampleRate the rate the samples were captured at */
    new (samples: Float32Array, sampleRate: number): ReplayRecorder;
    isRecordingSupported(): boolean;
  };

  interface Encoder extends Emitter {
    encode(buffers: Float32Array[]): void;
    postMessage(message: object): void;
    destroy(): void;
    ondata: (data: Uint8Array | Uint8Array[]) => void;
    ondone: () => void;
  }

  interface EncoderConstructor {
    new (): Encoder;
  }

  const Encoder: EncoderConstructor;

  interface Decoder {
    decode(data: Uint8Array): void;
    destroy(): void;
  }

  interface DecoderConstructor {
    new (options: Record<string, unknown>): Decoder;
  }

  const Decoder: DecoderConstructor;

  interface PlayerOptions {
    encoding?: string;
    sampleRate?: number;
    channels?: number;
    flushingTime?: number;
  }

  interface Player {
    feed(data: Float32Array | ArrayBufferView, trackId?: string): void;
    setGain(gain: number): boolean | undefined;
    setSinkId(deviceId: string): void;
    setSampleRate(sampleRate: number, trackId?: string): void;
    setOnEnded(callback: (() => void) | null): void;
    setFlushingTime(flushingTime: number): void;
    resume(): Promise<void>;
    mute(isMuted: boolean, trackId?: string): void;
    endTrack(trackId: string): void;
    reset(trackId?: string): void;
    destroy(): void;
  }

  interface PlayerConstructor {
    new (options?: PlayerOptions, onEnded?: () => void): Player;
  }

  const Player: PlayerConstructor;

  // ---- Constants: event names and server errors ---------------------------

  const Constants: {
    readonly EVENT_ERROR: 'error';
    readonly EVENT_STATUS: 'status';
    readonly EVENT_SESSION_START_CONNECT: 'session_start_connect';
    readonly EVENT_SESSION_CONNECT: 'session_connect';
    readonly EVENT_SESSION_FAIL_CONNECT: 'session_fail_connect';
    readonly EVENT_SESSION_CONNECTION_LOST: 'session_connection_lost';
    readonly EVENT_SESSION_DISCONNECT: 'session_disconnect';
    readonly EVENT_INCOMING_VOICE_WILL_START: 'incoming_voice_will_start';
    readonly EVENT_INCOMING_VOICE_DID_START: 'incoming_voice_did_start';
    readonly EVENT_INCOMING_VOICE_DID_STOP: 'incoming_voice_did_stop';
    readonly EVENT_INCOMING_VOICE_DID_STOP_PLAYBACK: 'incoming_voice_did_stop_playback';
    readonly EVENT_INCOMING_VOICE_FAIL_START: 'incoming_voice_fail_start';
    readonly EVENT_OUTGOING_VOICE_DID_STOP: 'outgoing_voice_did_stop';
    readonly EVENT_STREAM_STARTED: 'stream_started';
    readonly EVENT_STREAM_FAILED: 'stream_failed';
    readonly EVENT_STREAM_ENDED: 'stream_ended';
    readonly EVENT_STOPPED: 'stopped';
    readonly EVENT_STOP_FAILED: 'stop_failed';
    readonly EVENT_REPLAY_PROGRESS: 'replay_progress';
    readonly EVENT_INCOMING_VOICE_DATA: 'incoming_voice_data';
    readonly EVENT_INCOMING_VOICE_DATA_DECODED: 'incoming_voice_data_decoded';
    readonly EVENT_DATA: 'data';
    readonly EVENT_DATA_ENCODED: 'data_encoded';
    readonly EVENT_ENCODER_DONE: 'encoder_done';
    readonly EVENT_INCOMING_TEXT_MESSAGE: 'incoming_text_message';
    readonly EVENT_INCOMING_LOCATION: 'incoming_location';
    readonly EVENT_INCOMING_IMAGE: 'incoming_image';
    readonly EVENT_INCOMING_IMAGE_DATA: 'incoming_image_data';
    readonly EVENT_DISPATCH_CALL_STATUS: 'dispatch_call_status';
    readonly EVENT_TRANSCRIPTION: 'transcription';
    readonly ERROR_NOT_ENOUGH_PARAMS: string;
    readonly ERROR_CHANNEL_NOT_IN_LIST: string;
    readonly ERROR_INVALID_SERVER_PROTOCOL: string;
    readonly ERROR_UNSUPPORTED: string;
    readonly ERROR_SESSION_FAIL_CONNECT: string;
    readonly TALK_PRIORITY_VALUE_LOW: number;
    readonly TALK_PRIORITY_VALUE_NORMAL: number;
    readonly [key: string]: string | number;
  };

  /** Events a session raises, with their listener signatures. */
  interface SessionEvents {
    status: (status: ChannelStatus) => void;
    error: (error: string) => void;
    session_start_connect: () => void;
    session_connect: () => void;
    session_fail_connect: (error?: string) => void;
    session_connection_lost: (reason?: string) => void;
    session_disconnect: (error?: string) => void;
    incoming_voice_will_start: (message: IncomingMessage) => void;
    incoming_voice_did_start: (message: IncomingMessage) => void;
    incoming_voice_did_stop: (message: IncomingMessage) => void;
    incoming_voice_fail_start: (message: IncomingMessage, error: unknown) => void;
    outgoing_voice_did_stop: (streamId: number, channel?: string) => void;
    incoming_text_message: (message: TextMessageEvent) => void;
    incoming_location: (location: LocationEvent) => void;
    incoming_image: (image: IncomingImage) => void;
    transcription: (transcription: TranscriptionEvent) => void;
    dispatch_call_status: (status: DispatchCallStatusEvent) => void;
  }

  /** Events an outgoing message raises. */
  interface OutgoingMessageEvents {
    data: (pcm: Float32Array[]) => void;
    data_encoded: (packet: Uint8Array) => void;
    stream_started: (channel: string, streamId: number) => void;
    stream_failed: (channel: string, error: unknown) => void;
    stream_ended: (channel: string, streamId: number) => void;
    /** The streams are closed; also fires when the message stopped itself after a replay. */
    stopped: (result: VoiceMessageStopResult) => void;
    stop_failed: (error: unknown) => void;
    replay_progress: (sentMs: number, totalMs: number) => void;
  }
}

declare global {
  interface Window {
    ZCC: typeof ZCC;
  }
}
