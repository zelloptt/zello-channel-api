const Emitter = require('component-emitter');
const Promise = require('q');
const Constants = require('./constants');

/**
 * @classdesc Session class to start session with zello server and interact with it
 * [using zello channel api](https://github.com/zelloptt/zello-channel-api/blob/master/API.md)
 * @example
var session = new ZCC.Session({
  serverUrl: 'wss://zellowork.io/ws/[yournetworkname]',
  username: [username],
  password: [password]
  channel: [channel],
  authToken: [authToken]
});
 **/
class Session extends Emitter {
  /**
   * @param {object} params session parameters. Example:
   **/
  constructor(params) {
    super();
    Session.validateInitialParams(params);
    this.initialParams = params;
    this.callbacks = {};
    this.wsConnection = null;
    this.refreshToken = null;
    this.seq = 0;
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
   * Connects to zello server
   *
   * @param {function} [userCallback] callback for connection event
   * @return {promise} promise that resolves once connected and rejects on connection error
   * @example
session.connect(function(err) {
  if (err) {
    console.trace(err);
    return;
  }
  console.log('connected');
})
 .then(function() {
  console.log('connected');
})
 .fail(function(err) {
  console.trace(err);
 })
   * */
  connect(userCallback = null) {
    let dfd = Promise.defer();
    this.wsConnection = new WebSocket(this.initialParams.serverUrl);
    this.wsConnection.binaryType = 'arraybuffer';
    let connnected = false;
    this.wsConnection.addEventListener('open', () => {
      if (typeof userCallback === 'function') {
        userCallback.apply(this, [null])
      }
      this.emit(Constants.EVENT_CONNECT);
      connnected = true;
      return dfd.resolve();
    });

    this.wsConnection.addEventListener('message', (event) => {
      this.wsMessageHandler(event.data);
    });

    this.wsConnection.addEventListener('error', (err) => {
      // connection error
      if (!connnected) {
        connnected = true;
        if (typeof userCallback === 'function') {
          userCallback.apply(this, [err]);
        }
        return dfd.reject(err);
      }
      // handle other errors here
    });

    this.wsConnection.addEventListener('close', (event) => {
      this.emit(Constants.EVENT_CLOSE);
    });
    return dfd.promise;
  }

  /**
   * Login to connected server using parameters from constructor
   *
   * @param {function} [userCallback] callback for logon event
   * @param {string} [refreshToken] refresh_token for re-logon case
   * @return {promise} promise that resolves once successfully logged and rejects on logon error
   * @example
session.logon(function(err) {
  if (err) {
    console.trace(err);
    return;
  }
  console.log('logged in');
})
  .then(function() {
    console.log('logged in');
  })
   .fail(function(err) {
    console.trace(err);
  })
   */
  logon(userCallback = null, refreshToken = '') {
    let dfd = Promise.defer();
    let params = {
      'command': 'logon',
      'seq': this.getSeq(),
      'channel': this.initialParams.channel
    };

    if (refreshToken) {
      params.refresh_token = refreshToken;
    } else {
      params.auth_token = this.initialParams.authToken;
    }

    if (this.initialParams.listenOnly) {
      params.listen_only = true;
    }

    if (this.initialParams.username) {
      params.username = this.initialParams.username;
      params.password = this.initialParams.password;
    }

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
   * Closes session and disconnects from zello server. To start session again you need to call `connect` and `logon`
   */
  disconnect() {
    this.wsConnection.close();
  }

  wsBinaryDataHandler(data) {
    this.emit(Constants.EVENT_AUDIO_PACKET_IN, Session.parseIncomingBinaryMessage(data));
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
        this.emit(Constants.EVENT_STREAM_START, jsonData);
        break;
      case 'on_stream_stop':
        this.emit(Constants.EVENT_STREAM_STOP, jsonData);
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