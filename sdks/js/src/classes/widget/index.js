const Emitter = require('component-emitter');
const Constants = require('./../constants');
const MainTemplate = require('./template.handlebars');
const StatusTemplate = require('./status.handlebars');
const MessageInfoTemplate = require('./message-info.handlebars');
const Styles = require('./styles.scss');
const DomUtils = require('./../domutils');
const Utils = require('./../utils');

/**
 * @classdesc Widget class to initialize player (in widget or headless mode) that plays incoming messages and provides
 * interface to record messages in supported browsers and environments (https only)
 *
 * @example
// headless mode
var session = new ZCC.Session({
  serverUrl: 'wss://zellowork.io/ws/[yournetworkname]',
  channel: '[channel]',
  authToken: '[authToken]',
  username: '[username]',
  password: '[password]',
});
session.connect()
.then(function() {
  return session.logon();
})
.then(function(data) {
  var widget = new ZCC.Widget({
    widget: {
      headless: true
    }
  });
  widget.setSession(session);
})
.fail(function(err) {
  console.trace(err);
});

// widget mode
 var session = new ZCC.Session({
  serverUrl: 'wss://zellowork.io/ws/[yournetworkname]',
  channel: '[channel]',
  authToken: '[authToken]',
  username: '[username]',
  password: '[password]',
});
 session.connect()
 .then(function() {
  return session.logon();
})
 .then(function(data) {
  var widget = new ZCC.Widget({
    widget: {
      headless: false,
      element: document.getElementById('player-container')
    }
  });
  widget.setSession(session);
})
 .fail(function(err) {
  console.trace(err);
});

 * */
class Widget extends Emitter {

  /**
   * @param {object} params including `widget` section (see example).
   **/
  constructor(params) {
    super();
    this.options = params;
    if (!this.options.widget) {
      throw new Error(Constants.ERROR_NOT_ENOUGH_PARAMS);
    }
    if (!this.options.widget.element && !this.options.widget.headless) {
      throw new Error(Constants.ERROR_WIDGET_ELEMENT_NOT_FOUND);
    }
    this.isHeadless = !!(this.options.widget.headless);
    this.isRecordingAvailable = this.options.recorder;
    this.element = this.options.widget.element;

    this.recorderOptions = {
      streamPages: true,
      numberOfChannels: 1,
      encoderFrameSize: 60,
      encoderBitRate: 16000,
      encoderSampleRate: 16000,
      maxBuffersPerPage: 1
    };

    this.currentMessageTimer = null;
    this.currentRecordedMessageId = null;
    this.currentPacketId = 0;

    this.init();
  }

  initHtml() {
    this.element.innerHTML = MainTemplate(this.options);
    this.button = DomUtils.getElementByClassName('zcc-button', this.element);
    this.statusContainer = DomUtils.getElementByClassName('zcc-status-container', this.element);
    this.messageInfoContainer = DomUtils.getElementByClassName('zcc-message-info-container', this.element);
    this.messageDurationContainer = DomUtils.getElementByClassName('zcc-message-duration-container', this.element);
    if (this.button) {
      this.button.addEventListener('click', () => {
        this.buttonPressHandler();
      });
    }
  }

  startMessage() {
    this.emit(Constants.EVENT_START_STREAM);
    this.session.startStream({
      'type': 'audio',
      'codec': 'opus',
      'codec_header': Widget.buildCodecHeader(
        this.recorderOptions.encoderSampleRate,
        this.recorderOptions.maxBuffersPerPage,
        this.recorderOptions.encoderFrameSize
      ),
      'packet_duration': 60
    }).then((data) => {
      this.currentRecordedMessageId = data.stream_id;
      this.doRecordMessage();
    }).fail((err) => {
      this.emit(Constants.EVENT_ERROR, err);
    });
  }

  doRecordMessage() {
    DomUtils.addClass(this.button, 'zcc-recording');
    this.recorder.onopusdataavailable = (data) => {
      let packet = Widget.buildBinaryPacket(1, this.currentRecordedMessageId, this.currentPacketId, data);
      this.currentPacketId++;
      this.session.sendBinary(packet);
    };
    this.recorder.start();
  }

  stopRecordMessage() {
    DomUtils.removeClass(this.button, 'zcc-recording');
    this.currentRecordedMessageId = null;
    this.recorder.stop();
  }

  buttonPressHandler() {
    this.emit(Constants.EVENT_BUTTON_PRESS);
    if (!this.currentRecordedMessageId) {
      this.startMessage();
      return;
    }
    this.stopMessage();
  }

  stopMessage() {
    this.emit(Constants.EVENT_STOP_STREAM);
    this.session.stopStream({
      'stream_id': this.currentRecordedMessageId
    }).then((data) => {
      this.stopRecordMessage();
    }).fail((err) => {
      this.emit(Constants.EVENT_ERROR, err);
    });
  }

  initPlayer() {
    let library = Utils.getLoadedLibrary();
    this.decoder = new library.Player.Decoder.OpusToPCM({
      channels: 1,
      fallback: true
    });

    this.player = new library.Player.PCMPlayer({
      encoding: '32bitFloat',
      channels: 1,
      sampleRate: this.decoder.getSampleRate(),
      flushingTime: 100
    });

    this.decoder.on('decode', (pcmData) => {
      this.player.feed(pcmData);
    });

    if (this.isRecordingAvailable) {
      this.recorder = new library.Recorder(this.recorderOptions);
    }

  }

  init() {
    if (!this.isHeadless) {
      this.initHtml();
    }
    this.initPlayer();
    this.playOn = true;
  }

  setSession(session) {
    this.session = session;

    this.session.on(Constants.EVENT_STATUS, (status) => {
      this.statusUpdate(status)
    });

    this.session.on(Constants.EVENT_STREAM_START, (stream) => {
      this.incomingMessageStart(stream);
    });

    this.session.on(Constants.EVENT_STREAM_STOP, (stream) => {
      this.incomingMessageEnd(stream);
    });

    this.session.on(Constants.EVENT_AUDIO_PACKET_IN, (audioPacket) => {
      if (!this.playOn) {
        return;
      }
      this.decoder.decode(audioPacket.messageData);
    });
  }

  statusUpdate(data) {
    if (this.isHeadless) {
      return;
    }
    this.statusContainer.innerHTML = StatusTemplate(data);
  }

  incomingMessageStart(data) {
    let startTime = Date.now();
    this.currentMessageTimer = setInterval(() => {
      let duration = Date.now() - startTime;
      if (!this.isHeadless) {
        this.messageDurationContainer.innerHTML = Widget.getDurationDisplay(duration);
      }
    }, 100);
    if (this.isHeadless) {
      return;
    }
    this.messageInfoContainer.innerHTML = MessageInfoTemplate(data);
    DomUtils.addClass(this.button, 'zcc-receiving');
  }

  incomingMessageEnd() {
    clearInterval(this.currentMessageTimer);
    if (this.isHeadless) {
      return;
    }
    this.messageDurationContainer.innerHTML = '';
    this.messageInfoContainer.innerHTML = '';
    DomUtils.removeClass(this.button, 'zcc-receiving');
  }

  pausePlayer() {
    this.playOn = false;
  }

  resumePlayer() {
    this.playOn = true;
  }

  disconnect() {
    this.session.disconnect();
  }

  destroy() {
    this.disconnect();
    this.element.remove();
  }

  static getDurationDisplay(duration) {
    let hours = Math.floor((duration / (1000 * 3600)));
    let mins = Math.floor((duration / (1000 * 60)) % 60);
    let secs = Math.floor((duration / 1000) % 60);
    let millis = Math.round((duration % 1000) / 100);

    if (millis >= 10) {
      millis = 2;
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
    return new Uint8Array(Widget.arrayBufferConcat(header, messageData));
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

}

module.exports = Widget;