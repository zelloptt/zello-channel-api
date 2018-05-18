const Emitter = require('component-emitter');
const Promise = require('q');
const Constants = require('./constants');
const Utils = require('./utils');

/**
 * @classdesc Session class to start session with zello server and interact with it
 * [using zello channel api](https://github.com/zelloptt/zello-channel-api/blob/master/API.md)
 * @example
var session = new ZCC.Session({
  serverUrl: 'wss://zellowork.io/ws/[yournetworkname]',
  username: [username],
  password: [password]
  channel: [channel],
  authToken: [authToken],
  incomingMessageDecoder: function() { }, // optional function to override incoming message decoder.
                                          // should return an instance of class that implements see {@link Decoder} interface

  incomingMessagePlayer: function() {},   // optional function to override incoming message player
                                          // should return an instance of class that implements Player interface[link]


);
 **/
class Session extends Emitter {
  /**
   * @param {object} params session parameters. Example:
   **/
  constructor(params) {
    super();
    Session.validateInitialParams(params);
    this.options = Object.assign({
      maxConnectAttempts: 5,
      connectRetryTimeoutMs: 1000
    }, params);
    this.callbacks = {};
    this.wsConnection = null;
    this.refreshToken = null;
    this.seq = 0;
    this.maxConnectAttempts = this.options.maxConnectAttempts;
    this.connectAttempts = this.maxConnectAttempts;
    this.connectRetryTimeoutMs = this.options.connectRetryTimeoutMs;
    this.selfDisconnect = false;
    this.incomingMessages = {};
  }

  getSeq() {
    return ++this.seq;
  }

  static validateInitialParams(initialParams) {
    if (
      !initialParams ||
      !initialParams.serverUrl ||
      !initialParams.authToken ||
      !initialParams.channel ||
      (initialParams.username && !initialParams.password)
    ) {
      throw new Error(Constants.ERROR_NOT_ENOUGH_PARAMS);
    }
    if (!initialParams.serverUrl.match(/^wss?:\/\//i)) {
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
   * Closes session and disconnects from zello server. To start session again you need to call `connect`
   */
  disconnect() {
    this.selfDisconnect = true;
    this.wsConnection.close();
  }

  wsBinaryDataHandler(data) {
    this.emit(Constants.EVENT_INCOMING_VOICE_DATA, Session.parseIncomingBinaryMessage(data));
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
        this.emit(Constants.EVENT_STATUS, jsonData);
        break;
      case 'on_stream_start':
        const library = Utils.getLoadedLibrary();
        const incomingMessage = new library.IncomingMessage(jsonData, this);
        this.incomingMessages[jsonData.stream_id] = incomingMessage;
        this.emit(Constants.EVENT_INCOMING_VOICE_WILL_START, incomingMessage);
        break;
      case 'on_stream_stop':
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

  static parseIncomingBinaryMessage(binaryData) {
    let headerView = new DataView(binaryData.slice(0, 9));
    return {
      messageData: new Uint8Array(binaryData.slice(9)),
      messageId: headerView.getUint32(1, false),
      packetId: headerView.getUint32(5, false)
    }
  }

}

module.exports = Session;