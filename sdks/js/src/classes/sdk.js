const Promise = require('q');
const $script = require('scriptjs');
const Constants = require('./constants');
const Utils = require('./utils');

let myUrl = null;
let initOptions = {};

/**
 * @classdesc SDK functions support both callbacks with `(err, result)` arguments
 * and also return promises that resolve with `result` argument or fail with `err` argument.
 *
 * Load sdk using `script` tag:
 * ```html
 * <script src="https://zello.com/zcc/0.0.1/zcc.sdk.js"></script>
 * <script>
 *   console.log(ZCC);
 * </script>
 * ```
 *
 * Load sdk using async script loader (e.g. scriptjs)
 * ```js
 * $script(['https://zello.com/zcc/0.0.1/zcc.sdk.js'], function() {
 *  console.log(ZCC);
 * });
 * ```
 **/
class Sdk {

  /**
   * @description Initialize SDK parts and components.
   * Loads required parts
   *
   * Recorder will fail to load on `http://` pages, it requires `https://`
   *
   * @param {object} [options] list of components to be loaded (see example).
   * @param {function} [userCallback] user callback to fire when sdk parts required by this init call are loaded
   * @return {promise} promise that resolves when sdk parts required by this init call are loaded
   *
   * @example
   *
// callback
ZCC.Sdk.init({
  session: true,  // true by default
  recorder: true, // false by default
  player: true,   // false by default
  widget: true,   // false by default
}, function(err) {
  if (err) {
    console.trace(err);
    return;
  }
  console.log('zcc sdk parts loaded')
})

// promise
ZCC.Sdk.init({
  recorder: true,
  player: true,
  widget: true,
  session: true
})
.then(function() {
  console.log('zcc sdk parts loaded')
}).catch(function(err) {
  console.trace(err);
})
   **/
  static init(options = {}, userCallback = null) {

    Sdk.checkCompatibility();

    let dfd = Promise.defer();
    let url = Sdk.getMyUrl();

    // + defaults
    initOptions = options;

    let scriptsToLoad = [
      url + 'zcc.session.js',
      url + 'zcc.constants.js',
      url + 'zcc.incomingMessage.js',
    ];

    if (options.recorder) {
      if (this.isHttps()) {
        scriptsToLoad.push(url + 'zcc.recorder.js');
      } else {
        throw new Error(Constants.ERROR_RECORDING_NO_HTTPS);
      }
    }

    if (options.widget || options.player) {
      scriptsToLoad.push(url + 'zcc.player.js');
      scriptsToLoad.push(url + 'zcc.decoder.js');
    }
    if (options.widget) {
      scriptsToLoad.push(url + 'zcc.widget.js');
    }

    $script(scriptsToLoad, 'bundle');
    $script.ready('bundle', () => {
      if (typeof userCallback === 'function') {
        userCallback.apply(userCallback);
      }
      dfd.resolve();
      Sdk.autoInit();
    });
    return dfd.promise;
  }

  static autoInit() {
    const autoInitSession = initOptions.session && initOptions.session.autoInit;
    const autoInitWidget = initOptions.widget && initOptions.widget.autoInit;
    if (autoInitSession) {
      Sdk.autoInitSession();
    }

    if (autoInitWidget) {
      Sdk.autoInitWidget();
      if (autoInitSession) {
        const library = Utils.getLoadedLibrary();
        library.Sdk.widget.setSession(library.Sdk.session);
      }
    }
  }

  static autoInitSession() {
    const library = Utils.getLoadedLibrary();
    Sdk.session = new library.Session(initOptions.session);
    let connectCallback = null;
    let logonCallback = null;
    if (initOptions.session.onConnect && typeof initOptions.session.onConnect === 'function') {
      connectCallback = initOptions.session.onConnect;
    }
    if (initOptions.session.onLogon && typeof initOptions.session.onLogon === 'function') {
      logonCallback = initOptions.session.onLogon;
    }

    Sdk.session.connect(function(err, result) {
      if (connectCallback) {
        connectCallback.apply(Sdk.session, [err, result]);
      }
      if (err) {
        return;
      }
      Sdk.session.logon(function(err, result) {
        if (logonCallback) {
          logonCallback.apply(Sdk.session, [err, result]);
        }
      })
    });
  }

  static autoInitWidget() {
    const library = Utils.getLoadedLibrary();
    Sdk.widget = new library.Widget(initOptions);
  }

  static getMyUrl() {
    if (myUrl) {
      return myUrl;
    }
    const scripts = document.getElementsByTagName('script');
    for (let i = 0; i < scripts.length; i++) {
      let script = scripts[i];
      let src = script.getAttribute('src');
      if (src.match(/zcc.sdk\.js$/)) {
        myUrl = src.replace(/zcc.sdk.js$/, '');
        return myUrl;
      }
    }
    return false;
  }

  static isHttps() {
    return window.location.protocol.match(/https/);
  }

  static checkCompatibility() {
    if (
      typeof window.WebSocket !== 'function' ||
      typeof JSON.stringify !== 'function' ||
      typeof JSON.parse !== 'function' ||
      typeof Object.assign !== 'function'
    ) {
      throw new Error(Constants.ERROR_UNSUPPORTED);
    }
  }

}

module.exports = Sdk;