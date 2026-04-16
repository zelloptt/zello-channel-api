import PCMPlayer = require('../src/classes/PCMPlayer');

type PCMPlayerOptions = PCMPlayer.Options;
type OnEndedCallback = PCMPlayer.OnEndedCb;

// ---------------------------------------------------------------------------
// Web Audio API mocks
// ---------------------------------------------------------------------------

class MockAudioParam {
  value = 0;
}

class MockGainNode {
  gain = new MockAudioParam();
  connect = jest.fn();
  disconnect = jest.fn();
}

class MockAudioBuffer {
  numberOfChannels: number;
  length: number;
  sampleRate: number;
  duration: number;
  private channels: Float32Array[];

  constructor(channels: number, length: number, sampleRate: number) {
    this.numberOfChannels = channels;
    this.length = length;
    this.sampleRate = sampleRate;
    this.duration = length / sampleRate;
    this.channels = [];
    for (let i = 0; i < channels; i++) {
      this.channels.push(new Float32Array(length));
    }
  }

  getChannelData(channel: number): Float32Array {
    return this.channels[channel];
  }
}

class MockAudioBufferSourceNode {
  buffer: MockAudioBuffer | null = null;
  onended: (() => void) | null = null;
  connect = jest.fn();
  disconnect = jest.fn();
  start = jest.fn().mockImplementation(() => {
    // Trigger onended asynchronously so tests can observe it
    setTimeout(() => {
      if (this.onended) this.onended();
    }, 0);
  });
  stop = jest.fn();
}

class MockMediaStreamDestination {
  stream = { id: 'mock-stream' };
}

class MockAudioContext {
  state = 'running';
  currentTime = 0;
  destination = {};
  createGain = jest.fn().mockReturnValue(new MockGainNode());
  createBuffer = jest
    .fn()
    .mockImplementation(
      (channels: number, length: number, sampleRate: number) =>
        new MockAudioBuffer(channels, length, sampleRate)
    );
  createBufferSource = jest
    .fn()
    .mockImplementation(() => new MockAudioBufferSourceNode());
  createMediaStreamDestination = jest
    .fn()
    .mockReturnValue(new MockMediaStreamDestination());
  resume = jest.fn().mockResolvedValue(undefined);
  close = jest.fn();
}

// Install the mock AudioContext globally
(window as any).AudioContext = MockAudioContext;

// Mock HTMLMediaElement methods not implemented in jsdom
HTMLMediaElement.prototype.play = jest.fn().mockResolvedValue(undefined);
HTMLMediaElement.prototype.pause = jest.fn();

// Mock MediaStream (not available in jsdom)
class MockMediaStream {
  private tracks: Array<{ stop: jest.Mock }> = [];

  getTracks() {
    return this.tracks;
  }
}
(window as any).MediaStream = MockMediaStream;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createFloat32Samples(length: number, value = 1): Float32Array {
  const arr = new Float32Array(length);
  arr.fill(value);
  return arr;
}

function createInt16Samples(length: number, value = 16384): Int16Array {
  const arr = new Int16Array(length);
  arr.fill(value);
  return arr;
}

async function createInitializedPlayer(
  options?: PCMPlayerOptions,
  callback?: OnEndedCallback
): Promise<InstanceType<typeof PCMPlayer>> {
  const player = new PCMPlayer(options, callback);
  await player.init();
  return player;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PCMPlayer', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  // =========================================================================
  // Constructor
  // =========================================================================

  describe('constructor', () => {
    test('uses default options when none are provided', () => {
      const player = new PCMPlayer();
      expect(player).toBeDefined();
    });

    test('applies custom options', async () => {
      const player = await createInitializedPlayer({
        encoding: '16bitInt',
        channels: 2,
        sampleRate: 16000,
        flushingTime: 500,
        gain: 0.5
      });
      expect(player['audioCtx']).toBeDefined();
      player.destroy();
    });

    test('clamps invalid gain to 1', () => {
      const player = new PCMPlayer({ gain: -1 });
      expect(player['options'].gain).toBe(1);
    });

    test('clamps NaN gain to 1', () => {
      const player = new PCMPlayer({ gain: NaN });
      expect(player['options'].gain).toBe(1);
    });

    test('clamps Infinity gain to 1', () => {
      const player = new PCMPlayer({ gain: Infinity });
      expect(player['options'].gain).toBe(1);
    });

    test('clamps gain above 2 to 1', () => {
      const player = new PCMPlayer({ gain: 3 });
      expect(player['options'].gain).toBe(1);
    });

    test('accepts gain at boundaries (0 and 2)', () => {
      const playerZero = new PCMPlayer({ gain: 0 });
      expect(playerZero['options'].gain).toBe(0);

      const playerTwo = new PCMPlayer({ gain: 2 });
      expect(playerTwo['options'].gain).toBe(2);
    });

    test('stores onEnded callback', () => {
      const cb = jest.fn();
      const player = new PCMPlayer({}, cb);
      expect(player['onEndedCallback']).toBe(cb);
    });

    test('sets null callback when none provided', () => {
      const player = new PCMPlayer();
      expect(player['onEndedCallback']).toBeNull();
    });

    test('falls back to 16bitInt for unknown encoding', () => {
      const player = new PCMPlayer({ encoding: 'unknownEncoding' });
      expect(player['maxValue']).toBe(32768);
    });

    test('sets correct maxValue for each encoding', () => {
      expect(new PCMPlayer({ encoding: '8bitInt' })['maxValue']).toBe(128);
      expect(new PCMPlayer({ encoding: '16bitInt' })['maxValue']).toBe(32768);
      expect(new PCMPlayer({ encoding: '32bitInt' })['maxValue']).toBe(
        2147483648
      );
      expect(new PCMPlayer({ encoding: '32bitFloat' })['maxValue']).toBe(1);
    });
  });

  // =========================================================================
  // init()
  // =========================================================================

  describe('init', () => {
    test('creates AudioContext and GainNode', async () => {
      const player = await createInitializedPlayer();
      expect(player['audioCtx']).toBeInstanceOf(MockAudioContext);
      expect(player['gainNode']).toBeInstanceOf(MockGainNode);
      player.destroy();
    });

    test('connects gainNode to destination when useAudioElement is false', async () => {
      const player = await createInitializedPlayer({
        useAudioElement: false
      });
      const gainNode = player['gainNode'] as unknown as MockGainNode;
      expect(gainNode.connect).toHaveBeenCalledWith(
        player['audioCtx']!.destination
      );
      player.destroy();
    });

    test('creates audio element when useAudioElement is true', async () => {
      const player = await createInitializedPlayer({
        useAudioElement: true
      });
      expect(player['audioEl']).toBeInstanceOf(HTMLAudioElement);
      expect(player['mediaStreamDest']).toBeDefined();
      player.destroy();
    });

    test('sets gain value on the gain node', async () => {
      const player = await createInitializedPlayer({ gain: 0.7 });
      const gainNode = player['gainNode'] as unknown as MockGainNode;
      expect(gainNode.gain.value).toBe(0.7);
      player.destroy();
    });

    test('schedules first flush timer', async () => {
      const player = await createInitializedPlayer({ flushingTime: 200 });
      expect(player['flushTimer']).not.toBeNull();
      player.destroy();
    });

    test('does nothing if already destroyed', async () => {
      const player = new PCMPlayer();
      player.destroy();
      await player.init();
      expect(player['audioCtx']).toBeNull();
    });

    test('uses webkitAudioContext fallback', async () => {
      const originalAudioContext = (window as any).AudioContext;
      delete (window as any).AudioContext;
      (window as any).webkitAudioContext = MockAudioContext;

      const player = await createInitializedPlayer();
      expect(player['audioCtx']).toBeInstanceOf(MockAudioContext);
      player.destroy();

      (window as any).AudioContext = originalAudioContext;
      delete (window as any).webkitAudioContext;
    });

    test('sets outputDeviceId on audio element when provided', async () => {
      const player = await createInitializedPlayer({
        useAudioElement: true,
        outputDeviceId: 'device-123'
      });

      const audioEl = player['audioEl'] as any;
      expect(audioEl).toBeDefined();
      player.destroy();
    });

    test('calls resume() on AudioContext when autoResume is true', async () => {
      const player = await createInitializedPlayer({ autoResume: true });
      const ctx = player['audioCtx'] as unknown as MockAudioContext;
      expect(ctx.resume).toHaveBeenCalled();
      player.destroy();
    });

    test('does not call resume() when autoResume is false', async () => {
      const player = await createInitializedPlayer({ autoResume: false });
      const ctx = player['audioCtx'] as unknown as MockAudioContext;
      expect(ctx.resume).not.toHaveBeenCalled();
      player.destroy();
    });

    test('does not call resume() when autoResume is not set', async () => {
      const player = await createInitializedPlayer();
      const ctx = player['audioCtx'] as unknown as MockAudioContext;
      expect(ctx.resume).not.toHaveBeenCalled();
      player.destroy();
    });
  });

  // =========================================================================
  // feed()
  // =========================================================================

  describe('feed', () => {
    test('stores chunks and increments feedCounter', async () => {
      const player = await createInitializedPlayer({
        encoding: '32bitFloat'
      });
      const data = createFloat32Samples(100);
      player.feed(data);
      expect(player['chunks'].length).toBe(1);
      expect(player['totalSamples']).toBe(100);
      expect(player['feedCounter']).toBe(1);
      player.destroy();
    });

    test('accumulates multiple chunks', async () => {
      const player = await createInitializedPlayer({
        encoding: '32bitFloat'
      });
      player.feed(createFloat32Samples(50));
      player.feed(createFloat32Samples(75));
      player.feed(createFloat32Samples(25));
      expect(player['chunks'].length).toBe(3);
      expect(player['totalSamples']).toBe(150);
      expect(player['feedCounter']).toBe(3);
      player.destroy();
    });

    test('returns early when muted', async () => {
      const player = await createInitializedPlayer({
        encoding: '32bitFloat'
      });
      player.mute(true);
      player.feed(createFloat32Samples(100));
      expect(player['chunks'].length).toBe(0);
      expect(player['feedCounter']).toBe(0);
      player.destroy();
    });

    test('returns early when destroyed', async () => {
      const player = await createInitializedPlayer({
        encoding: '32bitFloat'
      });
      player.destroy();
      player.feed(createFloat32Samples(100));
      expect(player['chunks'].length).toBe(0);
    });

    test('returns early for invalid (non-typed-array) data', async () => {
      const player = await createInitializedPlayer({
        encoding: '32bitFloat'
      });
      player.feed(null as any);
      player.feed(undefined as any);
      player.feed({} as any);
      player.feed('string' as any);
      expect(player['chunks'].length).toBe(0);
      player.destroy();
    });

    test('handles 16bitInt encoding conversion', async () => {
      const player = await createInitializedPlayer({
        encoding: '16bitInt'
      });
      const data = createInt16Samples(100, 16384);
      player.feed(data);
      expect(player['chunks'].length).toBe(1);
      const chunk = player['chunks'][0];
      // 16384 / 32768 = 0.5
      expect(chunk[0]).toBeCloseTo(0.5, 5);
      player.destroy();
    });

    test('handles 8bitInt encoding conversion', async () => {
      const player = await createInitializedPlayer({
        encoding: '8bitInt'
      });
      const data = new Int8Array(10);
      data.fill(64);
      player.feed(data);
      const chunk = player['chunks'][0];
      // 64 / 128 = 0.5
      expect(chunk[0]).toBeCloseTo(0.5, 5);
      player.destroy();
    });

    test('handles 32bitFloat encoding (fast path, no division)', async () => {
      const player = await createInitializedPlayer({
        encoding: '32bitFloat'
      });
      const data = createFloat32Samples(10, 0.75);
      player.feed(data);
      const chunk = player['chunks'][0];
      expect(chunk[0]).toBeCloseTo(0.75, 5);
      player.destroy();
    });
  });

  // =========================================================================
  // flush()
  // =========================================================================

  describe('flush', () => {
    test('does nothing when there are no samples', async () => {
      const player = await createInitializedPlayer({ flushingTime: 100 });
      const ctx = player['audioCtx'] as unknown as MockAudioContext;
      jest.advanceTimersByTime(100);
      expect(ctx.createBufferSource).not.toHaveBeenCalled();
      player.destroy();
    });

    test('creates AudioBuffer and BufferSource from fed data', async () => {
      const player = await createInitializedPlayer({
        encoding: '32bitFloat',
        flushingTime: 100,
        sampleRate: 8000,
        channels: 1
      });
      player.feed(createFloat32Samples(200));
      const ctx = player['audioCtx'] as unknown as MockAudioContext;

      jest.advanceTimersByTime(100);

      expect(ctx.createBuffer).toHaveBeenCalledWith(1, 200, 8000);
      expect(ctx.createBufferSource).toHaveBeenCalled();
      player.destroy();
    });

    test('clears chunks after flushing', async () => {
      const player = await createInitializedPlayer({
        encoding: '32bitFloat',
        flushingTime: 100
      });
      player.feed(createFloat32Samples(100));
      expect(player['totalSamples']).toBe(100);

      jest.advanceTimersByTime(100);

      expect(player['chunks'].length).toBe(0);
      expect(player['totalSamples']).toBe(0);
      expect(player['feedCounter']).toBe(0);
      player.destroy();
    });

    test('connects bufferSource to gainNode', async () => {
      const player = await createInitializedPlayer({
        encoding: '32bitFloat',
        flushingTime: 100
      });
      player.feed(createFloat32Samples(200));
      const ctx = player['audioCtx'] as unknown as MockAudioContext;

      jest.advanceTimersByTime(100);

      const source = ctx.createBufferSource.mock.results[0]
        .value as MockAudioBufferSourceNode;
      expect(source.connect).toHaveBeenCalledWith(player['gainNode']);
      expect(source.start).toHaveBeenCalled();
      player.destroy();
    });

    test('invokes onended callback with feedCounter', async () => {
      jest.useRealTimers();
      const callback = jest.fn();
      const player = await createInitializedPlayer(
        { encoding: '32bitFloat', flushingTime: 50 },
        callback
      );

      player.feed(createFloat32Samples(100));
      player.feed(createFloat32Samples(100));

      player['flush']();

      await new Promise((r) => setTimeout(r, 50));

      expect(callback).toHaveBeenCalledWith(2);
      player.destroy();
    });

    test('disconnects bufferSource on ended', async () => {
      jest.useRealTimers();
      const player = await createInitializedPlayer({
        encoding: '32bitFloat',
        flushingTime: 50
      });
      player.feed(createFloat32Samples(100));

      player['flush']();

      const ctx = player['audioCtx'] as unknown as MockAudioContext;
      const source = ctx.createBufferSource.mock.results[0]
        .value as MockAudioBufferSourceNode;

      await new Promise((r) => setTimeout(r, 50));
      expect(source.disconnect).toHaveBeenCalled();
      player.destroy();
    });

    test('schedules next flush', async () => {
      const player = await createInitializedPlayer({ flushingTime: 100 });

      jest.advanceTimersByTime(100);

      expect(player['flushTimer']).not.toBeNull();
      player.destroy();
    });

    test('handles drift correction when delayMs is negative', async () => {
      const player = await createInitializedPlayer({ flushingTime: 100 });

      player['startTimestampMs'] = Date.now() - 10000;
      player['flushTimeSyncMs'] = 0;

      jest.advanceTimersByTime(100);

      expect(player['flushTimer']).not.toBeNull();
      player.destroy();
    });

    test('handles drift correction when delayMs exceeds 2x flushingTime', async () => {
      const player = await createInitializedPlayer({ flushingTime: 100 });

      player['startTimestampMs'] = Date.now() + 100000;
      player['flushTimeSyncMs'] = 200;

      jest.advanceTimersByTime(100);

      expect(player['flushTimer']).not.toBeNull();
      player.destroy();
    });

    test('does nothing after destroy', async () => {
      const player = await createInitializedPlayer({
        encoding: '32bitFloat',
        flushingTime: 100
      });
      player.feed(createFloat32Samples(100));
      player.destroy();

      player['flush']();
      expect(player['audioCtx']).toBeNull();
    });

    test('uses single-chunk fast path (no extra allocation)', async () => {
      const player = await createInitializedPlayer({
        encoding: '32bitFloat',
        flushingTime: 100,
        channels: 1
      });
      const original = createFloat32Samples(200, 0.5);
      player.feed(original);

      const concatSpy = jest.spyOn(player as any, 'concatenateChunks');
      jest.advanceTimersByTime(100);

      expect(concatSpy).toHaveBeenCalled();
      const result = concatSpy.mock.results[0].value;
      expect(result.length).toBe(200);
      player.destroy();
    });

    test('concatenates multiple chunks correctly', async () => {
      const player = await createInitializedPlayer({
        encoding: '32bitFloat',
        flushingTime: 100,
        channels: 1
      });
      player.feed(createFloat32Samples(50, 0.25));
      player.feed(createFloat32Samples(50, 0.75));

      const concatSpy = jest.spyOn(player as any, 'concatenateChunks');
      jest.advanceTimersByTime(100);

      const result = concatSpy.mock.results[0].value as Float32Array;
      expect(result.length).toBe(100);
      expect(result[0]).toBeCloseTo(0.25, 5);
      expect(result[50]).toBeCloseTo(0.75, 5);
      player.destroy();
    });

    test('handles multi-channel audio', async () => {
      const player = await createInitializedPlayer({
        encoding: '32bitFloat',
        flushingTime: 100,
        channels: 2,
        sampleRate: 8000
      });
      player.feed(createFloat32Samples(200, 0.5));

      const ctx = player['audioCtx'] as unknown as MockAudioContext;
      jest.advanceTimersByTime(100);

      expect(ctx.createBuffer).toHaveBeenCalledWith(2, 100, 8000);
      player.destroy();
    });

    test('advances startTime by buffer duration', async () => {
      const player = await createInitializedPlayer({
        encoding: '32bitFloat',
        flushingTime: 100,
        sampleRate: 8000,
        channels: 1
      });
      const initialStartTime = player['startTime'];
      player.feed(createFloat32Samples(8000));

      jest.advanceTimersByTime(100);

      expect(player['startTime']).toBeCloseTo(initialStartTime + 1, 2);
      player.destroy();
    });

    test('catches up startTime when audioCtx.currentTime has advanced', async () => {
      const player = await createInitializedPlayer({
        encoding: '32bitFloat',
        flushingTime: 100,
        sampleRate: 8000,
        channels: 1
      });
      const ctx = player['audioCtx'] as unknown as MockAudioContext;

      ctx.currentTime = 5;
      player['startTime'] = 2;

      player.feed(createFloat32Samples(100));
      jest.advanceTimersByTime(100);

      expect(player['startTime']).toBeGreaterThanOrEqual(5);
      player.destroy();
    });
  });

  // =========================================================================
  // Fade-in / fade-out
  // =========================================================================

  describe('fade-in/fade-out', () => {
    test('applies fade-in to the first 50 samples', async () => {
      const player = await createInitializedPlayer({
        encoding: '32bitFloat',
        flushingTime: 100,
        channels: 1,
        sampleRate: 8000
      });
      player.feed(createFloat32Samples(200, 1.0));

      const ctx = player['audioCtx'] as unknown as MockAudioContext;
      jest.advanceTimersByTime(100);

      const buffer = ctx.createBuffer.mock.results[0].value as MockAudioBuffer;
      const channelData = buffer.getChannelData(0);

      expect(channelData[0]).toBe(0);
      expect(channelData[25]).toBeCloseTo(0.5, 1);
      expect(channelData[50]).toBeCloseTo(1.0, 5);
      player.destroy();
    });

    test('applies fade-out to the last 51 samples', async () => {
      const player = await createInitializedPlayer({
        encoding: '32bitFloat',
        flushingTime: 100,
        channels: 1,
        sampleRate: 8000
      });
      player.feed(createFloat32Samples(200, 1.0));

      const ctx = player['audioCtx'] as unknown as MockAudioContext;
      jest.advanceTimersByTime(100);

      const buffer = ctx.createBuffer.mock.results[0].value as MockAudioBuffer;
      const channelData = buffer.getChannelData(0);

      expect(channelData[199]).toBe(0);
      expect(channelData[149]).toBeCloseTo(1.0, 1);
      player.destroy();
    });

    test('handles short buffer with overlapping fade regions', async () => {
      const player = await createInitializedPlayer({
        encoding: '32bitFloat',
        flushingTime: 100,
        channels: 1,
        sampleRate: 8000
      });
      player.feed(createFloat32Samples(60, 1.0));

      const ctx = player['audioCtx'] as unknown as MockAudioContext;
      jest.advanceTimersByTime(100);

      const buffer = ctx.createBuffer.mock.results[0].value as MockAudioBuffer;
      const channelData = buffer.getChannelData(0);

      expect(channelData[0]).toBe(0);
      expect(channelData[59]).toBe(0);
      player.destroy();
    });

    test('handles very short buffer (fewer samples than FADE_SAMPLES)', async () => {
      const player = await createInitializedPlayer({
        encoding: '32bitFloat',
        flushingTime: 100,
        channels: 1,
        sampleRate: 8000
      });
      player.feed(createFloat32Samples(10, 1.0));

      const ctx = player['audioCtx'] as unknown as MockAudioContext;
      jest.advanceTimersByTime(100);

      const buffer = ctx.createBuffer.mock.results[0].value as MockAudioBuffer;
      const channelData = buffer.getChannelData(0);

      expect(channelData[0]).toBe(0);
      expect(channelData[9]).toBeLessThan(1.0);
      expect(channelData[9]).toBeGreaterThanOrEqual(0);
      player.destroy();
    });
  });

  // =========================================================================
  // setGain()
  // =========================================================================

  describe('setGain', () => {
    test('updates gain node value', async () => {
      const player = await createInitializedPlayer({ gain: 1 });
      player.setGain(0.5);
      const gainNode = player['gainNode'] as unknown as MockGainNode;
      expect(gainNode.gain.value).toBe(0.5);
      player.destroy();
    });

    test('returns false for invalid gain', async () => {
      const player = await createInitializedPlayer({ gain: 1 });
      expect(player.setGain(-1)).toBe(false);
      expect(player.setGain(3)).toBe(false);
      expect(player.setGain(NaN)).toBe(false);
      expect(player.setGain(Infinity)).toBe(false);
      player.destroy();
    });

    test('does not change value for invalid gain', async () => {
      const player = await createInitializedPlayer({ gain: 1 });
      player.setGain(-1);
      const gainNode = player['gainNode'] as unknown as MockGainNode;
      expect(gainNode.gain.value).toBe(1);
      player.destroy();
    });

    test('works safely before init (no gainNode)', () => {
      const player = new PCMPlayer({ gain: 1 });
      player.setGain(0.5);
      expect(player['options'].gain).toBe(0.5);
    });

    test('accepts boundary values 0 and 2', async () => {
      const player = await createInitializedPlayer({ gain: 1 });
      const gainNode = player['gainNode'] as unknown as MockGainNode;

      player.setGain(0);
      expect(gainNode.gain.value).toBe(0);

      player.setGain(2);
      expect(gainNode.gain.value).toBe(2);
      player.destroy();
    });
  });

  // =========================================================================
  // setSinkId()
  // =========================================================================

  describe('setSinkId', () => {
    test('calls setSinkId on audio element', async () => {
      const player = await createInitializedPlayer({
        useAudioElement: true
      });
      const audioEl = player['audioEl'] as any;
      audioEl.setSinkId = jest.fn();

      player.setSinkId('device-456');
      expect(audioEl.setSinkId).toHaveBeenCalledWith('device-456');
      player.destroy();
    });

    test('does nothing without audio element', async () => {
      const player = await createInitializedPlayer({
        useAudioElement: false
      });
      player.setSinkId('device-456');
      player.destroy();
    });
  });

  // =========================================================================
  // setSampleRate()
  // =========================================================================

  describe('setSampleRate', () => {
    test('updates the sample rate option', () => {
      const player = new PCMPlayer({ sampleRate: 8000 });
      player.setSampleRate(16000);
      expect(player['options'].sampleRate).toBe(16000);
    });
  });

  // =========================================================================
  // setOnEnded()
  // =========================================================================

  describe('setOnEnded', () => {
    test('replaces the onEnded callback', () => {
      const initial = jest.fn();
      const next = jest.fn();
      const player = new PCMPlayer({}, initial);
      expect(player['onEndedCallback']).toBe(initial);

      player.setOnEnded(next);
      expect(player['onEndedCallback']).toBe(next);
    });

    test('clears the onEnded callback when passed null', () => {
      const initial = jest.fn();
      const player = new PCMPlayer({}, initial);

      player.setOnEnded(null);
      expect(player['onEndedCallback']).toBeNull();
    });

    test('can install a callback on a player constructed without one', () => {
      const callback = jest.fn();
      const player = new PCMPlayer();
      expect(player['onEndedCallback']).toBeNull();

      player.setOnEnded(callback);
      expect(player['onEndedCallback']).toBe(callback);
    });

    test('new callback receives subsequent buffer-ended events', async () => {
      jest.useRealTimers();
      const firstCallback = jest.fn();
      const secondCallback = jest.fn();
      const player = await createInitializedPlayer(
        { encoding: '32bitFloat', flushingTime: 50 },
        firstCallback
      );

      player.setOnEnded(secondCallback);

      player.feed(createFloat32Samples(100));
      player.feed(createFloat32Samples(100));
      player['flush']();

      await new Promise((r) => setTimeout(r, 50));

      expect(secondCallback).toHaveBeenCalledWith(2);
      expect(firstCallback).not.toHaveBeenCalled();
      player.destroy();
    });

    test('does not retarget buffers that were already scheduled', async () => {
      jest.useRealTimers();
      const firstCallback = jest.fn();
      const secondCallback = jest.fn();
      const player = await createInitializedPlayer(
        { encoding: '32bitFloat', flushingTime: 50 },
        firstCallback
      );

      player.feed(createFloat32Samples(100));
      player['flush']();

      player.setOnEnded(secondCallback);

      await new Promise((r) => setTimeout(r, 50));

      expect(firstCallback).toHaveBeenCalledWith(1);
      expect(secondCallback).not.toHaveBeenCalled();
      player.destroy();
    });
  });

  // =========================================================================
  // setFlushingTime()
  // =========================================================================

  describe('setFlushingTime', () => {
    test('updates the flushingTime option before init', () => {
      const player = new PCMPlayer({ flushingTime: 1000 });
      player.setFlushingTime(50);
      expect(player['options'].flushingTime).toBe(50);
    });

    test('does not schedule a flush timer before init', () => {
      const player = new PCMPlayer({ flushingTime: 1000 });
      player.setFlushingTime(50);
      expect(player['flushTimer']).toBeNull();
    });

    test('does not schedule while init is mid-flight (audioCtx set, gainNode not yet set)', () => {
      // Simulates the race where init() has created the AudioContext but
      // is still awaiting webAudioTouchUnlock, so gainNode is null. A
      // setFlushingTime in that window must only update the option; if it
      // also scheduled a flush timer, init() would queue a second one on
      // resume without clearing the first and drive two concurrent flush
      // loops.
      const player = new PCMPlayer({ flushingTime: 1000 });
      (player as unknown as { audioCtx: unknown }).audioCtx = {
        currentTime: 0
      };
      player.setFlushingTime(50);
      expect(player['options'].flushingTime).toBe(50);
      expect(player['flushTimer']).toBeNull();
    });

    test('ignores non-finite values', () => {
      const player = new PCMPlayer({ flushingTime: 1000 });
      player.setFlushingTime(Number.NaN);
      expect(player['options'].flushingTime).toBe(1000);
      player.setFlushingTime(Number.POSITIVE_INFINITY);
      expect(player['options'].flushingTime).toBe(1000);
    });

    test('ignores zero and negative values', () => {
      const player = new PCMPlayer({ flushingTime: 1000 });
      player.setFlushingTime(0);
      expect(player['options'].flushingTime).toBe(1000);
      player.setFlushingTime(-100);
      expect(player['options'].flushingTime).toBe(1000);
    });

    test('reschedules the pending flush timer at the new cadence', async () => {
      jest.useFakeTimers();
      const player = await createInitializedPlayer({ flushingTime: 1000 });
      const oldTimer = player['flushTimer'];
      expect(oldTimer).not.toBeNull();

      player.setFlushingTime(50);

      expect(player['flushTimer']).not.toBeNull();
      expect(player['flushTimer']).not.toBe(oldTimer);
      expect(player['options'].flushingTime).toBe(50);
      player.destroy();
      jest.useRealTimers();
    });

    test('causes subsequent flushes to fire at the new cadence', async () => {
      jest.useRealTimers();
      const callback = jest.fn();
      const player = await createInitializedPlayer(
        { encoding: '32bitFloat', flushingTime: 10000 },
        callback
      );

      player.setFlushingTime(30);

      player.feed(createFloat32Samples(100));

      await new Promise((r) => setTimeout(r, 80));

      expect(callback).toHaveBeenCalled();
      player.destroy();
    });

    test('does nothing after destroy', async () => {
      const player = await createInitializedPlayer({ flushingTime: 1000 });
      player.destroy();
      expect(() => player.setFlushingTime(50)).not.toThrow();
      expect(player['flushTimer']).toBeNull();
      expect(player['options'].flushingTime).toBe(1000);
    });
  });

  // =========================================================================
  // mute()
  // =========================================================================

  describe('mute', () => {
    test('sets muted state to true', () => {
      const player = new PCMPlayer();
      player.mute(true);
      expect(player['muted']).toBe(true);
    });

    test('sets muted state to false', () => {
      const player = new PCMPlayer();
      player.mute(true);
      player.mute(false);
      expect(player['muted']).toBe(false);
    });

    test('prevents feed from accepting data when muted', async () => {
      const player = await createInitializedPlayer({
        encoding: '32bitFloat'
      });
      player.mute(true);
      player.feed(createFloat32Samples(100));
      expect(player['totalSamples']).toBe(0);

      player.mute(false);
      player.feed(createFloat32Samples(100));
      expect(player['totalSamples']).toBe(100);
      player.destroy();
    });
  });

  // =========================================================================
  // reset()
  // =========================================================================

  describe('reset', () => {
    test('clears chunks and counters', async () => {
      const player = await createInitializedPlayer({
        encoding: '32bitFloat'
      });
      player.feed(createFloat32Samples(100));
      player.feed(createFloat32Samples(100));
      expect(player['totalSamples']).toBe(200);
      expect(player['feedCounter']).toBe(2);

      player.reset();

      expect(player['chunks'].length).toBe(0);
      expect(player['totalSamples']).toBe(0);
      expect(player['feedCounter']).toBe(0);
      player.destroy();
    });

    test('does not affect audio context or timers', async () => {
      const player = await createInitializedPlayer();
      player.reset();
      expect(player['audioCtx']).not.toBeNull();
      expect(player['flushTimer']).not.toBeNull();
      player.destroy();
    });

    test('stops and disconnects scheduled BufferSourceNodes', async () => {
      jest.useRealTimers();
      const player = await createInitializedPlayer({ encoding: '32bitFloat' });
      player.feed(createFloat32Samples(100));
      player['flush']();
      player.feed(createFloat32Samples(100));
      player['flush']();

      const ctx = player['audioCtx'] as unknown as MockAudioContext;
      const sources = ctx.createBufferSource.mock.results.map(
        (r) => r.value as MockAudioBufferSourceNode
      );
      expect(sources.length).toBe(2);

      player.reset();

      for (const source of sources) {
        expect(source.stop).toHaveBeenCalledTimes(1);
        expect(source.disconnect).toHaveBeenCalledTimes(1);
      }
      expect(player['activeSources'].size).toBe(0);
      player.destroy();
    });

    test('does not fire the onEnded callback for stopped sources', async () => {
      jest.useRealTimers();
      const callback = jest.fn();
      const player = await createInitializedPlayer(
        { encoding: '32bitFloat' },
        callback
      );
      player.feed(createFloat32Samples(100));
      player['flush']();

      player.reset();

      await new Promise((r) => setTimeout(r, 20));
      expect(callback).not.toHaveBeenCalled();
      player.destroy();
    });

    test('re-anchors startTime to audioCtx.currentTime', async () => {
      const player = await createInitializedPlayer({ encoding: '32bitFloat' });
      const ctx = player['audioCtx'] as unknown as MockAudioContext;
      ctx.currentTime = 5.5;
      player['startTime'] = 10;

      player.reset();

      expect(player['startTime']).toBe(5.5);
      player.destroy();
    });

    test('removes sources from activeSources as they end naturally', async () => {
      jest.useRealTimers();
      const player = await createInitializedPlayer({ encoding: '32bitFloat' });
      player.feed(createFloat32Samples(100));
      player['flush']();
      expect(player['activeSources'].size).toBe(1);

      await new Promise((r) => setTimeout(r, 20));

      expect(player['activeSources'].size).toBe(0);
      player.destroy();
    });
  });

  // =========================================================================
  // flush() regression: does not cancel previously-scheduled sources
  // =========================================================================

  describe('flush does not cancel previously scheduled sources', () => {
    // Guards against a regression where flush() delegated its internal
    // input-buffer clear to reset(), which also stops scheduled audio.
    // That caused every flush tick to cancel all in-flight playback, so
    // long messages (e.g. 3 s history clips) played back choppy and never
    // reached completion.
    test('back-to-back flushes leave earlier sources running', () => {
      const ctx = new MockAudioContext();
      (window as any).AudioContext = ctx.constructor as any;
      const player = new PCMPlayer({ encoding: '32bitFloat' });
      return player.init().then(() => {
        const audioCtx =
          player['audioCtx'] as unknown as MockAudioContext;

        player.feed(createFloat32Samples(100));
        player['flush']();
        const sourceA = audioCtx.createBufferSource.mock.results[0]
          .value as MockAudioBufferSourceNode;

        player.feed(createFloat32Samples(100));
        player['flush']();
        const sourceB = audioCtx.createBufferSource.mock.results[1]
          .value as MockAudioBufferSourceNode;

        expect(sourceA.stop).not.toHaveBeenCalled();
        expect(sourceB.stop).not.toHaveBeenCalled();

        player.destroy();
      });
    });
  });

  // =========================================================================
  // destroy()
  // =========================================================================

  describe('destroy', () => {
    test('clears flush timer', async () => {
      const player = await createInitializedPlayer();
      expect(player['flushTimer']).not.toBeNull();
      player.destroy();
      expect(player['flushTimer']).toBeNull();
    });

    test('closes AudioContext', async () => {
      const player = await createInitializedPlayer();
      const ctx = player['audioCtx'] as unknown as MockAudioContext;
      player.destroy();
      expect(ctx.close).toHaveBeenCalled();
      expect(player['audioCtx']).toBeNull();
    });

    test('disconnects gainNode', async () => {
      const player = await createInitializedPlayer();
      const gainNode = player['gainNode'] as unknown as MockGainNode;
      player.destroy();
      expect(gainNode.disconnect).toHaveBeenCalled();
      expect(player['gainNode']).toBeNull();
    });

    test('pauses and cleans up audio element', async () => {
      const player = await createInitializedPlayer({
        useAudioElement: true
      });
      const audioEl = player['audioEl'] as HTMLAudioElement;
      const pauseSpy = jest.spyOn(audioEl, 'pause');

      player.destroy();

      expect(pauseSpy).toHaveBeenCalled();
      expect(player['audioEl']).toBeNull();
      expect(player['mediaStreamDest']).toBeNull();
    });

    test('stops MediaStream tracks before nulling srcObject', async () => {
      const player = await createInitializedPlayer({
        useAudioElement: true
      });
      const audioEl = player['audioEl'] as HTMLAudioElement;

      const mockTrack1 = { stop: jest.fn() };
      const mockTrack2 = { stop: jest.fn() };
      const mockStream = {
        getTracks: jest.fn().mockReturnValue([mockTrack1, mockTrack2])
      };
      Object.defineProperty(audioEl, 'srcObject', {
        value: mockStream,
        writable: true
      });
      Object.setPrototypeOf(mockStream, MediaStream.prototype);

      player.destroy();

      expect(mockStream.getTracks).toHaveBeenCalled();
      expect(mockTrack1.stop).toHaveBeenCalled();
      expect(mockTrack2.stop).toHaveBeenCalled();
    });

    test('sets destroyed flag', async () => {
      const player = await createInitializedPlayer();
      expect(player['destroyed']).toBe(false);
      player.destroy();
      expect(player['destroyed']).toBe(true);
    });

    test('is idempotent (double destroy does not throw)', async () => {
      const player = await createInitializedPlayer();
      player.destroy();
      expect(() => player.destroy()).not.toThrow();
    });

    test('resets buffer state', async () => {
      const player = await createInitializedPlayer({
        encoding: '32bitFloat'
      });
      player.feed(createFloat32Samples(100));
      player.destroy();
      expect(player['chunks'].length).toBe(0);
      expect(player['totalSamples']).toBe(0);
      expect(player['feedCounter']).toBe(0);
    });

    test('resets timing state', async () => {
      const player = await createInitializedPlayer();
      player.destroy();
      expect(player['startTimestampMs']).toBe(0);
      expect(player['flushTimeSyncMs']).toBe(0);
    });

    test('safe to destroy before init', () => {
      const player = new PCMPlayer();
      expect(() => player.destroy()).not.toThrow();
    });
  });

  // =========================================================================
  // Edge cases & lifecycle
  // =========================================================================

  describe('edge cases', () => {
    test('feed before init does not throw', () => {
      const player = new PCMPlayer({ encoding: '32bitFloat' });
      expect(() => player.feed(createFloat32Samples(100))).not.toThrow();
      expect(player['totalSamples']).toBe(100);
    });

    test('flush is not scheduled before init', () => {
      const player = new PCMPlayer();
      expect(player['flushTimer']).toBeNull();
    });

    test('multiple flushes process separate batches', async () => {
      const callback = jest.fn();
      const player = await createInitializedPlayer(
        { encoding: '32bitFloat', flushingTime: 100 },
        callback
      );

      player.feed(createFloat32Samples(50));
      jest.advanceTimersByTime(100);
      expect(player['chunks'].length).toBe(0);

      player.feed(createFloat32Samples(75));
      jest.advanceTimersByTime(100);
      expect(player['chunks'].length).toBe(0);

      player.destroy();
    });

    test('feed after destroy is silently ignored', async () => {
      const player = await createInitializedPlayer({
        encoding: '32bitFloat'
      });
      player.destroy();
      player.feed(createFloat32Samples(100));
      expect(player['totalSamples']).toBe(0);
    });

    test('setGain after destroy does not throw', async () => {
      const player = await createInitializedPlayer();
      player.destroy();
      expect(() => player.setGain(0.5)).not.toThrow();
    });

    test('setSinkId after destroy does not throw', async () => {
      const player = await createInitializedPlayer({
        useAudioElement: true
      });
      player.destroy();
      expect(() => player.setSinkId('device')).not.toThrow();
    });

    test('init after destroy does not reinitialize', async () => {
      const player = await createInitializedPlayer();
      player.destroy();
      await player.init();
      expect(player['audioCtx']).toBeNull();
    });

    test('flush timer does not fire after destroy', async () => {
      const player = await createInitializedPlayer({
        encoding: '32bitFloat',
        flushingTime: 100
      });
      player.feed(createFloat32Samples(100));
      const ctx = player['audioCtx'] as unknown as MockAudioContext;
      player.destroy();

      jest.advanceTimersByTime(200);
      expect(ctx.createBufferSource).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // webAudioTouchUnlock
  // =========================================================================

  describe('webAudioTouchUnlock', () => {
    test('resolves false when context is not suspended', async () => {
      const player = new PCMPlayer();
      const ctx = new MockAudioContext() as unknown as AudioContext;
      (ctx as any).state = 'running';
      const result = await player['webAudioTouchUnlock'](ctx);
      expect(result).toBe(false);
    });

    test('resolves false when ontouchstart is not in window', async () => {
      jest.useRealTimers();
      const player = new PCMPlayer();
      const ctx = new MockAudioContext() as unknown as AudioContext;
      (ctx as any).state = 'suspended';

      const hadOntouchstart = 'ontouchstart' in window;
      if (hadOntouchstart) {
        delete (window as any).ontouchstart;
      }

      const result = await player['webAudioTouchUnlock'](ctx);
      expect(result).toBe(false);

      if (hadOntouchstart) {
        (window as any).ontouchstart = null;
      }
    });

    test('adds touch listeners and resolves true on touch when suspended', async () => {
      jest.useRealTimers();
      const player = new PCMPlayer();
      const ctx = new MockAudioContext() as unknown as AudioContext;
      (ctx as any).state = 'suspended';

      const hadOntouchstart = 'ontouchstart' in window;
      (window as any).ontouchstart = null;

      const addListenerSpy = jest.spyOn(document.body, 'addEventListener');
      const removeListenerSpy = jest.spyOn(
        document.body,
        'removeEventListener'
      );

      const unlockPromise = player['webAudioTouchUnlock'](ctx);

      expect(addListenerSpy).toHaveBeenCalledWith(
        'touchstart',
        expect.any(Function),
        false
      );
      expect(addListenerSpy).toHaveBeenCalledWith(
        'touchend',
        expect.any(Function),
        false
      );

      document.body.dispatchEvent(new Event('touchstart'));

      const result = await unlockPromise;
      expect(result).toBe(true);
      expect(ctx.resume).toHaveBeenCalled();

      expect(removeListenerSpy).toHaveBeenCalledWith(
        'touchstart',
        expect.any(Function)
      );
      expect(removeListenerSpy).toHaveBeenCalledWith(
        'touchend',
        expect.any(Function)
      );

      if (!hadOntouchstart) {
        delete (window as any).ontouchstart;
      }
      addListenerSpy.mockRestore();
      removeListenerSpy.mockRestore();
    });

    test('only resumes the context once per gesture even if both touch events fire', async () => {
      jest.useRealTimers();
      const player = new PCMPlayer();
      const ctx = new MockAudioContext() as unknown as AudioContext;
      (ctx as any).state = 'suspended';

      const hadOntouchstart = 'ontouchstart' in window;
      (window as any).ontouchstart = null;

      const unlockPromise = player['webAudioTouchUnlock'](ctx);

      document.body.dispatchEvent(new Event('touchstart'));
      document.body.dispatchEvent(new Event('touchend'));

      const result = await unlockPromise;
      expect(result).toBe(true);
      expect(ctx.resume).toHaveBeenCalledTimes(1);

      if (!hadOntouchstart) {
        delete (window as any).ontouchstart;
      }
    });

    test('cleans up touch listeners when aborted via destroy', async () => {
      jest.useRealTimers();
      const player = new PCMPlayer();
      const ctx = new MockAudioContext() as unknown as AudioContext;
      (ctx as any).state = 'suspended';

      const hadOntouchstart = 'ontouchstart' in window;
      (window as any).ontouchstart = null;

      const removeListenerSpy = jest.spyOn(
        document.body,
        'removeEventListener'
      );

      const unlockPromise = player['webAudioTouchUnlock'](ctx);

      expect(player['touchUnlockAbort']).not.toBeNull();
      player['touchUnlockAbort']!.abort();

      const result = await unlockPromise;
      expect(result).toBe(false);

      expect(removeListenerSpy).toHaveBeenCalledWith(
        'touchstart',
        expect.any(Function)
      );
      expect(removeListenerSpy).toHaveBeenCalledWith(
        'touchend',
        expect.any(Function)
      );

      if (!hadOntouchstart) {
        delete (window as any).ontouchstart;
      }
      removeListenerSpy.mockRestore();
    });

    test('destroy aborts a pending touch unlock and clears the listeners', async () => {
      jest.useRealTimers();
      const player = new PCMPlayer();
      const ctx = new MockAudioContext() as unknown as AudioContext;
      (ctx as any).state = 'suspended';

      const hadOntouchstart = 'ontouchstart' in window;
      (window as any).ontouchstart = null;

      const removeListenerSpy = jest.spyOn(
        document.body,
        'removeEventListener'
      );

      const unlockPromise = player['webAudioTouchUnlock'](ctx);
      expect(player['touchUnlockAbort']).not.toBeNull();

      player.destroy();

      const result = await unlockPromise;
      expect(result).toBe(false);
      expect(player['touchUnlockAbort']).toBeNull();
      expect(removeListenerSpy).toHaveBeenCalledWith(
        'touchstart',
        expect.any(Function)
      );
      expect(removeListenerSpy).toHaveBeenCalledWith(
        'touchend',
        expect.any(Function)
      );

      if (!hadOntouchstart) {
        delete (window as any).ontouchstart;
      }
      removeListenerSpy.mockRestore();
    });

    test('rejects when context.resume fails during touch unlock', async () => {
      jest.useRealTimers();
      const player = new PCMPlayer();
      const ctx = new MockAudioContext() as unknown as AudioContext;
      (ctx as any).state = 'suspended';
      const resumeError = new Error('resume failed');
      ctx.resume = jest.fn().mockRejectedValue(resumeError);

      const hadOntouchstart = 'ontouchstart' in window;
      (window as any).ontouchstart = null;

      const unlockPromise = player['webAudioTouchUnlock'](ctx);

      document.body.dispatchEvent(new Event('touchstart'));

      await expect(unlockPromise).rejects.toThrow('resume failed');

      if (!hadOntouchstart) {
        delete (window as any).ontouchstart;
      }
    });
  });

  // =========================================================================
  // Sample format conversion
  // =========================================================================

  describe('formatSamples', () => {
    test('32bitFloat creates a view without per-sample work', () => {
      const player = new PCMPlayer({ encoding: '32bitFloat' });
      const data = createFloat32Samples(10, 0.42);
      const result = player['formatSamples'](data);
      expect(result.buffer).toBe(data.buffer);
      expect(result[0]).toBeCloseTo(0.42, 5);
    });

    test('16bitInt converts correctly', () => {
      const player = new PCMPlayer({ encoding: '16bitInt' });
      const data = createInt16Samples(5, 32767);
      const result = player['formatSamples'](data);
      expect(result[0]).toBeCloseTo(1.0, 2);
      expect(result.length).toBe(5);
    });

    test('8bitInt converts correctly', () => {
      const player = new PCMPlayer({ encoding: '8bitInt' });
      const data = new Int8Array(5);
      data.fill(-64);
      const result = player['formatSamples'](data);
      expect(result[0]).toBeCloseTo(-0.5, 5);
    });

    test('32bitInt converts correctly', () => {
      const player = new PCMPlayer({ encoding: '32bitInt' });
      const data = new Int32Array(3);
      data.fill(1073741824);
      const result = player['formatSamples'](data);
      expect(result[0]).toBeCloseTo(0.5, 2);
    });
  });

  // =========================================================================
  // isTypedArray
  // =========================================================================

  describe('isTypedArray', () => {
    test('returns true for Float32Array', () => {
      const player = new PCMPlayer();
      expect(player['isTypedArray'](new Float32Array(10))).toBe(true);
    });

    test('returns true for Int16Array', () => {
      const player = new PCMPlayer();
      expect(player['isTypedArray'](new Int16Array(10))).toBe(true);
    });

    test('returns true for Uint8Array', () => {
      const player = new PCMPlayer();
      expect(player['isTypedArray'](new Uint8Array(10))).toBe(true);
    });

    test('returns false for null', () => {
      const player = new PCMPlayer();
      expect(player['isTypedArray'](null)).toBe(false);
    });

    test('returns false for undefined', () => {
      const player = new PCMPlayer();
      expect(player['isTypedArray'](undefined)).toBe(false);
    });

    test('returns false for plain object', () => {
      const player = new PCMPlayer();
      expect(player['isTypedArray']({})).toBe(false);
    });

    test('returns false for string', () => {
      const player = new PCMPlayer();
      expect(player['isTypedArray']('hello')).toBe(false);
    });

    test('returns false for number', () => {
      const player = new PCMPlayer();
      expect(player['isTypedArray'](42)).toBe(false);
    });
  });

  // =========================================================================
  // isValidGain
  // =========================================================================

  describe('isValidGain', () => {
    test('returns true for valid gains', () => {
      const player = new PCMPlayer();
      expect(player['isValidGain'](0)).toBe(true);
      expect(player['isValidGain'](1)).toBe(true);
      expect(player['isValidGain'](2)).toBe(true);
      expect(player['isValidGain'](0.5)).toBe(true);
    });

    test('returns false for invalid gains', () => {
      const player = new PCMPlayer();
      expect(player['isValidGain'](-0.1)).toBe(false);
      expect(player['isValidGain'](2.1)).toBe(false);
      expect(player['isValidGain'](NaN)).toBe(false);
      expect(player['isValidGain'](Infinity)).toBe(false);
      expect(player['isValidGain'](-Infinity)).toBe(false);
    });
  });

  // =========================================================================
  // createAudioElement
  // =========================================================================

  describe('createAudioElement', () => {
    test('handles play() rejection gracefully', async () => {
      const origPlay = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = jest
        .fn()
        .mockRejectedValue(new Error('Autoplay blocked'));

      const player = await createInitializedPlayer({
        useAudioElement: true
      });
      expect(player['audioEl']).toBeInstanceOf(HTMLAudioElement);
      player.destroy();

      HTMLMediaElement.prototype.play = origPlay;
    });

    test('calls setSinkId when outputDeviceId is provided and setSinkId exists', async () => {
      const mockSetSinkId = jest.fn();
      const OrigAudio = window.Audio;
      (window as any).Audio = function () {
        const el = new OrigAudio();
        (el as any).setSinkId = mockSetSinkId;
        return el;
      };

      const player = await createInitializedPlayer({
        useAudioElement: true,
        outputDeviceId: 'speaker-42'
      });

      expect(mockSetSinkId).toHaveBeenCalledWith('speaker-42');
      player.destroy();

      (window as any).Audio = OrigAudio;
    });

    test('does not call setSinkId when outputDeviceId is not provided', async () => {
      const mockSetSinkId = jest.fn();
      const OrigAudio = window.Audio;
      (window as any).Audio = function () {
        const el = new OrigAudio();
        (el as any).setSinkId = mockSetSinkId;
        return el;
      };

      const player = await createInitializedPlayer({
        useAudioElement: true
      });

      expect(mockSetSinkId).not.toHaveBeenCalled();
      player.destroy();

      (window as any).Audio = OrigAudio;
    });
  });

  // =========================================================================
  // Continuous flush cycle
  // =========================================================================

  describe('continuous flush cycle', () => {
    test('continues flushing at regular intervals', async () => {
      const player = await createInitializedPlayer({
        encoding: '32bitFloat',
        flushingTime: 100
      });
      const ctx = player['audioCtx'] as unknown as MockAudioContext;

      player.feed(createFloat32Samples(50));
      jest.advanceTimersByTime(100);
      expect(ctx.createBufferSource).toHaveBeenCalledTimes(1);

      player.feed(createFloat32Samples(50));
      jest.advanceTimersByTime(100);
      expect(ctx.createBufferSource).toHaveBeenCalledTimes(2);

      player.feed(createFloat32Samples(50));
      jest.advanceTimersByTime(100);
      expect(ctx.createBufferSource).toHaveBeenCalledTimes(3);

      player.destroy();
    });

    test('skips empty flushes without creating buffer sources', async () => {
      const player = await createInitializedPlayer({
        encoding: '32bitFloat',
        flushingTime: 100
      });
      const ctx = player['audioCtx'] as unknown as MockAudioContext;

      jest.advanceTimersByTime(300);
      expect(ctx.createBufferSource).not.toHaveBeenCalled();

      player.destroy();
    });
  });
});
