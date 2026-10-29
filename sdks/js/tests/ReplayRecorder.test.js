const ReplayRecorder = require('../src/classes/replayRecorder');
const OpusReplayRecorder = require('../src/classes/opusReplayRecorder');
const OutgoingMessage = require('../src/classes/outgoingMessage');
const Constants = require('../src/classes/constants');

const pcm = (samples) => Float32Array.from({ length: samples }, (_, i) => (i % 10) / 10);
// Lets the promise chains between init, start_stream and stop settle.
const flush = async () => {
  for (let i = 0; i < 10; i++) {
    await Promise.resolve();
  }
};

describe('ReplayRecorder', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(0);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const recorderFor = (samples, sampleRate = 16000, frameMs = 20) => {
    const encoder = { postMessage: jest.fn() };
    const recorder = new ReplayRecorder(samples, sampleRate);
    recorder.attach({ encoderFrameSize: frameMs }, encoder);
    const chunks = [];
    recorder.ondata = (buffers) => {
      // Each chunk must own its buffer; a view would drag the whole recording along to the worker.
      expect(buffers[0].buffer).not.toBe(samples.buffer);
      expect(buffers[0].buffer.byteLength).toBe(buffers[0].byteLength);
      chunks.push(buffers[0].length);
    };
    recorder.onready = jest.fn();
    recorder.onend = jest.fn();
    recorder.onprogress = jest.fn();
    return { recorder, encoder, chunks };
  };

  it('needs samples and a sample rate', () => {
    expect(() => new ReplayRecorder()).toThrow(Constants.ERROR_NOT_ENOUGH_PARAMS);
    expect(() => new ReplayRecorder(new Float32Array(0), 16000)).toThrow(Constants.ERROR_NOT_ENOUGH_PARAMS);
    expect(() => new ReplayRecorder(pcm(320), 0)).toThrow(Constants.ERROR_NOT_ENOUGH_PARAMS);
  });

  it('reports ready, then hands over one frame per frame interval and ends', async () => {
    // 1000 samples at 16 kHz and 20 ms frames: three 320-sample frames and a 40-sample tail
    const { recorder, encoder, chunks } = recorderFor(pcm(1000));
    await recorder.init();
    expect(recorder.onready).toHaveBeenCalledTimes(1);
    expect(recorder.getSampleRate()).toBe(16000);
    expect(recorder.durationMs).toBe(62.5);

    recorder.start();
    expect(chunks).toEqual([320]);
    jest.advanceTimersByTime(20);
    expect(chunks).toEqual([320, 320]);
    jest.advanceTimersByTime(20);
    expect(chunks).toEqual([320, 320, 320]);
    expect(recorder.onend).not.toHaveBeenCalled();
    jest.advanceTimersByTime(20);
    expect(chunks).toEqual([320, 320, 320, 40]);
    expect(encoder.postMessage).toHaveBeenCalledWith({ command: 'done' });
    expect(recorder.onend).toHaveBeenCalledTimes(1);
    expect(recorder.onprogress).toHaveBeenLastCalledWith(62.5, 62.5);
    // nothing more happens
    jest.advanceTimersByTime(200);
    expect(chunks).toHaveLength(4);
    expect(encoder.postMessage).toHaveBeenCalledTimes(1);
  });

  it('catches up on frames whose slots passed while the timer was late', async () => {
    const { recorder, chunks } = recorderFor(pcm(320 * 10));
    await recorder.init();
    recorder.start();
    expect(chunks).toHaveLength(1);
    // the 20 ms timer fires 45 ms late
    const now = jest.spyOn(Date, 'now').mockReturnValue(65);
    recorder.tick();
    now.mockRestore();
    expect(chunks).toHaveLength(4);
  });

  it('stops early without ending the message', async () => {
    const { recorder, encoder, chunks } = recorderFor(pcm(320 * 10));
    await recorder.init();
    recorder.start();
    jest.advanceTimersByTime(20);
    recorder.stop();
    jest.advanceTimersByTime(200);
    expect(chunks).toHaveLength(2);
    expect(encoder.postMessage).toHaveBeenCalledTimes(1);
    expect(recorder.onend).not.toHaveBeenCalled();
  });
});

describe('OpusReplayRecorder', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(0);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const frames = (count) => Array.from({ length: count }, (_, i) => new Uint8Array([i, i + 1]));

  it('needs frames and a frame length', () => {
    expect(() => new OpusReplayRecorder()).toThrow(Constants.ERROR_NOT_ENOUGH_PARAMS);
    expect(() => new OpusReplayRecorder([])).toThrow(Constants.ERROR_NOT_ENOUGH_PARAMS);
    expect(() => new OpusReplayRecorder([[1, 2]])).toThrow(Constants.ERROR_NOT_ENOUGH_PARAMS);
    expect(() => new OpusReplayRecorder(frames(1), 0)).toThrow(Constants.ERROR_NOT_ENOUGH_PARAMS);
  });

  it('hands the frames over as they are, one per interval, and ends', async () => {
    const recorder = new OpusReplayRecorder(frames(3), 40);
    const sent = [];
    recorder.onencoded = (frame) => sent.push(frame);
    recorder.ondata = jest.fn();
    recorder.onend = jest.fn();
    recorder.onprogress = jest.fn();
    // no encoder: the message runs without one
    recorder.attach({ encoderFrameSize: 20 }, null);
    expect(recorder.frameMs).toBe(40);
    expect(recorder.durationMs).toBe(120);
    await recorder.init();
    recorder.start();
    expect(sent).toEqual([frames(3)[0]]);
    expect(recorder.position).toBe(1);
    jest.advanceTimersByTime(40);
    expect(sent).toHaveLength(2);
    expect(recorder.onprogress).toHaveBeenLastCalledWith(80, 120);
    jest.advanceTimersByTime(40);
    expect(sent).toHaveLength(3);
    expect(recorder.ondata).not.toHaveBeenCalled();
    expect(recorder.onend).toHaveBeenCalledTimes(1);
    expect(recorder.onprogress).toHaveBeenLastCalledWith(120, 120);
    jest.advanceTimersByTime(200);
    expect(sent).toHaveLength(3);
  });

  it('stops early without ending', async () => {
    const recorder = new OpusReplayRecorder(frames(10));
    const sent = [];
    recorder.onencoded = (frame) => sent.push(frame);
    recorder.onend = jest.fn();
    await recorder.init();
    recorder.start();
    jest.advanceTimersByTime(20);
    recorder.stop();
    jest.advanceTimersByTime(200);
    expect(sent).toHaveLength(2);
    expect(recorder.onend).not.toHaveBeenCalled();
  });
});

describe('OutgoingMessage with an Opus replay', () => {
  it('sends the stored frames straight to the stream with no encoder, then stops itself', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(0);
    try {
      window.ZCC = { Sdk: { initOptions: {} }, Recorder: function Mic() {} };
      const session = {
        options: { channels: ['Front'], channel: 'Front', encoder: false, recorder: true },
        log: () => {},
        resolveChannel: () => 'Front',
        startStream: jest.fn(() => Promise.resolve({ stream_id: 9 })),
        stopStream: jest.fn(() => Promise.resolve({}))
      };
      const stored = [new Uint8Array([0xaa, 0xbb]), new Uint8Array([0xcc])];
      const replay = new OpusReplayRecorder(stored, 20);
      const message = new OutgoingMessage(session, {
        channels: ['Front'],
        encoder: false,
        encoderFrameSize: 20,
        recorder: replay
      });
      expect(message.recorder).toBe(replay);
      expect(message.encoder).toBeUndefined();
      const packets = [];
      message.on(Constants.EVENT_DATA_ENCODED, (packet) => packets.push(Array.from(packet)));
      const stopped = jest.fn();
      message.on(Constants.EVENT_STOPPED, stopped);

      await flush();
      expect(session.startStream).toHaveBeenCalledWith(
        expect.objectContaining({ channel: 'Front', packet_duration: 20 })
      );
      expect(message.started).toBe(true);
      // {type, stream_id(32), packet_id(32), frame}
      expect(packets).toEqual([[1, 0, 0, 0, 9, 0, 0, 0, 1, 0xaa, 0xbb]]);
      jest.advanceTimersByTime(20);
      expect(packets[1]).toEqual([1, 0, 0, 0, 9, 0, 0, 0, 2, 0xcc]);

      // the last frame is out: with no encoder to drain, the streams close at once
      await flush();
      expect(session.stopStream).toHaveBeenCalledWith({ stream_id: 9, channel: 'Front' });
      expect(stopped).toHaveBeenCalledWith({ stream_id: 9, streams: { Front: { stream_id: 9 } } });
    } finally {
      jest.useRealTimers();
      delete window.ZCC;
    }
  });
});

describe('OutgoingMessage with a replay', () => {
  it('uses the replay recorder and stops itself when the audio runs out', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(0);
    try {
      window.ZCC = { Sdk: { initOptions: {} }, Recorder: function Mic() {}, ReplayRecorder: ReplayRecorder };
      function Encoder() {
        this.sent = [];
      }
      Encoder.prototype.encode = function (buffers) {
        this.sent.push(buffers[0].length);
      };
      Encoder.prototype.postMessage = jest.fn();
      Encoder.prototype.destroy = jest.fn();
      Encoder.prototype.once = function (event, listener) {
        this.onceDone = listener;
      };
      const session = {
        options: { channels: ['Front'], channel: 'Front', encoder: Encoder, recorder: true },
        log: () => {},
        resolveChannel: () => 'Front',
        startStream: jest.fn(() => Promise.resolve({ stream_id: 5 })),
        stopStream: jest.fn(() => Promise.resolve({}))
      };
      const replay = new ReplayRecorder(pcm(640), 16000);
      const message = new OutgoingMessage(session, {
        channels: ['Front'],
        recorder: replay,
        encoderFrameSize: 20
      });
      // The instance is used as is, attached to the message's encoder and frame size.
      expect(message.recorder).toBe(replay);
      expect(replay.encoder).toBe(message.encoder);
      expect(replay.frameMs).toBe(20);
      // The encoder's init message carries the settings, never the pipeline objects (nor their audio).
      await flush();
      const init = Encoder.prototype.postMessage.mock.calls.find((call) => call[0].command === 'init');
      expect(init).toBeDefined();
      expect(init[0].recorder).toBeUndefined();
      expect(init[0].encoder).toBeUndefined();
      expect(init[0].encoderFrameSize).toBe(20);
      const progress = [];
      message.on(Constants.EVENT_REPLAY_PROGRESS, (sent, total) => progress.push([sent, total]));

      // init resolves, onready starts the message, the server accepts, recording starts
      await flush();
      expect(session.startStream).toHaveBeenCalledTimes(1);
      expect(message.started).toBe(true);
      expect(message.encoder.sent).toEqual([320]);
      jest.advanceTimersByTime(20);
      expect(message.encoder.sent).toEqual([320, 320]);
      expect(progress[progress.length - 1]).toEqual([40, 40]);

      // the recorder ran out: the message stops after the encoder's last frame
      // and reports the outcome through the stopped event
      const stopped = jest.fn();
      message.on(Constants.EVENT_STOPPED, stopped);
      await flush();
      expect(session.stopStream).not.toHaveBeenCalled();
      message.encoder.onceDone();
      await flush();
      expect(session.stopStream).toHaveBeenCalledWith({ stream_id: 5, channel: 'Front' });
      expect(stopped).toHaveBeenCalledWith({ stream_id: 5, streams: { Front: { stream_id: 5 } } });
    } finally {
      jest.useRealTimers();
      delete window.ZCC;
    }
  });
});
