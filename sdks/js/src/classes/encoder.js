const Emitter = require('./emitter');
const Constants = require('./constants');
const encoderWorkerSrc = require('./../vendor/opus-recorder/src/encoderWorker.inline');

/**
 * Encoder interface. Encoder is used by <code>OutgoingMessage</code> to encode data recorder with <code>Recorder</code>.
 * Custom Encoder implementation should call method <code>ondata</code> once encoded data portion is ready
 * @interface Encoder
 **/
class Encoder extends Emitter {
  constructor() {
    super();
    let blob;
    try {
      blob = new Blob([encoderWorkerSrc], {type: 'application/javascript'});
    } catch (e) {
      let blobBuilder = window.BlobBuilder || window.WebKitBlobBuilder || window.MozBlobBuilder;
      blob = new blobBuilder();
      blob.append(encoderWorkerSrc);
      blob = blob.getBlob();
    }
    this.encoderWorker = new window.Worker(URL.createObjectURL(blob));
    this.encoderWorker.addEventListener('message', (e) => {
      if (!e.data) {
        return;
      }
      const data = e.data;
      if (data.message === 'close') {
        this.onClose();
        return;
      }
      if (data.message === 'done') {
        this.emit(Constants.EVENT_ENCODER_DONE);
        this.ondone();
        return;
      }
      if (data.type !== 'opus' || !data.data) {
        return;
      }
      this.emit(Constants.EVENT_DATA_ENCODED, data.data);
      this.ondata(data.data);
    });
  }

  /**
   * Emit encoded data portion to let <code>OutgoingMessage</code> instance get encoded data ready to be sent into channel
   *
   * @method Encoder#ondata
   * @param {Uint8Array | array} data encoded opus data portion
   * **/
  ondata(data) {}

  /**
   * Fired when the encoder has finished processing its final data frame.
   */
  ondone() {}

  postMessage(message) {
    this.encoderWorker.postMessage(JSON.parse(JSON.stringify(message)));
  }

  /**
   * @param {array} data array of 1 or 2 buffers for each PCM channel
   * **/
  encode(data) {
    this.encoderWorker.postMessage({
      command: "encode",
      buffers: data
    });
  }

  destroy() {
    // This destroys the opus memory allocations, not the worker
    this.encoderWorker.postMessage({
      command: 'destroy'
    });
    // This closes the worker
    this.encoderWorker.postMessage({
      command: 'close'
    });
  }

  onClose() {
    this.removeAllListeners();
    this.encoderWorker = undefined;
  }
}

module.exports = Encoder;