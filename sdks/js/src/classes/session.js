const Emitter = require('./emitter');
const Promise = require('q');
const Constants = require('./constants');
const Utils = require('./utils');

/**
 * @classdesc Session class to start session with zello server and interact with it using <a href="">zello channel api</a>
 * @example
 var session = new ZCC.Session({
  serverUrl: 'wss://zellowork.io/ws/[yournetworkname]',
  username: [username],
  password: [password]
  channel: [channel],
  authToken: [authToken],
  maxConnectAttempts: 5,
  connectRetryTimeoutMs: 1000,
  autoSendAudio: true
);
 **/
class Session extends Emitter {
  /**
   * @param {object} options session options. Options can also include <code>player</code>, <code>decoder</code>, <code>recorder</code> and <code>encoder</code> overrides
   * @return {ZCC.Session} <code>ZCC.Session</code> instance
   **/
  constructor(options) {
    super();
    const library = Utils.getLoadedLibrary();
    Session.validateInitialOptions(options);
    this.options = Object.assign({}, library.Sdk.initOptions, {
      maxConnectAttempts: 5,
      connectRetryTimeoutMs: 1000,
      autoSendAudio: true
    }, options);
    this.callbacks = {};
    this.wsConnection = null;
    this.refreshToken = null;
    this.seq = 0;
    this.maxConnectAttempts = this.options.maxConnectAttempts;
    this.connectAttempts = this.maxConnectAttempts;
    this.connectRetryTimeoutMs = this.options.connectRetryTimeoutMs;
    this.selfDisconnect = false;
    this.incomingMessages = {};
    this.activeOutgoingMessage = null;
    this.activeOutgoingImage = null;
    this.wasOnline = false;
    this.reconnectTimeout = null;
    this.channelConfigurationError = false;
  }

  getSeq() {
    return ++this.seq;
  }

  static validateInitialOptions(initialOptions) {
    if (
      !initialOptions ||
      !initialOptions.serverUrl ||
      !initialOptions.authToken ||
      !initialOptions.channel ||
      (initialOptions.username && !initialOptions.password)
    ) {
      throw new Error(Constants.ERROR_NOT_ENOUGH_PARAMS);
    }
    if (!initialOptions.serverUrl.match(/^wss?:\/\//i)) {
      throw new Error(Constants.ERROR_INVALID_SERVER_PROTOCOL);
    }
  }

  /**
   * Connects to zello server and starts new session
   *
   * @param {function} [userCallback] callback for connection event
   * @return {promise} promise that resolves once session successfully started and rejects on sessions start error
   * @example
// promise
session.connect()
  .then(function(result) {
    console.log('Session started: ', result)
  })
  .catch(function(err) {
    console.trace(err);
  });

 // callback
session.connect(function(err, result) {
  if (err) {
    console.trace(err);
    return;
  }
  console.log('session started:', result)
});
   ***/
  connect(userCallback = null) {
    return this.connectOrReconnect(userCallback);
  }

  clearExistingReconnectTimeout() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
  }

  connectOrReconnect(userCallback = null, isReconnect = false) {
    let dfd = Promise.defer();
    if (!this.connectAttempts) {
      this.emit(
        this.channelConfigurationError ? Constants.EVENT_SESSION_DISCONNECT : Constants.EVENT_SESSION_FAIL_CONNECT
      );
      return dfd.reject('Failed to connect');
    }
    if (this.connectAttempts === this.maxConnectAttempts) {
      /**
       * The Session has opened a websocket connection to the server and ready to sign in
       * @event Session#session_start_connect
       */
      this.emit(Constants.EVENT_SESSION_START_CONNECT);
    }
    this.connectAttempts--;
    this.doConnect()
      .then(() => {
        return this.doLogon();
      })
      .then((result) => {
        if (typeof userCallback === 'function') {
          userCallback.apply(this, [null, result]);
        }
        /**
         * The Session has connected and signed in successfully
         * @event Session#session_connect
         */
        this.emit(Constants.EVENT_SESSION_CONNECT);
        dfd.resolve(result);
      })
      .catch((err) => {
        if (this.connectAttempts) {
          this.clearExistingReconnectTimeout();
          this.reconnectTimeout = setTimeout(() => {
            this.connectOrReconnect(userCallback, isReconnect);
          }, this.connectRetryTimeoutMs);
          return;
        }
        if (typeof userCallback === 'function') {
          userCallback.apply(this, [err]);
        }
        /**
         * The Session has failed to connect or sign in.
         * @event Session#session_fail_connect
         * @param {string} error Error description
         */
        /**
         * The Session was disconnected and failed to reconnect
         * @event Session#session_disconnect
         * @param {string} error Error description
         */
        this.emit(isReconnect ? Constants.EVENT_SESSION_DISCONNECT : Constants.EVENT_SESSION_FAIL_CONNECT, err);
      });
    return dfd.promise;
  }

  doConnect() {
    let dfd = Promise.defer();
    this.wsConnection = new WebSocket(this.options.serverUrl);
    this.wsConnection.binaryType = 'arraybuffer';

    this.wsConnection.addEventListener('open', () => {
      return dfd.resolve();
    });

    this.wsConnection.addEventListener('message', (event) => {
      this.wsMessageHandler(event.data);
    });

    this.wsConnection.addEventListener('error', (err) => {
      return dfd.reject(err);
    });

    this.wsConnection.addEventListener('close', (closeEvent) => {
      if (this.selfDisconnect) {
        this.selfDisconnect = false;
        return;
      }
      // disconnected from server after initial successful connection
      if (dfd.promise.inspect().state === 'fulfilled') {
        /**
         * The Session was disconnected and will try to reconnect
         * @event Session#session_connection_lost
         * @param {string} error Error description
         */
        this.emit(Constants.EVENT_SESSION_CONNECTION_LOST, closeEvent.reason);
        this.clearExistingReconnectTimeout();
        this.reconnectTimeout = setTimeout(() => {
          this.connectOrReconnect(null, true);
        }, this.connectRetryTimeoutMs);
      }
    });
    return dfd.promise;
  }

  doLogon(refreshToken = this.refreshToken) {
    let dfd = Promise.defer();
    let params = {
      'command': 'logon',
      'seq': this.getSeq(),
      'channel': this.options.channel
    };

    if (refreshToken) {
      params.refresh_token = refreshToken;
    } else {
      params.auth_token = this.options.authToken;
    }

    if (this.options.listenOnly) {
      params.listen_only = true;
    }

    if (this.options.username) {
      params.username = this.options.username;
      params.password = this.options.password;
    }

    let callback = (err, data) => {
      if (err) {
        dfd.reject(err);
        return;
      }
      dfd.resolve(data);
    };
    this.sendCommand(params, callback);
    return dfd.promise;
  }

  /**
   * Closes session and disconnects from zello server. To start session again you need to call <code>session.connect</code>
   */
  disconnect() {
    this.selfDisconnect = true;
    this.wsConnection.close();
  }

  wsBinaryDataHandler(data) {
    let parsedData = Utils.parseIncomingBinaryMessage(data);
    switch (parsedData.messageType) {
      case Constants.MESSAGE_TYPE_AUDIO:
        /**
         * The Session is receiving incoming voice message packet (with encoded audio)
         * @event Session#incoming_voice_data
         * @param {Object} incomingVoicePacket voice message packet object
         * @property {Uint8Array} messageData encoded (opus) data
         * @property {Number} messageId incoming message id
         * @property {Number} packetId incoming packet id
         */
        this.emit(Constants.EVENT_INCOMING_VOICE_DATA, parsedData);
        break;
      case Constants.MESSAGE_TYPE_IMAGE:
        this.emit(Constants.EVENT_INCOMING_IMAGE_DATA, parsedData);
        break;

    }
  }

  jsonDataHandler(jsonData) {
    if (jsonData && jsonData.seq) {
      this.handleCallbacks(jsonData);
    }
    if (jsonData.refresh_token) {
      this.refreshToken = jsonData.refresh_token;
    }
    const library = Utils.getLoadedLibrary();
    switch (jsonData.command) {
      case 'on_error':
        let error = Constants.ERROR_TYPE_UNKNOWN_SERVER_ERROR;
        if (jsonData.error) {
          error = jsonData.error;
        }
        /**
         * The Session received error message from server
         * @event Session#error
         * @param {string} error Error description
         */
        this.emit(Constants.EVENT_ERROR, error);
        break;
      case 'on_channel_status':
        /**
         * The Session is receiving channel status update
         * @event Session#status
         * @param {JSON} status JSON object
         * @property {String} channel channel name
         * @property {String} status new channel status
         * @property {Number} users_online number of online users
         */
        if (!this.wasOnline) {
          switch (jsonData.status) {
            case Constants.SN_STATUS_ONLINE:
              this.wasOnline = true;
              this.connectAttempts = this.maxConnectAttempts;
              break;
            case Constants.SN_STATUS_OFFLINE:
              if (jsonData.error && jsonData.error_type === Constants.ERROR_TYPE_CONFIGURATION) {
                this.channelConfigurationError = true;
              }
              break;
          }
        }
        this.emit(Constants.EVENT_STATUS, jsonData);
        break;
      case 'on_stream_start':
        const incomingMessage = new library.IncomingMessage(jsonData, this);
        this.incomingMessages[jsonData.stream_id] = incomingMessage;
        /**
         * Incoming voice message is about to start.
         * @event Session#incoming_voice_will_start
         * @param {ZCC.IncomingMessage} incomingMessage message instance
         */
        this.emit(Constants.EVENT_INCOMING_VOICE_WILL_START, incomingMessage);
        break;
      case 'on_stream_stop':
        /**
         * Incoming voice message stopped
         * @event Session#incoming_voice_did_stop
         * @param {ZCC.IncomingMessage} incomingMessage incoming message instance
         */
        this.emit(Constants.EVENT_INCOMING_VOICE_DID_STOP, this.incomingMessages[jsonData.stream_id]);
        break;
      case 'on_text_message':
        /**
         * Incoming channel text message
         * @event Session#incoming_text_message
         * @param json textMessage textMessage JSON
         */
        this.emit(Constants.EVENT_INCOMING_TEXT_MESSAGE, jsonData);
        break;
      case 'on_location':
        /**
         * Incoming location coordinates
         * @event Session#incoming_location
         * @param json location location data JSON
         */
        this.emit(Constants.EVENT_INCOMING_LOCATION, jsonData);
        break;
      case 'on_image':
        /**
         * Incoming image JSON metadata
         * @event Session#incoming_image
         * @param {ZCC.IncomingImage} IncomingImage incoming image instance
         */
        const incomingImage = new library.IncomingImage(jsonData, this);
        this.emit(Constants.EVENT_INCOMING_IMAGE, incomingImage);
    }
  }

  wsMessageHandler(data) {
    let jsonData = null;
    try {
      jsonData = JSON.parse(data);
    } catch (e) { }

    if (!jsonData) {
      return this.wsBinaryDataHandler(data);
    }
    return this.jsonDataHandler(jsonData);
  }

  handleCallbacks(jsonData) {
    let error = jsonData.error ? jsonData.error : null;
    let callback = this.callbacks[jsonData.seq];
    if (typeof  callback !== 'function') {
      return;
    }
    callback.apply(this, [error, jsonData]);
    delete this.callbacks[jsonData.seq];
  }

  sendCommand(params, callback = null) {
    if (params.seq && callback) {
      this.callbacks[params.seq] = callback;
    }
    this.wsConnection.send(JSON.stringify(params));
  }

  sendBinary(data) {
    this.wsConnection.send(data);
  }

  startStream(options = {}, userCallback = null) {
    return this.sendCommandWithCallback('start_stream', options, userCallback);
  }

  stopStream(options = {}, userCallback = null) {
    return this.sendCommandWithCallback('stop_stream', options, userCallback);
  }

  /**
   * Starts a voice message by creating OutgoingMessage instance
   *
   * @param {object} options options for outgoing messages.
   * Options can also include <code>recorder</code> and <code>encoder</code> overrides.
   *
   * @return {ZCC.OutgoingMessage} OutgoingMessage object
   * @example
   *
// use default recorder and encoder
var outgoingMessage = session.startVoiceMessage();

// use custom recorder
var outgoingMessage = session.startVoiceMessage({
  recorder: CustomRecorder
});

// use custom recorder and encoder
var outgoingMessage = session.startVoiceMessage({
  recorder: CustomRecorder,
  encoder: CustomEncoder
});
 **/
  startVoiceMessage(options = {}) {
    const library = Utils.getLoadedLibrary();
    this.activeOutgoingMessage = new library.OutgoingMessage(this, options);

    this.activeOutgoingMessage.on(Constants.EVENT_DATA_ENCODED, (data) => {
      if (!this.activeOutgoingMessage.options.autoSendAudio) {
        return;
      }
      this.sendBinary(data);
    });

    return this.activeOutgoingMessage;
  }

  onIncomingVoiceDidStart(incomingMessage) {
    /**
     * Incoming voice message did start (first packet received)
     *
     * @event Session#incoming_voice_did_start
     * @param {ZCC.IncomingMessage} incoming message instance
     */
    this.emit(Constants.EVENT_INCOMING_VOICE_DID_START, incomingMessage);
  }

  onIncomingVoiceDecoded(pcmData, incomingMessage) {
    /**
     * Incoming voice message packet decoded
     * @event Session#incoming_voice_data_decoded
     * @param {Float32Array} pcmData decoded pcm packet
     * @param {ZCC.IncomingMessage} incoming message instance
     */
    this.emit(Constants.EVENT_INCOMING_VOICE_DATA_DECODED, pcmData, incomingMessage);
  }

  /**
   * Starts sending an image message by creating OutgoingImage instance
   *
   * @param {object} options options for outgoing image.
   * @property {String} for optional username to send this image to
   * @property {Boolean} preview set it to false to automatically send an image without previewing.
   *                              if set to true (default) you will need to call OutgoingImage.send() to send an image
   * @property {File} File object (optional) if provided this file is send as an image with a source 'library'
   *
   * @return {ZCC.OutgoingImage} OutgoingImage object
   * @example
   *
   var outgoingImage = session.sendImage({
    preview: false,
    for: 'username'
   });
   **/
  sendImage(options = {}) {
    const library = Utils.getLoadedLibrary();
    this.activeOutgoingImage = new library.OutgoingImage(this, options);
    return this.activeOutgoingImage;
  }

  /**
   * Sends a text message
   *
   * @param {object} options options for outgoing text message.
   * @property {String} for optional username to send this text message to
   * @property {String} text message text
   *
   * @param {function} [userCallback] callback that is fired on message being send or failed to be sent
   * @return {promise} promise that resolves once session successfully send a text message and rejects if
   *                   text message sending failed
   * @example
   *
   session.sendTextMessage({
    for: 'username',
    text: 'Hello Zello!'
   });
   **/
  sendTextMessage(options = {}, userCallback = null) {
    return this.sendCommandWithCallback('send_text_message', options, userCallback);
  }

  sendLocation(options = {}, userCallback = null) {
    return this.sendCommandWithCallback('send_location', options, userCallback)
  }

  sendCommandWithCallback(command, options, userCallback = null) {
    options.seq = this.getSeq();
    options.command = command;
    let dfd = Promise.defer();
    let callback = (err, data) => {
      if (err) {
        if (typeof userCallback === 'function') {
          userCallback.apply(this, [err]);
        }
        dfd.reject(err);
        return;
      }
      if (typeof userCallback === 'function') {
        userCallback.apply(this, [null, data]);
      }
      dfd.resolve(data);
    };
    this.sendCommand(options, callback);
    return dfd.promise;
  }

}

module.exports = Session;
