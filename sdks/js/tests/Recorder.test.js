/**
 * Tests for the streamGeneration teardown-race fix in Recorder.
 *
 * Loads the webpack-built dist bundle so `import.meta.url` in
 * src/classes/recorder.js (a webpack-magic construct) is already
 * resolved. Run `npm run build` first if dist is stale. The
 * `self` reference in the UMD wrapper is provided by Jest's jsdom
 * test environment.
 */

// The dist UMD wrapper auto-detects publicPath from document.currentScript
// or the last script tag, neither of which exist in jsdom. Stub one before
// requiring so module init does not throw "Automatic publicPath is not
// supported in this browser". webpack >= 5.9x also checks tagName to skip
// SVG script elements, so the stub needs it too.
Object.defineProperty(document, 'currentScript', {
  value: { tagName: 'SCRIPT', src: 'http://localhost/zcc.recorder.js' },
  configurable: true
});

const Recorder = require('../dist/zcc.recorder.js');

class MockAudioParam {
  constructor() {
    this.setTargetAtTime = jest.fn();
  }
}

class MockGainNode {
  constructor() {
    this.gain = new MockAudioParam();
    this.connect = jest.fn();
    this.disconnect = jest.fn();
  }
}

class MockScriptProcessorNode {
  constructor() {
    this.onaudioprocess = null;
    this.connect = jest.fn();
    this.disconnect = jest.fn();
  }
}

class MockMediaStreamSourceNode {
  constructor() {
    this.channelCount = 1;
    this.numberOfOutputs = 1;
    this.connect = jest.fn();
    this.disconnect = jest.fn();
  }
}

class MockAudioContext {
  constructor() {
    this.destination = {};
    this.currentTime = 0;
    this.sampleRate = 48000;
    this.close = jest.fn().mockResolvedValue(undefined);
    this.createScriptProcessor = jest.fn(() => new MockScriptProcessorNode());
    this.createGain = jest.fn(() => new MockGainNode());
    this.createMediaStreamSource = jest.fn(() => new MockMediaStreamSourceNode());
  }
}

class MockMediaStreamTrack {
  constructor() { this.stop = jest.fn(); }
}

class MockMediaStream {
  constructor(trackCount = 1) {
    this.tracks = [];
    for (let i = 0; i < trackCount; i++) {
      this.tracks.push(new MockMediaStreamTrack());
    }
  }
  getTracks() { return this.tracks; }
}

class MockEncoder {
  constructor() { this.postMessage = jest.fn(); }
}

function installGlobals() {
  let resolveFn = () => {};
  let rejectFn = () => {};
  let calls = 0;
  const promise = new Promise((res, rej) => { resolveFn = res; rejectFn = rej; });

  global.AudioContext = MockAudioContext;
  global.webkitAudioContext = MockAudioContext;
  global.WebAssembly = global.WebAssembly || {};

  Object.defineProperty(global.navigator, 'mediaDevices', {
    value: {
      getUserMedia: jest.fn(() => { calls++; return promise; })
    },
    configurable: true
  });

  return {
    promise,
    resolve: (s) => resolveFn(s),
    reject: (e) => rejectFn(e),
    callCount: () => calls
  };
}

async function flushMicrotasks(rounds = 4) {
  for (let i = 0; i < rounds; i++) {
    await Promise.resolve();
  }
}

function makeRecorder() {
  return new Recorder(
    {
      useScriptProcessorRecorder: true,
      bufferLength: 4096,
      numberOfChannels: 1,
      mediaConstraints: { audio: true }
    },
    new MockEncoder()
  );
}

describe('Recorder teardown race', () => {
  afterEach(() => { jest.restoreAllMocks(); });

  test('init() rejects with RecorderTornDown when clearStream() fires mid-flight', async () => {
    const gum = installGlobals();
    const stream = new MockMediaStream();
    const recorder = makeRecorder();

    const initPromise = recorder.init();
    await flushMicrotasks();
    expect(gum.callCount()).toBe(1);

    recorder.clearStream();
    gum.resolve(stream);

    await expect(initPromise).rejects.toMatchObject({ code: 'RecorderTornDown' });
    expect(stream.getTracks()[0].stop).toHaveBeenCalledTimes(1);
  });

  test('changeInputDevice() rejects with RecorderTornDown when teardown wins mid-flight', async () => {
    const gum = installGlobals();
    const stream = new MockMediaStream();
    const recorder = makeRecorder();

    recorder.audioContext = new MockAudioContext();
    recorder.sourceNode = new MockMediaStreamSourceNode();
    recorder.recordingGainNode = new MockGainNode();
    recorder.monitorGainNode = new MockGainNode();
    recorder.scriptProcessorNode = new MockScriptProcessorNode();
    recorder.state = 'recording';

    const changePromise = recorder.changeInputDevice('device-xyz');
    await flushMicrotasks();
    expect(gum.callCount()).toBe(1);

    recorder.clearStream();
    gum.resolve(stream);

    await expect(changePromise).rejects.toMatchObject({ code: 'RecorderTornDown' });
    expect(stream.getTracks()[0].stop).toHaveBeenCalledTimes(1);
  });

  test('changeInputDevice() resolves to a promise when not recording', async () => {
    installGlobals();
    const recorder = makeRecorder();
    recorder.state = 'inactive';

    const result = recorder.changeInputDevice('device-xyz');

    expect(typeof result.then).toBe('function');
    await expect(result).resolves.toBeUndefined();
  });

  test('init() succeeds without stopping tracks when no teardown fires', async () => {
    const gum = installGlobals();
    const stream = new MockMediaStream();
    const recorder = makeRecorder();

    const initPromise = recorder.init();
    gum.resolve(stream);
    await initPromise;

    expect(stream.getTracks()[0].stop).not.toHaveBeenCalled();
    expect(recorder.state).toBe('ready');
    expect(recorder.sourceNode.connect).not.toHaveBeenCalled();
  });
});

describe('Recorder start/stop lifecycle', () => {
  afterEach(() => { jest.restoreAllMocks(); });

  async function initRecorder() {
    const gum = installGlobals();
    const stream = new MockMediaStream();
    const recorder = makeRecorder();
    recorder.onready = jest.fn();

    const initPromise = recorder.init();
    gum.resolve(stream);
    await initPromise;

    return { recorder, stream };
  }

  test('init() calls onready and leaves the recorder ready without connecting the source', async () => {
    const { recorder } = await initRecorder();

    expect(recorder.onready).toHaveBeenCalledTimes(1);
    expect(recorder.state).toBe('ready');
    expect(recorder.sourceNode.connect).not.toHaveBeenCalled();
  });

  test('start() after init connects the source to both gain nodes and enters recording', async () => {
    const { recorder } = await initRecorder();

    recorder.start();

    expect(recorder.state).toBe('recording');
    expect(recorder.sourceNode.connect).toHaveBeenCalledTimes(2);
    expect(recorder.sourceNode.connect).toHaveBeenCalledWith(recorder.monitorGainNode);
    expect(recorder.sourceNode.connect).toHaveBeenCalledWith(recorder.recordingGainNode);
  });

  test('start() is a no-op once recording', async () => {
    const { recorder } = await initRecorder();

    recorder.start();
    recorder.start();

    expect(recorder.state).toBe('recording');
    expect(recorder.sourceNode.connect).toHaveBeenCalledTimes(2);
  });

  test('start() before init completes is a no-op and init still lands in ready', async () => {
    const gum = installGlobals();
    const stream = new MockMediaStream();
    const recorder = makeRecorder();

    const initPromise = recorder.init();
    await flushMicrotasks();
    recorder.start();
    expect(recorder.state).toBe('inactive');

    gum.resolve(stream);
    await initPromise;

    expect(recorder.state).toBe('ready');
    expect(recorder.sourceNode.connect).not.toHaveBeenCalled();
  });

  test('audio buffers are not emitted while ready, only while recording', async () => {
    const { recorder } = await initRecorder();
    recorder.ondata = jest.fn();
    const inputBuffer = {
      numberOfChannels: 1,
      getChannelData: () => new Float32Array(4)
    };

    // First buffer after graph init is intentionally dropped by the recorder.
    recorder.scriptProcessorNode.onaudioprocess({ inputBuffer });
    recorder.scriptProcessorNode.onaudioprocess({ inputBuffer });
    expect(recorder.ondata).not.toHaveBeenCalled();

    recorder.start();
    recorder.scriptProcessorNode.onaudioprocess({ inputBuffer });
    expect(recorder.ondata).toHaveBeenCalledTimes(1);
  });

  test('stop() from ready tears down cleanly and a later start() is a no-op', async () => {
    const { recorder, stream } = await initRecorder();
    const sourceNode = recorder.sourceNode;

    expect(() => recorder.stop()).not.toThrow();

    expect(recorder.state).toBe('inactive');
    expect(sourceNode.disconnect).toHaveBeenCalledTimes(1);
    expect(stream.getTracks()[0].stop).toHaveBeenCalledTimes(1);
    expect(recorder.encoder.postMessage).toHaveBeenCalledWith({ command: 'done' });

    recorder.start();
    expect(recorder.state).toBe('inactive');
    expect(sourceNode.connect).not.toHaveBeenCalled();
  });
});
