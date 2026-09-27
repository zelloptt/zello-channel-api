const Emitter = require('./emitter');
const Constants = require('./constants');

/**
 * @hideconstructor
 * @classdesc Incoming image class. Instances are returned as arguments for corresponding <code>ZCC.Session</code> events
 **/
class IncomingImage extends Emitter {

  constructor(messageData, session) {
    super();
    this.messageData = messageData;
    this.channel = messageData.channel;
    this.options = Object.assign({}, session.options, {messageData: messageData});
    this.instanceId = messageData.message_id;
    this.session = session;
    this.initSessionHandlers();
    this.clearHandlersAfterFetches = 2;
    this.numberOfFetches = 0;
  }

  initSessionHandlers() {
    this.incomingImageHandler = (data) => {
      // The session broadcasts every image packet to every pending image.
      // Keep only this message's packets so two images pending on different
      // channels do not consume each other's thumbnail and full image. The
      // header id is a number and message_id comes from JSON, so compare as
      // numbers.
      if (Number(data.messageId) !== Number(this.instanceId)) {
        return;
      }
      this.numberOfFetches++;
      let eventName =
        data.packetId === Constants.IMAGE_TYPE_FULL ? Constants.EVENT_IMAGE_DATA : Constants.EVENT_THUMBNAIL_DATA;
      /**
       * Incoming image thumbnail data available
       * @event IncomingImage#image_thumbnail
       * @param {Uint8Array} data thumbnail data
       */
      /**
       * Incoming full image data available
       * @event IncomingImage#image
       * @param {Uint8Array} data full image data
       */
      this.emit(eventName, data.messageData);
      if (this.numberOfFetches === this.clearHandlersAfterFetches) {
        this.session.off([Constants.EVENT_INCOMING_IMAGE_DATA, this.instanceId], this.incomingImageHandler);
      }
    };
    this.session.on([Constants.EVENT_INCOMING_IMAGE_DATA, this.instanceId], this.incomingImageHandler);
  }
}

module.exports = IncomingImage;