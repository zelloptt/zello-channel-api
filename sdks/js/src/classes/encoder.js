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
      if (!e.data || e.data.type !== 'opus' || !e.data.data) {
        return;
      }
      this.emit(Constants.EVENT_DATA_ENCODED, e.data.data);
      this.ondata(e.data.data);
    });
  }

  /**
   * Emit encoded data portion to let <code>OutgoingMessage</code> instance get encoded data ready to be sent into channel
   *
   * @method Encoder#ondata
   * @param {Uint8Array | array} data encoded opus data portion
   * **/
  ondata(data) {}

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
    this.encoderWorker.postMessage({
      command: 'destroy'
    });
    this.encoderWorker.postMessage({
      command: 'close'
    });
    this.encoderWorker.terminate();
    this.removeAllListeners();
    this.encoderWorker = undefined;
  }
}

module.exports = Encoder;