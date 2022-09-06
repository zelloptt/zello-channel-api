const Promise = require('q');
const $script = require('scriptjs');
const Constants = require('./constants');
const Utils = require('./utils');

let myUrl = null;

/**
 * @hideconstructor
 * @classdesc SDK functions support both callbacks with <code>(err, result)</code> arguments
 * and also return promises that resolve with <code>result</code> argument or fail with <code>err</code> argument.
 *
 * @example
 * <!-- Load sdk using <script> tag: -->
 * <script src="https://zello.io/sdks/js/0.1/zcc.sdk.js"></script>
 * <script>
 *   console.log(ZCC);
 * </script>
 *
 * <!-- Load sdk using async script loader (e.g. scriptjs) -->
 * <script>
 * $script(['https://zello.io/sdks/js/0.1/zcc.sdk.js'], function() {
 *  console.log(ZCC);
 * });
 * </script>
 **/
class Sdk {

  /**
   * @description Initialize SDK parts and components.
   * Loads required parts
   *
   * Default recorder will fail to load on http:// pages, it requires https://
   *
   * @param {object} [options] List of components to be loaded (see example).
   *                           Set to <b>false</b> to skip loading of a specific component,
   *                           or provide class function to be used as a custom player, decoder, recorder or encoder
   *                           (see <a href="">examples</a>).
   *
   * @param {function} [userCallback] User callback to fire when sdk parts required by this init call are loaded,
   *                                  or any of them failed to load.
   * @return {promise} Promise that resolves when sdk parts required by this init call are loaded,
   *                   or rejects if any of the required components failed to load.
   *
   * @example
   *
// callback
ZCC.Sdk.init({
  player: true,  // true by default
  decoder: true, // true by default
  recorder: true, // true by default
  encoder: true, // true by default
}, function(err) {
  if (err) {
    console.trace(err);
    return;
  }
  console.log('zcc sdk parts loaded')
})

// promise
ZCC.Sdk.init({
  player: true,
  decoder: true,
  recorder: true,
  encoder: true
})
.then(function() {
  console.log('zcc sdk parts loaded')
}).catch(function(err) {
  console.trace(err);
})
   **/
  static init(options = {}, userCallback = null) {

    Sdk.checkBrowserCompatibility();

    let dfd = Promise.defer();
    let url = Sdk.getMyUrl();

    Sdk.initOptions = Object.assign({
      player: true,
      decoder: true,
      recorder: true,
      encoder: true,
      widget: false
    }, options);

    let scriptNames = [
      'Session',
      'Constants',
      'IncomingImage',
      'OutgoingImage',
      'IncomingMessage',
      'OutgoingMessage'
    ];
    let scriptsToLoad = [
      url + 'zcc.session.js',
      url + 'zcc.constants.js',
      url + 'zcc.incomingimage.js',
      url + 'zcc.outgoingimage.js',
      url + 'zcc.incomingmessage.js',
      url + 'zcc.outgoingmessage.js'
    ];

    let shouldInitDefaultPlayer = false;
    if (Sdk.initOptions.player && !Utils.isFunction(Sdk.initOptions.player)) {
      scriptsToLoad.push(url + 'zcc.player.js');
      scriptNames.push('Player');
      shouldInitDefaultPlayer = true;
    }
    if (Sdk.initOptions.decoder && !Utils.isFunction(Sdk.initOptions.decoder)) {
      scriptsToLoad.push(url + 'zcc.decoder.js');
      scriptNames.push('Decoder');
    }
    if (Sdk.initOptions.recorder && !Utils.isFunction(Sdk.initOptions.recorder)) {
      scriptsToLoad.push(url + 'zcc.recorder.js');
      scriptNames.push('Recorder');
    }
    if (Sdk.initOptions.encoder && !Utils.isFunction(Sdk.initOptions.encoder)) {
      scriptsToLoad.push(url + 'zcc.encoder.js');
      scriptNames.push('Encoder');
    }
    if (Sdk.initOptions.widget) {
      scriptsToLoad.push(url + 'zcc.widget.js');
      scriptNames.push('Widget');
    }

    $script(scriptsToLoad, 'bundle');
    $script.ready('bundle', () => {
      const library = Utils.getLoadedLibrary();
      for (const name of scriptNames) {
        if (library && library[name]) {
          continue;
        }
        if (typeof userCallback === 'function') {
          userCallback.call(userCallback, 'Unable to load ' + name);
        }
        dfd.reject();
        return;
      }
      if (typeof userCallback === 'function') {
        userCallback.apply(userCallback);
      }
      if (shouldInitDefaultPlayer) {
        Sdk.initDefaultPlayer(options);
      }
      dfd.resolve();
    });
    return dfd.promise;
  }

  static initDefaultPlayer(options) {
    let library = Utils.getLoadedLibrary();
    const playerOptions = Object.assign({
      encoding: '32bitFloat',
      sampleRate: 48000
    }, options);
    library.IncomingMessage.PersistentPlayer = new library.Player(playerOptions);
    library.IncomingMessage.PersistentPlayer.init().catch((err) => {
      library.IncomingMessage.PersistentPlayer = undefined;
      delete library.IncomingMessage.PersistentPlayer;
      console.error('Failed to init the default player:', err);
    });
  }

  static getMyUrl() {
    if (myUrl) {
      return myUrl;
    }
    const scripts = document.getElementsByTagName('script');
    for (let i = 0; i < scripts.length; i++) {
      let script = scripts[i];
      let src = script.getAttribute('src');
      if (src && src.match(/zcc.sdk\.js$/)) {
        myUrl = src.replace(/zcc.sdk.js$/, '');
        return myUrl;
      }
    }
    return false;
  }

  static isHttps() {
    return window.location.protocol.match(/https/);
  }

  static checkBrowserCompatibility() {
    if (
      typeof window.WebSocket !== 'function' ||
      typeof window.Blob !== 'function' ||
      typeof window.Worker !== 'function' ||
      typeof JSON.stringify !== 'function' ||
      typeof JSON.parse !== 'function' ||
      typeof Object.assign !== 'function'
    ) {
      throw new Error(Constants.ERROR_UNSUPPORTED);
    }
  }
}

module.exports = Sdk;