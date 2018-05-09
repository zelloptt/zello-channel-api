## Classes

<dl>
<dt><a href="#Sdk">Sdk</a></dt>
<dd><p>SDK functions support both callbacks with <code>(err, result)</code> arguments
and also return promises that resolve with <code>result</code> argument or fail with <code>err</code> argument.</p>
<dt><a href="#Session">Session</a></dt>
<dd><p>Session class to start session with zello server and interact with it
<a href="https://github.com/zelloptt/zello-channel-api/blob/master/API.md">using zello channel api</a></p>
</dd>
<dt><a href="#Widget">Widget</a></dt>
<dd><p>Widget class to initialize player (in widget or headless mode) that plays incoming messages and provides
interface to record messages in supported browsers and environments (https only)</p>
</dd>
</dl>

<a name="Sdk"></a>

## Sdk
SDK functions support both callbacks with `(err, result)` arguments
and also return promises that resolve with `result` argument or fail with `err` argument.

Load sdk using `script` tag:
```html
<script src="https://zello.com/zcc/0.0.1/zcc.Sdk.js"></script>
<script>
  console.log(ZCC);
</script>
```

Load sdk using async script loader (e.g. scriptjs)
```js
$script(['https://zello.com/zcc/0.0.1/zcc.Sdk.js'], function() {
 console.log(ZCC);
});
```

**Kind**: global class  
<a name="Sdk.init"></a>

### Sdk.init([options], [userCallback]) ⇒ <code>promise</code>
Initialize SDK parts and components.
Loads required parts and initializes session and widget if necessary.

Recorder will fail to load on `http://` pages, it requires `https://`

If `options.widget.autoInit` is set it will initialize the player widget.

If `options.widget.headless` is false, it will require `options.widget.element` to be an existing DOM element.

If `options.session.autoInit` is true, it will create `ZCC.Session` instance, connect,
login and link it to ZCC.Widget instance

**Kind**: static method of [<code>Sdk</code>](#Sdk)  
**Returns**: <code>promise</code> - promise that resolves when sdk parts required by this init call are loaded  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [options] | <code>object</code> |  | initial options for sdk and other components |
| [userCallback] | <code>function</code> | <code></code> | user callback to fire when sdk parts required by this init call are loaded |

**Example**  
```js
ZCC.Sdk.init({
  recorder: document.location.protocol.match(/https/),
  player: true,
  widget: {
    headless: false,
    autoInit: true,
    element: document.getElementById('player')
  },
  session: {
    autoInit: true,
    serverUrl: 'wss://zellowork.io/ws/[yournetworkname]',
    channel: '[channel]',
    authToken: '[authToken]',
    username: '[username]',
    password: '[password]',
    onConnect: function(err, result) {},
    onLogon: function(err, result) {}
  }
}, function(err) {
  if (err) {
    console.trace(err);
    return;
  }
  console.log('zcc sdk parts loaded')
}).then(function() {
  console.log('zcc sdk parts loaded')
}).fail(function(err) {
  console.trace(err);
})
```
<a name="Session"></a>

## Session
Session class to start session with zello server and interact with it
[using zello channel api](https://github.com/zelloptt/zello-channel-api/blob/master/API.md)

**Kind**: global class  

* [Session](#Session)
    * [new Session(params)](#new_Session_new)
    * [.connect([userCallback])](#Session+connect) ⇒ <code>promise</code>
    * [.logon([userCallback], [refreshToken])](#Session+logon) ⇒ <code>promise</code>
    * [.disconnect()](#Session+disconnect)

<a name="new_Session_new"></a>

### new Session(params)

| Param | Type | Description |
| --- | --- | --- |
| params | <code>object</code> | session parameters. Example: |

**Example**  
```js
var session = new ZCC.Session({
  serverUrl: 'wss://zellowork.io/ws/[yournetworkname]',
  username: [username],
  password: [password]
  channel: [channel],
  authToken: [authToken]
});
```
<a name="Session+connect"></a>

### session.connect([userCallback]) ⇒ <code>promise</code>
Connects to zello server

**Kind**: instance method of [<code>Session</code>](#Session)  
**Returns**: <code>promise</code> - promise that resolves once connected and rejects on connection error  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [userCallback] | <code>function</code> | <code></code> | callback for connection event |

**Example**  
```js
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
```
<a name="Session+logon"></a>

### session.logon([userCallback], [refreshToken]) ⇒ <code>promise</code>
Login to connected server using parameters from constructor

**Kind**: instance method of [<code>Session</code>](#Session)  
**Returns**: <code>promise</code> - promise that resolves once successfully logged and rejects on logon error  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [userCallback] | <code>function</code> | <code></code> | callback for logon event |
| [refreshToken] | <code>string</code> |  | refresh_token for re-logon case |

**Example**  
```js
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
```
<a name="Session+disconnect"></a>

### session.disconnect()
Closes session and disconnects from zello server. To start session again you need to call `connect` and `logon`

**Kind**: instance method of [<code>Session</code>](#Session)  
<a name="Widget"></a>

## Widget
Widget class to initialize player (in widget or headless mode) that plays incoming messages and provides
interface to record messages in supported browsers and environments (https only)

**Kind**: global class  
<a name="new_Widget_new"></a>

### new Widget(params)

| Param | Type | Description |
| --- | --- | --- |
| params | <code>object</code> | including `widget` section (see example). |

**Example**  
```js
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
```
