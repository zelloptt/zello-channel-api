const ReplayRecorder = require('../src/classes/replayRecorder');
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
    const recorder = new ReplayRecorder({ replay: { samples, sampleRate }, encoderFrameSize: frameMs }, encoder);
    const chunks = [];
    recorder.ondata = (buffers) => chunks.push(buffers[0].length);
    recorder.onready = jest.fn();
    recorder.onend = jest.fn();
    recorder.onprogress = jest.fn();
    return { recorder, encoder, chunks };
  };

  it('needs samples and a sample rate', () => {
    expect(() => new ReplayRecorder({ replay: {} }, {})).toThrow(Constants.ERROR_NOT_ENOUGH_PARAMS);
    expect(() => new ReplayRecorder({ replay: { samples: new Float32Array(0), sampleRate: 16000 } }, {}))
      .toThrow(Constants.ERROR_NOT_ENOUGH_PARAMS);
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
      const message = new OutgoingMessage(session, {
        channels: ['Front'],
        replay: { samples: pcm(640), sampleRate: 16000 }
      });
      expect(message.recorder).toBeInstanceOf(ReplayRecorder);
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
      await flush();
      expect(session.stopStream).not.toHaveBeenCalled();
      message.encoder.onceDone();
      await flush();
      expect(session.stopStream).toHaveBeenCalledWith({ stream_id: 5, channel: 'Front' });
    } finally {
      jest.useRealTimers();
      delete window.ZCC;
    }
  });
});
