## Classes

<dl>
<dt><a href="#Sdk">Sdk</a></dt>
<dd><p>SDK functions support both callbacks with <code>(err, result)</code> arguments
and also return promises that resolve with <code>result</code> argument or fail with <code>err</code> argument.</p>
<p>Load sdk using <code>script</code> tag:</p>
<pre><code class="lang-html">&lt;script src=&quot;https://zello.com/zcc/0.0.1/zcc.sdk.js&quot;&gt;&lt;/script&gt;
&lt;script&gt;
  console.log(ZCC);
&lt;/script&gt;
</code></pre>
<p>Load sdk using async script loader (e.g. scriptjs)</p>
<pre><code class="language-javascript">$script([&#39;https://zello.com/zcc/0.0.1/zcc.sdk.js&#39;], function() {
 console.log(ZCC);
});
</code></pre>
</dd>
<dt><a href="#Session">Session</a></dt>
<dd><p>Session class to start session with zello server and interact with it
<a href="https://github.com/zelloptt/zello-channel-api/blob/master/API.md">using zello channel api</a></p>
</dd>
</dl>

## Functions

<dl>
<dt><a href="#getSampleRate">getSampleRate()</a> ⇒ <code>number</code></dt>
<dd><p>Get decoder sample rate (required by default PCM player)
Required to implement but not used unless you will be using default PCM player</p>
</dd>
<dt><a href="#decode">decode(encodedMessageData)</a> ⇒ <code>undefined</code></dt>
<dd><p>Decode incoming opus to pcm</p>
</dd>
<dt><a href="#feed">feed(decoded)</a> ⇒ <code>undefined</code></dt>
<dd><p>Send PCM data to play</p>
</dd>
</dl>

## Interfaces

<dl>
<dt><a href="#Decoder">Decoder</a></dt>
<dd><p>Decoder interface</p>
</dd>
<dt><a href="#Player">Player</a></dt>
<dd><p>Player interface</p>
</dd>
</dl>

<a name="Decoder"></a>

## Decoder
Decoder interface

**Kind**: global interface  
<a name="Decoder+event_decode"></a>

### "decode"
`decode` event

**Kind**: event emitted by [<code>Decoder</code>](#Decoder)  
**Example**  
```js
decoder.on('decode', function(pcmData: Float32Array) { });
```
<a name="Player"></a>

## Player
Player interface

**Kind**: global interface  
<a name="Sdk"></a>

## Sdk
SDK functions support both callbacks with `(err, result)` arguments
and also return promises that resolve with `result` argument or fail with `err` argument.

Load sdk using `script` tag:
```html
<script src="https://zello.com/zcc/0.0.1/zcc.sdk.js"></script>
<script>
  console.log(ZCC);
</script>
```

Load sdk using async script loader (e.g. scriptjs)
```js
$script(['https://zello.com/zcc/0.0.1/zcc.sdk.js'], function() {
 console.log(ZCC);
});
```

**Kind**: global class  
<a name="Sdk.init"></a>

### Sdk.init([options], [userCallback]) ⇒ <code>promise</code>
Initialize SDK parts and components.
Loads required parts

Recorder will fail to load on `http://` pages, it requires `https://`

**Kind**: static method of [<code>Sdk</code>](#Sdk)  
**Returns**: <code>promise</code> - promise that resolves when sdk parts required by this init call are loaded  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [options] | <code>object</code> |  | list of components to be loaded (see example). |
| [userCallback] | <code>function</code> | <code></code> | user callback to fire when sdk parts required by this init call are loaded |

**Example**  
```js
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
```
<a name="Session"></a>

## Session
Session class to start session with zello server and interact with it
[using zello channel api](https://github.com/zelloptt/zello-channel-api/blob/master/API.md)

**Kind**: global class  

* [Session](#Session)
    * [new Session(params)](#new_Session_new)
    * [.connect([userCallback])](#Session+connect) ⇒ <code>promise</code>
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
  authToken: [authToken],
  incomingMessageDecoder: function() { }, // optional function to override incoming message decoder.
                                          // should return an instance of class that implements see [Decoder](#Decoder) interface

  incomingMessagePlayer: function() {},   // optional function to override incoming message player
                                          // should return an instance of class that implements Player interface[link]


);
```
<a name="Session+connect"></a>

### session.connect([userCallback]) ⇒ <code>promise</code>
Connects to zello server and starts new session

**Kind**: instance method of [<code>Session</code>](#Session)  
**Returns**: <code>promise</code> - promise that resolves once session successfully started and rejects on sessions start error  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [userCallback] | <code>function</code> | <code></code> | callback for connection event |

**Example**  
```js
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
```
<a name="Session+disconnect"></a>

### session.disconnect()
Closes session and disconnects from zello server. To start session again you need to call `connect`

**Kind**: instance method of [<code>Session</code>](#Session)  
<a name="getSampleRate"></a>

## getSampleRate() ⇒ <code>number</code>
Get decoder sample rate (required by default PCM player)
Required to implement but not used unless you will be using default PCM player

**Kind**: global function  
**Example**  
```js
console.log(decoder.getSampleRate())
// outputs 24000
```
<a name="decode"></a>

## decode(encodedMessageData) ⇒ <code>undefined</code>
Decode incoming opus to pcm

**Kind**: global function  
**Emits**: [<code>decode</code>](#Decoder+event_decode)  

| Param | Type | Description |
| --- | --- | --- |
| encodedMessageData | <code>Uint8Array</code> | encoded opus data |

**Example**  
```js
decoder.decode(encodedMessageData: Uint8Array);
```
<a name="feed"></a>

## feed(decoded) ⇒ <code>undefined</code>
Send PCM data to play

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| decoded | <code>Float32Array</code> | PCM audio data |

**Example**  
```js
player.feed(audioData: Float32Array);
```
