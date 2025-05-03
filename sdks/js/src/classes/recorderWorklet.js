class RecordingProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffersEncoded = 0;
    this.bufferLimit = undefined;
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || !input[0]) {
      return true;
    }

    // Copy data (first channel only here, or process all if needed)
    const frame = input.map(channel => Float32Array.from(channel));

    this.port.postMessage({ buffers: frame });
    return true;
  }
}

registerProcessor('recording-processor', RecordingProcessor);
