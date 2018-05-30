const Emitter = require('./../emitter');
const Constants = require('./../constants');
const Styles = require('./styles/styles.scss');
const DomUtils = require('./../domutils');
const Utils = require('./../utils');

// const MainTemplate = require('./templates/template.ejs');
// const StatusTemplate = require('./templates/status.ejs');
// const InfoTemplate = require('./templates/info.ejs');

const MainTemplate = require('./templates/template.ejs');

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
   * @param {object} options widget options
   **/
  constructor(options = {}) {
    super();
    this.options = options;
    this.isHeadless = !!(this.options.headless);
    this.element = this.options.element;

    this.currentIncomingMessage = null;
    this.currentIncomingMessagePlaybackInterval = null;

    this.state = {
      channel: '-',
      users_online: 0,
      status: 'offline',
      receiving: false,
      receiving_from_username: '',
      sending: false,
      muted: true,
      reconnecting: false,
      wasConnected: false
    };

    this.init();
  }

  init() {
    if (this.isHeadless) {
      return;
    }
    if (!DomUtils.isDomElement(this.options.element)) {
      throw new Error(Constants.ERROR_WIDGET_ELEMENT_NOT_FOUND);
    }
  }

  parseHtmlForVariables() {
    let elements = DomUtils.getElementsByClassName('zcc-js', this.element);
    for (let i = 0; i < elements.length; i++) {
      let element = elements[i];
      let name = Utils.strToCamelCase(element.className.split(/ /)[0]);
      this[name] = elements[i];
    }
  }

  updateMainHtml() {
    this.element.innerHTML = MainTemplate(this.state);
    this.parseHtmlForVariables();
    this.updateHandlers();
  }

  emitEvent(eventName, additionalData = {}) {
    let emitData = Object.assign({
      state: this.state,
      options: this.options,
      event: eventName
    }, additionalData);
    this.emit(eventName, emitData);
    if (window.parent) {
      window.parent.postMessage(JSON.stringify(emitData), '*');
    }
  }

  updateHandlers() {
    this.zccButtonMute.onclick = () => {
      this.mute(true);
      this.emitEvent(Constants.EVENT_WIDGET_MUTE);
    };
    this.zccButtonUnmute.onclick = () => {
      this.mute(false);
      this.emitEvent(Constants.EVENT_WIDGET_UNMUTE);
    };

    this.zccButtonOpen.onclick = () => {
      this.emitEvent(Constants.EVENT_WIDGET_OPEN_BUTTON_CLICK);
    };

    if (this.zccReceivingUsername) {
      this.zccReceivingUsername.onclick = () => {
        this.emitEvent(Constants.EVENT_WIDGET_SPEAKING_USERNAME_CLICK, {
          username: this.state.receiving_from_username
        });
      };
    }
  }

  mute(mute) {
    this.state.muted = mute;
    if (mute) {
      Widget.hide(this.zccButtonMute);
      Widget.show(this.zccButtonUnmute);
    } else {
      Widget.show(this.zccButtonMute);
      Widget.hide(this.zccButtonUnmute);
    }
    this.updateMuteStateOfCurrentIncomingMessage(mute);
  }

  updateMuteStateOfCurrentIncomingMessage(mute) {
    if (!this.currentIncomingMessage) {
      return;
    }
    this.currentIncomingMessage.player.mute(mute);
  }

  static hide(el) {
    DomUtils.addClass(el, 'zcc-hidden');
  }

  static show(el) {
    DomUtils.removeClass(el, 'zcc-hidden');
  }

  static updateHtml(elem, v, params = null) {
    if (!elem) {
      return false;
    }
    let str = v;
    if (typeof v === 'function') {
      str = v.apply(v, [params]);
    }
    elem.innerHTML = str;
  }

  setSession(session) {

    this.session = session;
    this.state.channel = session.options.channel;

    this.updateMainHtml();

    this.session.on(Constants.EVENT_STATUS, (status) => {
      this.state = Object.assign(this.state, status);
      this.updateMainHtml();
    });

    this.session.on(Constants.EVENT_SESSION_START_CONNECT, () => {
      this.state.status = (this.state.wasConnected) ? 'reconnecting' : 'connecting';
      this.updateMainHtml();
    });

    this.session.on(Constants.EVENT_SESSION_CONNECT, () => {
      this.state.wasConnected = true;
    });

    this.session.on(Constants.EVENT_SESSION_FAIL_CONNECT, () => {
      this.state.status = 'connect-failed';
      this.updateMainHtml();
    });

    this.session.on(Constants.EVENT_SESSION_DISCONNECT, () => {
      this.state.status = 'disconnected';
      this.updateMainHtml();
    });

    this.session.on(Constants.EVENT_INCOMING_VOICE_WILL_START, (incomingMessage) => {
      clearInterval(this.currentIncomingMessagePlaybackInterval);
    });

    this.session.on(Constants.EVENT_INCOMING_VOICE_DID_START, (incomingMessage) => {
      this.updateReceivingState(incomingMessage);
    });

    this.session.on(Constants.EVENT_INCOMING_VOICE_DID_STOP, () => {
      this.updateReceivingState(null);
    });
  }

  updateReceivingState(incomingMessage) {
    this.currentIncomingMessage = incomingMessage;
    if (this.state.muted && incomingMessage) {
      incomingMessage.player.mute(true);
    }
    this.state.receiving = !!(incomingMessage);
    this.state.receiving_from_username = incomingMessage ? incomingMessage.options.messageData.from : '';
    if (incomingMessage) {
        let startTime = Date.now();
        this.currentIncomingMessagePlaybackInterval = setInterval(() => {
          let duration = Date.now() - startTime;
          this.zccReceivingDuration.innerHTML = Utils.getDurationDisplay(duration);
        }, 100);
    } else {
      clearInterval(this.currentIncomingMessagePlaybackInterval);
    }
    this.updateMainHtml();
  }

  disconnect() {
    this.session.disconnect();
  }

  destroy() {
    this.disconnect();
    this.element.remove();
  }



}

module.exports = Widget;