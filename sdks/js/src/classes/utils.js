const settings = require('./../../settings');
const str2ab = require('string-to-arraybuffer');

class Utils {
  static getLoadedLibrary() {
    if (!window) {
      return false;
    }
    return window[settings.libraryName];
  }

  static strToCamelCase(str) {
    return str.split(/[-_]/).map((a, b) => {
      return b === 0 ? a.toLowerCase() : a.charAt(0).toUpperCase() + a.slice(1).toLowerCase()
    }).join('');
  }

  static getDurationDisplay(duration) {
    let hours = Math.floor((duration / (1000 * 3600)));
    let mins = Math.floor((duration / (1000 * 60)) % 60);
    let secs = Math.floor((duration / 1000) % 60);
    let millis = Math.round((duration % 1000) / 100);

    if (millis >= 10) {
      millis = 9;
    }

    if (hours > 0 && hours < 10) {
      hours = "0" + hours
    }
    if (mins > 0 && mins < 10) {
      mins = "0" + mins
    }
    if (secs > 0 && secs < 10) {
      secs = "0" + secs
    }

    if (hours) {
      return "" + hours + ":" + mins + ":" + secs + "." + millis;
    }

    if (mins) {
      return "" + mins + ":" + secs + "." + millis;
    }
    if (secs) {
      return "00:" + secs + "." + millis;
    }
    return "00:00." + millis;
  }

  static buildBinaryPacket(type, streamId, packetId, messageData) {
    let header = new ArrayBuffer(9);
    let headerView = new DataView(header);
    headerView.setInt8(0, type);
    headerView.setInt32(1, streamId, false);
    headerView.setInt32(5, packetId, false);
    return new Uint8Array(Utils.arrayBufferConcat(header, messageData));
  }

  static buildCodecHeader(frequency, framesPerPacket, frameSize) {
    let packet = new ArrayBuffer(4);
    let packetView = new DataView(packet);
    packetView.setUint16(0, frequency, true);
    packetView.setUint8(2, framesPerPacket);
    packetView.setUint8(3, frameSize);
    return btoa(String.fromCharCode.apply(null, new Uint8Array(packet)));
  }

  static arrayBufferConcat() {
    let length = 0;
    let buffer = null;

    for (let i in arguments) {
      buffer = arguments[i];
      length += buffer.byteLength;
    }

    let joined = new Uint8Array(length);
    let offset = 0;

    for (let i in arguments) {
      buffer = arguments[i];
      joined.set(new Uint8Array(buffer), offset);
      offset += buffer.byteLength;
    }
    return joined.buffer;
  }

  static parseCodedHeader(codecHeader) {
    const abuf4View = new DataView(str2ab('data:text/plain;base64,' + codecHeader));
    return {
      rate: abuf4View.getUint16(0, true),
      framesPerPacket: abuf4View.getUint8(2),
      frameSize: abuf4View.getUint8(3)
    };
  }

  static isFunction(p) {
    return Utils.instanceOf(p, Function);
  }

  static isArray(p) {
    return Utils.instanceOf(p, Array);
  }

  static isObject(p) {
    return Utils.instanceOf(p, Object);
  }

  static isPromise(p) {
    return Utils.isObject(p) && Utils.isFunction(p.then);
  }

  static instanceOf(p, c) {
    return p instanceof c;
  }

  static parseIncomingBinaryMessage(binaryData) {
    let headerView = new DataView(binaryData.slice(0, 9));
    return {
      messageType: headerView.getUint8(0),
      messageData: new Uint8Array(binaryData.slice(9)),
      messageId: headerView.getUint32(1, false),
      packetId: headerView.getUint32(5, false)
    }
  }

}

module.exports = Utils;