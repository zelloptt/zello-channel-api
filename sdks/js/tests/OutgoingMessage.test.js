/**
 * Tests for how OutgoingMessage sequences the recorder lifecycle against the
 * server's start_stream handshake.
 *
 * Loads the webpack-built dist bundle. Run `npm run build` first if dist is
 * stale. The `self` reference in the UMD wrapper is provided by Jest's jsdom
 * test environment.
 */

Object.defineProperty(document, 'currentScript', {
  value: { src: 'http://localhost/zcc.outgoingmessage.js' },
  configurable: true
});

const OutgoingMessage = require('../dist/zcc.outgoingmessage.js');

// Plain methods rather than mock functions: the bundle checks `instanceof Function`,
// which is false for mocks created outside the jsdom realm.
class FakeEncoder {
  postMessage() {}
  encode() {}
  destroy() {}
}

/**
 * Mirrors the Recorder state machine: init() resolves into `ready` and calls
 * onready, start() only transitions ready -> recording.
 */
class FakeRecorder {
  constructor() {
    this.state = 'inactive';
    this.startCalls = 0;
    this.stopCalls = 0;
    FakeRecorder.instances.push(this);
  }

  init() {
    return new Promise((resolve) => {
      this.finishInit = () => {
        this.state = 'ready';
        this.onready();
        resolve();
      };
    });
  }

  start() {
    this.startCalls++;
    if (this.state === 'ready') {
      this.state = 'recording';
    }
  }

  stop() {
    this.stopCalls++;
    this.state = 'inactive';
  }

  getSampleRate() {
    return 48000;
  }
}
FakeRecorder.instances = [];

function makeSession() {
  let resolveStart = () => {};
  let rejectStart = () => {};
  const startPromise = new Promise((res, rej) => { resolveStart = res; rejectStart = rej; });
  return {
    options: {},
    log: () => {},
    startStream: jest.fn(() => startPromise),
    stopStream: jest.fn(() => Promise.resolve()),
    resolveStart: (streamId) => resolveStart({ stream_id: streamId }),
    rejectStart: (err) => rejectStart(err)
  };
}

async function flushMicrotasks(rounds = 4) {
  for (let i = 0; i < rounds; i++) {
    await Promise.resolve();
  }
}

function makeMessage(session, options) {
  return new OutgoingMessage(session, Object.assign({
    recorder: FakeRecorder,
    encoder: FakeEncoder
  }, options));
}

describe('OutgoingMessage recorder sequencing', () => {
  beforeEach(() => { FakeRecorder.instances = []; });
  afterEach(() => { jest.restoreAllMocks(); });

  test('autoStart: start_stream is sent after the recorder is ready and recording begins on the response', async () => {
    const session = makeSession();
    makeMessage(session, { autoStart: true });
    const recorder = FakeRecorder.instances[0];

    expect(session.startStream).not.toHaveBeenCalled();

    recorder.finishInit();
    await flushMicrotasks();
    expect(session.startStream).toHaveBeenCalledTimes(1);
    expect(recorder.startCalls).toBe(0);

    session.resolveStart(42);
    await flushMicrotasks();
    expect(recorder.startCalls).toBe(1);
    expect(recorder.state).toBe('recording');
  });

  test('autoStart false: recorder ready before start() stays ready until the stream is accepted', async () => {
    const session = makeSession();
    const message = makeMessage(session, { autoStart: false });
    const recorder = FakeRecorder.instances[0];

    recorder.finishInit();
    await flushMicrotasks();
    expect(session.startStream).not.toHaveBeenCalled();
    expect(recorder.startCalls).toBe(0);
    expect(recorder.state).toBe('ready');

    message.start();
    session.resolveStart(42);
    await flushMicrotasks();
    expect(recorder.state).toBe('recording');
  });

  test('autoStart false: stream accepted before the recorder is ready still starts recording once ready', async () => {
    const session = makeSession();
    const message = makeMessage(session, { autoStart: false });
    const recorder = FakeRecorder.instances[0];

    message.start();
    session.resolveStart(42);
    await flushMicrotasks();
    // Recorder.start() is a no-op before init completes.
    expect(recorder.state).toBe('inactive');

    recorder.finishInit();
    await flushMicrotasks();
    expect(recorder.state).toBe('recording');
  });

  test('autoStart false: stream rejected before the recorder is ready stops the recorder on ready', async () => {
    const session = makeSession();
    const message = makeMessage(session, { autoStart: false });
    const recorder = FakeRecorder.instances[0];

    message.start();
    session.rejectStart(new Error('not allowed'));
    await flushMicrotasks();

    recorder.finishInit();
    await flushMicrotasks();
    expect(recorder.startCalls).toBe(0);
    expect(recorder.stopCalls).toBeGreaterThan(0);
    expect(recorder.state).toBe('inactive');
  });

  test('message stopped while the recorder is ready does not start recording later', async () => {
    const session = makeSession();
    const message = makeMessage(session, { autoStart: true });
    const recorder = FakeRecorder.instances[0];

    recorder.finishInit();
    await flushMicrotasks();
    message.stop();
    session.resolveStart(42);
    await flushMicrotasks();

    expect(recorder.stopCalls).toBeGreaterThan(0);
    expect(recorder.state).toBe('inactive');
  });
});
