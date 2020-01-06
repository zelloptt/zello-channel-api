# Zello Channels SDK

## Overview

The Zello Channels SDK allows you to integrate Zello push-to-talk into your own application. The SDK communicates with a Zello server over a web socket connection using a JSON-based protocol, and offers a simple API for connecting to a Zello channel and sending and receiving audio. Supported features include:

* Send voice messages from the device microphone
* Play incoming voice messages through the device speaker
* Send voice messages from your own audio code, _e.g._ from a file
* Receive voice message data with your own audio code with optional pass-through to the device speaker

The [protocol specification](https://github.com/zelloptt/zello-channel-api/blob/master/API.md) is also available if you prefer to develop your own client in-house.

## Current Version

The Zello Channels SDK 0.5 is currently in beta.

## Installation

### Android

#### Prerequisites

Use [Android Studio](https://developer.android.com/studio/) 3.2.1 or newer to develop with Zello Channels SDK for Android. The SDK is delivered as .aar library but you can also build it from [source](android/sdk).

#### Configure your project

Open your project in Android Studio or create a new one. Alternatively you can use a [demo](android/demo) included with the SDK to get started.

Click `File > New > New Module`. Click `Import .JAR/.AAR Package` then click Next. Browse for `zello-channel-sdk.aar` then click Finish.

Make sure `':zello-channel-sdk'` is listed at the top of your `settings.gradle` file:

```
include ':app', ':zello-channel-sdk'
``` 

Add `implementation project(':zello-channel-sdk')` to `dependencies` section of your `build.gradle` file for the main app module. Example:

```gradle
dependencies {
    implementation project(':zello-channel-sdk')
}
```
For additional information please refer to the Android Studio [documentation](https://developer.android.com/studio/projects/android-library#AddDependency).


### iOS

#### Prerequisites

The Zello Channels SDK for iOS was developed using Xcode 10.3 and has not been tested with earlier versions. We recommend using Xcode 10.3 or newer to develop apps that incorporate the Zello Channels SDK.

[Download Xcode](https://itunes.apple.com/us/app/xcode/id497799835?mt=12) and install it. Open your existing project or create a new one. The minimum iOS version supported by the Zello Channels SDK is iOS 9.3.

#### Configure your project

ZelloChannelKit is distributed as a cocoapod. If you are not already using Cocoapods in your project, follow [the instructions](https://cocoapods.org/) to download and set it up. Add the following line to your `Podfile`:

```
pod 'ZelloChannelKit', '~> 0.5'
```

### Browser JavaScript
Load SDK and then call `ZCC.Sdk.init` method with optional parameters to disable loading of certain components.

```html
<!-- Load sdk using <script> tag: -->
<script src="https://zello.io/sdks/js/0.1/zcc.sdk.js"></script>
<script>
    // callback style
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
</script>

<!-- 
    Load sdk using async script loader (e.g. scriptjs)
    Once SDK is loaded, call .init method
-->
<script>
$script(['https://zello.io/sdks/js/0.1/zcc.sdk.js'], function() {
    // promise style
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
});
</script>
```

## Using the SDK

### Getting an authentication token

Use [these instructions](https://github.com/zelloptt/zello-channel-api/blob/master/AUTH.md) to get authentication token for your app.

Development tokens are only valid for use during development of your app. When you are ready to build your app for production, you will need to create authentication tokens on your own server and provide them to the client app as described above. Otherwise, your app may become unable to connect to the Zello Channel server unexpectedly when the development token expires.

### Creating a session and logging on

###### Android
Each connection to the Zello server is represented by a `Session` object. When you create the `Session` object, you provide it with the address for the Zello server, your authentication token, the name of the channel you are connecting to, and optionally a username and password. 
You should also supply a `SessionListener` object so your app can be informed about session events such as disconnections and incoming messages.

```kotlin
val session = Session.Builder(this, serverAddress, myToken, "mysteries").
					setUsername("sherlock", "secret").build()
session.sessionListener = this
session.connect()
```

###### iOS
Each connection to the Zello server is represented by a `ZCCSession` object. When you create the `ZCCSession` object, you provide it with the address for the Zello server, your authentication token, the name of the channel you are connecting to, and optionally a username and password. 
You should also supply a `ZCCSessionDelegate` object so your app can be informed about session events such as disconnections and incoming messages.

```objc
ZCCSession *session = [[ZCCSession alloc] initWithURL:serverURL
                                            authToken:myToken
                                                 user:@"sherlock"
                                             password:@"secret"
                                              channel:@"mysteries"
                                        callbackQueue:nil];
session.delegate = myDelegate;
[session connect];
```

###### Browser JavaScript
Each connection to the Zello server is represented by a `ZCC.Session` object. 
When you create the `ZCC.Session` object, you provide it with the address for the Zello server, your authentication token, the name of the channel you are connecting to, 
and optionally a username and password. 

```javascript
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

session.connect().then(function() {
  // connected
});
```

`serverURL` can be one of the [API entry points](https://github.com/zelloptt/zello-channel-api/blob/master/API.md#api-entry-points).

### Sending voice messages

###### Android
To start a voice message to the channel, call `Session.startVoiceMessage()`. It returns `OutgoingVoiceStream` object representing audio stream to the channel. To stop sending the message, call `stop()` on the outgoing stream object.

```kotlin
fun pttDown() {
    stream = session.startVoiceMessage()
}

fun pttUp() {
    stream.stop()
}
```

###### iOS
To start a voice message to the channel, call `-[ZCCSession startVoiceMessage]`. `startVoiceMessage` returns a `ZCCOutgoingVoiceStream` object representing the audio stream to the server. To stop sending the message, call `-stop` on the outgoing stream object.

```objc
// Action method for Touch Down
- (IBAction)buttonPressed:(id)sender {
  self.stream = [self.session startVoiceMessage];
}

// Action method for Touch Up Inside and Touch Up Outside
- (IBAction)buttonReleased:(id)sender {
  [self.stream stop];
}
```

###### Browser JavaScript
To start a voice message to the channel, call `ZCC.Session.startVoiceMessage`. `startVoiceMessage` returns a `ZCC.OutgoingMessage` object representing the audio stream to the server. 
To stop sending the message, call `stop` on the outgoing stream object.

```javascript
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

// stop outgoing message in 5 seconds
setTimeout(function() {
  outgoingMessage.stop();  
}, 5000)

```

### Handling session events
The Zello Channels SDK contains an events interface which you can implement to be notified about changes in incoming and outgoing messages, state, app online status, sign in progress etc. In most cases, your implementation will be a part of your activity code.

###### Android
In Android, the events interface is `SessionListener`.

|Android Callback|Description
|---|---
|`onConnectStarted()`|The Session has opened a web socket connection to the server.
|`onConnectFailed()`|Either the web socket connection failed or the logon failed. Check the error parameter for more details.
|`onConnectSucceeded()`|Logon completed successfully and you are set to send and receive voice messages.
|`onDisconnected()`|Session has disconnected from the server. The Zello Channels SDK attempts to stay connected through network changes, so there may be a delay between the network disconnection and this callback being called, as the SDK retries connecting and eventually times out.
|`onSessionWillReconnect()`|The Session has become disconnected unexpectedly. By default, it will attempt to reconnect after a delay. You can return `false` from this method to prevent the automatic reconnect.
|`onOutgoingVoiceError()`|An error has occurred with an outgoing voice stream. When this is called, the stream has been closed.
|`onOutgoingVoiceStateChanged()`|An outgoing voice stream has changed its internal state.
|`onOutgoingVoiceProgress()`|This callback is called periodically as voice data is encoded.
|`onIncomingVoiceWillStart()`|This callback is called when an incoming voice stream is about to start. By returning an incoming voice configuration object, you can perform custom processing of the incoming voice stream, _e.g._ record it to storage or prevent it from producing audio.
|`onIncomingVoiceStarted()`|An incoming voice stream has been established and has started playing.
|`onIncomingVoiceStopped()`|An incoming voice stream has finished playing.
|`onIncomingVoiceProgress()`|This callback is called periodically as incoming voice data is decoded.

###### iOS
In iOS, the events interface is `ZCCSessionDelegate`.

|iOS Callback|Description
|---|---
|`sessionDidStartConnecting:`|The Session has opened a web socket connection to the server.
|`session:didFailToConnectWithError:`|Either the web socket connection failed or the logon failed. Check the error parameter for more details.
|`sessionDidConnect:`|Logon completed successfully and you are set to send and receive voice messages.
|`sessionDidDisconnect:`|Session has disconnected from the server. The Zello Channels SDK attempts to stay connected through network changes, so there may be a delay between the network disconnection and this callback being called, as the SDK retries connecting and eventually times out.
|`session:willReconnectForReason:`|The Session has become disconnected unexpectedly. By default, it will attempt to reconnect after a delay. You can return `NO` from this method to prevent the automatic reconnect.
|`session:outgoingVoice:didEncounterError:`|An error has occurred with an outgoing voice stream. When this is called, the stream has been closed.
|`session:outgoingVoiceDidChangeState:`|An outgoing voice stream has changed its internal state.
|`session:outgoingVoice:didUpdateProgress:`|This callback is called periodically as voice data is encoded.
|`session:incomingVoiceWillStart:`|This callback is called when an incoming voice stream is about to start. By returning an incoming voice configuration object, you can perform custom processing of the incoming voice stream, _e.g._ record it to storage or prevent it from producing audio.
|`session:incomingVoiceDidStart:`|An incoming voice stream has been established and has started playing.
|`session:incomingVoiceDidStop:`|An incoming voice stream has finished playing.
|`session:incomingVoice:didUpdateProgress:`|This callback is called periodically as incoming voice data is decoded.
|`sessionDidUpdateChannelStatus:`|The channel the session is connected to has changed its status. The Session contains information about the numbers of users connected to the channel and the messaging features supported by the channel.
|`session:didReceiveText:from:`|A text message has been received on the channel.
|`session:didReceiveImage:`|An image message has been received on the channel.
|`session:didReceiveLocation:from:`|A location message has been received on the channel.
|`session:didEncounterError:`|A non-fatal error has been encountered. The Session is still connected to the channel and can still be used.

> __NB:__ `ZCCSessionDelegate` methods are called on the dispatch queue you provided to the `ZCCSession` initializer. If you did not provide a dispatch queue, the delegate methods are called on the main dispatch queue.

###### Browser JavaScript
|JavaScript callback|Description
|---|---
|`Session.session_start_connect`|The Session has opened a web socket connection to the server.
|`Session.session_fail_connect`|Either the web socket connection failed or the logon failed. Check the error parameter for more details.
|`Session.session_connect`|Logon completed successfully and you are set to send and receive voice messages.
|`Session.session_disconnect`|Session has disconnected from the server. The Zello Channels SDK attempts to stay connected through network changes, so there may be a delay between the network disconnection and this callback being called, as the SDK retries connecting and eventually times out.
|`Session.error`|Error happened
|`Session.status`|Session received channel status update
|`Session.incoming_voice_will_start`|This event is fired when an incoming voice stream is about to start. `IncomingMessage` object is returned
|`Session.incoming_voice_did_start`|Incoming voice message did start (first packet received)
|`Session.incoming_voice_did_stop`|An incoming voice stream has finished playing.
|`IncomingMessage.incoming_voice_data`|Incoming voice message packet (with encoded audio)
|`IncomingMessage.incoming_voice_data_decoded`|Incoming voice message packet decoded
|`OutgoingMessage.data`|Outgoing message pcm data portion from recorder is ready to be encoded
|`OutgoingMessage.data_encoded`|Outgoing message portion is encoded and ready to be sent to zello server. Session instance is following this event and sends data automatically

## Going live with your Zello-enabled app

All apps using Zello SDK must adhere to the following guidelines:

* All UI screens, embedding Zello SDK must include Zello logo
* Use Zello logo and / or "Zello", "ZelloWork" names, when referencing to Zello inside of your app
* [Send us the app for review](https://zellowork.com/contact/) before distributing the app to any third parties or customers


## Additional resources

* [Android SDK API reference](https://zelloptt.github.io/zello-channel-api/Android/com.zello.channel.sdk/)
* [iOS SDK API reference](https://zelloptt.github.io/zello-channel-api/iOS/)
* [Browser Javascript API reference](https://zelloptt.github.io/zello-channel-api/js/Sdk.html)
* [Zello Channel Server API](https://github.com/zelloptt/zello-channel-api/blob/master/API.md)

### Licenses
* Zello Channel SDK for Android incorporates OkHttp, Copyright 2016 Square, Inc. under [Apache License, Version 2.0](http://www.apache.org/licenses/LICENSE-2.0).
* ZelloChannelKit incorporates portions of SocketRocket, Copyright 2016-present, Facebook, Inc. under the [BSD license](https://github.com/facebook/SocketRocket/blob/685f756f22bc9dbee9b98cfec47bc05ccc03e9b9/LICENSE).
* ZelloChannelKit incorporates the Opus audio codec under the [BSD license](http://opus-codec.org/license/).
