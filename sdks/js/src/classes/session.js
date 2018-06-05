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
    this.options = Object.assign(library.Sdk.initOptions, {
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

  connectOrReconnect(userCallback = null, isReconnect = false) {
    let dfd = Promise.defer();
    if (this.connectAttempts === this.maxConnectAttempts) {
      /**
       * The Session has opened a websocket connection to the server and ready to sign in
       * @event Session#session_start_connect
       */
      this.emit(Constants.EVENT_SESSION_START_CONNECT);
    }
    this.doConnect()
      .then(() => {
        return this.doLogon();
      })
      .then((result) => {
        if (typeof userCallback === 'function') {
          userCallback.apply(this, [null, result]);
        }
        this.connectAttempts = this.maxConnectAttempts;
        /**
         * The Session has connected and signed in successfully
         * @event Session#session_connect
         */
        this.emit(Constants.EVENT_SESSION_CONNECT);
        dfd.resolve(result);
      })
      .catch((err) => {
        if (this.connectAttempts) {
          this.connectAttempts--;
          setTimeout(() => {
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

    this.wsConnection.addEventListener('close', (err) => {
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
        this.emit(Constants.EVENT_SESSION_CONNECTION_LOST, err);
        this.connectOrReconnect(null, true);
      }
    });
    return dfd.promise;
  }

  doLogon(refreshToken = '') {
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
    /**
     * The Session is receiving incoming voice message packet (with encoded audio)
     * @event Session#incoming_voice_data
     * @param {Object} incomingVoicePacket voice message packet object
     * @property {Uint8Array} messageData encoded (opus) data
     * @property {Number} messageId incoming message id
     * @property {Number} packetId incoming packet id
     */
    this.emit(Constants.EVENT_INCOMING_VOICE_DATA, Utils.parseIncomingBinaryMessage(data));
  }

  jsonDataHandler(jsonData) {
    if (jsonData && jsonData.seq) {
      this.handleCallbacks(jsonData);
    }
    if (jsonData.refresh_token) {
      this.refreshToken = jsonData.refresh_token;
    }
    switch (jsonData.command) {
      case 'on_channel_status':
        /**
         * The Session is receiving channel status update
         * @event Session#status
         * @param {JSON} status JSON object
         * @property {String} channel channel name
         * @property {String} status new channel status
         * @property {Number} users_online number of online users
         */
        this.emit(Constants.EVENT_STATUS, jsonData);
        break;
      case 'on_stream_start':
        const library = Utils.getLoadedLibrary();
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

  startStream(params, userCallback = null) {
    params.seq = this.getSeq();
    params.command = 'start_stream';
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
    this.sendCommand(params, callback);
    return dfd.promise;
  }

  stopStream(params, userCallback = null) {
    params.seq = this.getSeq();
    params.command = 'stop_stream';
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
    this.sendCommand(params, callback);
    return dfd.promise;
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

}

module.exports = Session;