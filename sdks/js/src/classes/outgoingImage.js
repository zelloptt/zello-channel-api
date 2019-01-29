const Emitter = require('./emitter');
const Constants = require('./constants');
const Utils = require('./utils');

const WIDTH = 'Width';
const HEIGHT = 'Height';

/**
 * @hideconstructor
 * @classdesc Outgoing image class. Instances are returned from <code>Session.sendImage</code> method
 **/
class OutgoingImage extends Emitter {
  constructor(session, instanceOptions = {}) {
    super();
    this.options = Object.assign({
      thumbnailCompress: 0.3,
      fullImageCompress: 0.8,
      cameraAspectRatio: 4/3,
      preview: true
    }, session.options, instanceOptions);
    this.session = session;
    this.currentMessageId = null;
    this.img = null;
    this.canvas = null;
    this.canvasContext = null;
    this.initialWidth = 0;
    this.initialHeight = 0;
    this.fullImageWidth = 0;
    this.fullImageHeight = 0;
    this.thumbnailWidth = 0;
    this.thumbnailHeight = 0;
    this.source = '';
    this.thumbnailData = null;
    this.fullImageData = null;
    this.player = null;

    // todo: validate availale browser APIs
    if (this.options.file) {
      this.file = this.options.file;
      this.handleFile();
    } else {
      this.handleCamera();
    }
    this.setHandlers();
  }

  blobHandler(type) {
    return (blob) => {
      //let packet = Utils.buildBinaryPacket(2, 666, 2, thumbnailData);
      let reader = new FileReader();
      reader.addEventListener('loadend', (e) => {
        this.emit(type + '_data', reader.result);
      });
      reader.readAsArrayBuffer(blob);
    }
  }

  readyToSend() {
    return this.thumbnailData && this.fullImageData;
  }

  setHandlers() {
    this.on(Constants.EVENT_THUMBNAIL_PREVIEW_DATA, this.blobHandler('thumbnail'));
    this.on(Constants.EVENT_IMAGE_PREVIEW_DATA, this.blobHandler('image'));
    this.on(Constants.EVENT_THUMBNAIL_DATA, (data) => {
      this.thumbnailData = data;
      this.processFullImage();
    });
    this.on(Constants.EVENT_IMAGE_DATA, (data) => {
      this.fullImageData = data;
      if (this.options.preview) {
        return;
      }
      this.send();
    });
  }

  /**
   * Sends an outgoing image
   * call this method if  <code>options.preview</code> is set to <code>true</code> (default behaviour).
   * Otherwise image is sent automatically when instance is created by <code>session.sendImage</code>
   * **/
  send() {
    if (!this.readyToSend()) {
      throw new Error(Constants.ERROR_IMAGE_NOT_READY_TO_BE_SENT);
    }
    const params = {
      seq: this.session.getSeq(),
      command: 'send_image',
      type: 'jpeg',
      thumbnail_content_length: this.thumbnailData.length,
      content_length: this.fullImageData.length,
      width: this.fullImageWidth,
      height: this.fullImageHeight,
      source: this.source
    };
    if (this.options.for) {
      params.for = this.options.for;
    }
    this.session.sendCommand(params, (err, data) => {
      if (err) {
        throw new Error(err ? err : Constants.ERROR_FAILED_TO_SEND_IMAGE);
      }
      this.currentMessageId = data.image_id;
      this.sendData();
    });
  }

  sendData() {
    this.session.sendBinary(Utils.buildBinaryPacket(
      Constants.MESSAGE_TYPE_IMAGE,
      this.currentMessageId,
      Constants.IMAGE_TYPE_THUMBNAIL,
      this.thumbnailData
    ));
    this.session.sendBinary(Utils.buildBinaryPacket(
      Constants.MESSAGE_TYPE_IMAGE,
      this.currentMessageId,
      Constants.IMAGE_TYPE_FULL,
      this.fullImageData
    ));
  }

  detectSizes() {
    let scale = (this.initialHeight > this.initialWidth) ? HEIGHT : WIDTH;
    let scaleOver = scale === HEIGHT ? WIDTH : HEIGHT;
    this.fullImageWidth = this.initialWidth;
    this.fullImageHeight = this.initialHeight;
    const prop = this['initial' + scaleOver] / this['initial' + scale];
    if (this['initial' + scale] > Constants.MAX_OUTGOING_IMAGE_SCALE_PX) {
      this['fullImage' + scale] = Constants.MAX_OUTGOING_IMAGE_SCALE_PX;
      this['fullImage' + scaleOver] = parseInt(Constants.MAX_OUTGOING_IMAGE_SCALE_PX * prop, 10);
    }
    this['thumbnail' + scale] = Constants.OUTGOING_IMAGE_THUMBNAIL_SCALE_PX;
    this['thumbnail' + scaleOver] = parseInt(Constants.OUTGOING_IMAGE_THUMBNAIL_SCALE_PX * prop, 10);
  }

  process() {
    this.detectSizes();
    this.canvas = document.createElement('canvas');
    this.canvasContext = this.canvas.getContext('2d');
    this.processThumbnail();
  }

  processThumbnail() {
    this.canvas.width = this.thumbnailWidth;
    this.canvas.height = this.thumbnailHeight;
    this.canvasContext.drawImage(this.img, 0, 0, this.thumbnailWidth, this.thumbnailHeight);
    this.canvas.toBlob((thumbnailBlob) => {
      /**
       * Outgoing image thumbnail data available for preview
       * @event OutgoingImage#thumbnail_preview_data
       * @param {Blob} data preview image thumbnail blob
       */
      this.emit(Constants.EVENT_THUMBNAIL_PREVIEW_DATA, thumbnailBlob);
    }, 'image/jpeg', this.options.thumbnailCompress);
  }

  processFullImage() {
    this.canvas.width = this.fullImageWidth;
    this.canvas.height = this.fullImageHeight;
    this.canvasContext.drawImage(this.img, 0, 0, this.fullImageWidth, this.fullImageHeight);
    this.canvas.toBlob((fullImageBlob) => {
      /**
       * Outgoing image full size image data available for preview
       * @event OutgoingImage#image_preview_data
       * @param {Blob} data preview full size image blob
       */
      this.emit(Constants.EVENT_IMAGE_PREVIEW_DATA, fullImageBlob);
    }, 'image/jpeg', this.options.fullImageCompress);
  }

  handleCamera() {
    const supported = 'mediaDevices' in navigator;
    if (!supported) {
      throw new Error(Constants.ERROR_NO_CAMERA_AVAILABLE);
    }
    this.source = 'camera';
    navigator.mediaDevices.getUserMedia({video: true}).then((stream) => {

      let player = document.createElement('video');
      player.autoplay = true;

      // safari hack
      player.style.cssText = 'position: absolute; left: 0; top: 0; z-index: -10000; opacity: 0.0;';
      document.getElementsByTagName('body')[0].append(player);

      let canvas = document.createElement('canvas');
      let ctx = canvas.getContext('2d');

      let cameraAspect = this.options.cameraAspectRatio;
      let maxWidth = Constants.MAX_OUTGOING_IMAGE_SCALE_PX;
      let maxHeight = maxWidth / cameraAspect;

      canvas.width = maxWidth;
      canvas.height = maxHeight;

      player.width = maxWidth;
      player.height = maxHeight;

      player.srcObject = stream;

      setTimeout(() => {
        ctx.drawImage(player, 0, 0, maxWidth, maxHeight);
        canvas.toBlob((cameraImageBlob) => {
          this.img = new Image();
          this.img.onload = () => {
            this.initialWidth = maxWidth;
            this.initialHeight = maxHeight;
            this.process();
            player.srcObject.getVideoTracks().forEach(track => track.stop());
          };
          this.img.src = URL.createObjectURL(cameraImageBlob);
        });
      }, 2000);
    });
  }

  handleFile() {
    this.source = 'library';
    this.img = new Image();
    this.img.onload = () => {
      this.initialWidth = this.img.width;
      this.initialHeight = this.img.height;
      if (this.initialWidth === 0 || this.initialWidth === 0) {
        throw new Error(Constants.ERROR_INVALID_IMAGE_WIDTH_OR_HEIGHT);
      }
      this.process();
    };
    this.img.src = URL.createObjectURL(this.file);
  }
}

module.exports = OutgoingImage;