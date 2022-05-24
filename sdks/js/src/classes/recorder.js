const RecorderState = Object.freeze({
  Inactive: "inactive",
  Recording: "recording",
  Paused: "paused"
});

/**
 * Recorder interface. Recorder is used by <code>OutgoingMessage</code> to record and send voice data
 * Custom recorder implementation should call method <code>onready</code> once recorder is initialized and method
 * <code>ondata</code> once PCM data portion is ready
 *
 * @interface Recorder
 */
class Recorder {
  constructor(options, encoder) {
    if (!Recorder.isRecordingSupported()) {
      throw new Error("Recording is not supported in this browser");
    }
    this.options = Object.assign({
      bufferLength: 0,
      monitorGain: 0,
      recordingGain: 1,
      mediaConstraints: { audio: true }
    }, options);
    this.encoder = encoder;
    this.state = RecorderState.Inactive;
  }

  static getAudioContext() {
    return global.AudioContext || global.webkitAudioContext;
  }

  static isRecordingSupported() {
    return Recorder.getAudioContext() &&
      global.navigator &&
      global.navigator.mediaDevices &&
      global.navigator.mediaDevices.getUserMedia &&
      global.WebAssembly;
  }

  clearStream() {
    if (this.stream) {
      if (this.stream.getTracks) {
        this.stream.getTracks().forEach(function(track) {
          track.stop();
        });
      } else {
        this.stream.stop();
      }
      delete this.stream;
    }

    if (this.audioContext) {
      this.audioContext.close();
      delete this.audioContext;
    }
  }

  disconnectNodes() {
    this.sourceNode.disconnect();
    this.recordingGainNode.disconnect();
    this.monitorGainNode.disconnect();
    this.scriptProcessorNode.disconnect();
  }

  getSampleRate() {
    return this.audioContext.sampleRate;
  }

  encodeBuffers(inputBuffer) {
    if (this.state !== RecorderState.Recording) {
      return;
    }
    let buffers = [];
    for (let i = 0; i < inputBuffer.numberOfChannels; i++) {
      buffers[i] = inputBuffer.getChannelData(i);
    }
    this.ondata(buffers);
  }

  initAudioContext() {
    if (!this.audioContext) {
      const AudioContext = Recorder.getAudioContext();
      this.audioContext = new AudioContext();
    }
    return this.audioContext;
  }

  initAudioGraph(fromInputDeviceChange = false) {
    // First buffer can contain old data. Don't encode it.
    if (!fromInputDeviceChange) {
      this.encodeBuffers = () => {
        delete this.encodeBuffers;
      }; 
    }

    this.scriptProcessorNode = this.audioContext.createScriptProcessor(
      this.options.bufferLength,
      this.options.numberOfChannels,
      this.options.numberOfChannels
    );
    this.scriptProcessorNode.connect(this.audioContext.destination);
    this.scriptProcessorNode.onaudioprocess = (e) => {
      this.encodeBuffers(e.inputBuffer);
      if (this.bufferLimit !== undefined && ++this.buffersEncoded >= this.bufferLimit) {
        this.clearStopTimeout()
        this.stop();
      }
    };

    this.monitorGainNode = this.audioContext.createGain();
    this.setMonitorGain(this.options.monitorGain);
    this.monitorGainNode.connect(this.audioContext.destination);

    this.recordingGainNode = this.audioContext.createGain();
    this.setRecordingGain(this.options.recordingGain);
    this.recordingGainNode.connect(this.scriptProcessorNode);
  };

  initSourceNode() {
    if (this.stream && this.sourceNode) {
      return global.Promise.resolve(this.sourceNode);
    }
    return global.navigator.mediaDevices.getUserMedia(this.options.mediaConstraints).then((stream) => {
      this.stream = stream;
      return this.audioContext.createMediaStreamSource(stream);
    });
  }

  pause() {
    if (this.state === RecorderState.Recording) {
      this.state = RecorderState.Paused;
    }
  }

  resume() {
    if (this.state === RecorderState.Paused) {
      this.state = RecorderState.Recording;
    }
  }

  setRecordingGain(gain) {
    this.options.recordingGain = gain;

    if (this.recordingGainNode && this.audioContext) {
      this.recordingGainNode.gain.setTargetAtTime(gain, this.audioContext.currentTime, 0.01);
    }
  }

  setMonitorGain(gain) {
    this.options.monitorGain = gain;

    if (this.monitorGainNode && this.audioContext) {
      this.monitorGainNode.gain.setTargetAtTime(gain, this.audioContext.currentTime, 0.01);
    }
  }

  changeInputDevice(deviceId) {
    if (this.state !== RecorderState.Recording) {
      return;
    }
    this.options.mediaConstraints.audio = {deviceId: {exact: deviceId}};
    this.disconnectNodes();
    this.clearStream();
    this.initAudioContext();
    this.initAudioGraph(true);
    this.initSourceNode().then((sourceNode) => {
      this.sourceNode = sourceNode;
      this.sourceNode.connect(this.monitorGainNode);
      this.sourceNode.connect(this.recordingGainNode);
    });
  }

  init() {
    if (this.state !== RecorderState.Inactive) {
      return global.Promise.reject("Recording is not inactive");
    }

    this.initAudioContext();
    this.initAudioGraph();

    return this.initSourceNode().then((sourceNode) => {
      this.state = RecorderState.Recording;
      this.sourceNode = sourceNode;
      this.sourceNode.connect(this.monitorGainNode);
      this.sourceNode.connect(this.recordingGainNode);
      this.onready();
    });
  }

  stop() {
    if (this.state === RecorderState.Inactive) {
      return;
    }

    this.state = RecorderState.Inactive;
    this.disconnectNodes();

    if (!this.options.leaveStreamOpen) {
      this.clearStream();
    }

    // signal encoder
    this.encoder.postMessage({command: "done"});
  }

  /**
   * A delayed stop that allows for the processing of bufferLimit more audio buffers before stopping.
   */
  stopAfter(bufferLimit) {
    // Protection against multiple stopAfter calls
    this.clearStopTimeout();
    // Failsafe in case we don't receive additional encoded audio
    this.stopTimeout = setTimeout(() => {
      this.stop();
    }, 1000); // ms. TODO Is there a way to calculate this value mathematically?
    this.setBufferLimit(bufferLimit);
  }

  setBufferLimit(bufferLimit = 1) {
    this.bufferLimit = bufferLimit;
    this.buffersEncoded = 0;
  }

  clearStopTimeout() {
    if (this.stopTimeout) {
      clearTimeout(this.stopTimeout);
      this.stopTimeout = undefined;
    }
  }

  start() {}

  /**
   * Emit recorded data portion to let <code>OutgoingMessage</code> instance get recorder data.
   *
   * @method Recorder#ondata
   * @param {Float32Array} data pcm data portion
   * **/
  ondata(data) {}

  onready() {}

}

module.exports = Recorder;