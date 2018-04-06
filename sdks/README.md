# Zello Channels SDK

## Overview

The Zello Channels SDK allows you to integrate Zello push-to-talk into your own application. The SDK communicates with a Zello server over a web socket connection using a JSON-based protocol, and offers a simple API for connecting to a Zello channel and sending and receiving audio. Supported features include:

* Send voice messages from the device microphone
* Play incoming voice messages through the device speaker
* Send voice messages from your own audio code, _e.g._ from a file
* Receive voice message data with your own audio code with optional pass-through to the device speaker

The protocol specification is also available if you prefer to develop your own client in-house.

## Current Version

The Zello Channels SDK 1.0 is currently in beta.

## Installation

### iOS

#### Prerequisites

The Zello Channels SDK for iOS was developed using Xcode 9.2 and has not been tested with earlier versions. We recommend using Xcode 9.2 or newer to develop apps that incorporate the Zello Channels SDK.

[Download Xcode](https://itunes.apple.com/us/app/xcode/id497799835?mt=12) and install it. Open your existing project or create a new one. The minimum iOS version supported by the Zello Channels SDK is iOS 9.3.

#### Configure your project

Select your project in Xcode, and drag the `ZelloChannelKit.framework` file into the Embedded Binaries section of the project's General tab. This should set up the project to link against the ZelloChannelKit framework and include it in the packaged app.

`ZelloChannelKit.framework` is compiled to run on both devices and in the iOS simulator. Before you can release your app, you must remove the simulator code from the framework. You can configure Xcode to automatically remove the simulator code from embedded frameworks for Release builds. Select the Build Phases tab for your project and click the + button to add a new Run Script phase. Copy the following script into the box:

```sh
if [ "${CONFIGURATION}" != "Debug" ]; then
APP_PATH="${TARGET_BUILD_DIR}/${WRAPPER_NAME}"

# This script loops through the frameworks embedded in the application and
# removes unused architectures.
find "$APP_PATH" -name '*.framework' -type d | while read -r FRAMEWORK
do
FRAMEWORK_EXECUTABLE_NAME=$(defaults read "$FRAMEWORK/Info.plist" CFBundleExecutable)
FRAMEWORK_EXECUTABLE_PATH="$FRAMEWORK/$FRAMEWORK_EXECUTABLE_NAME"
echo "Executable is $FRAMEWORK_EXECUTABLE_PATH"

EXTRACTED_ARCHS=()

for ARCH in $ARCHS
do
echo "Extracting $ARCH from $FRAMEWORK_EXECUTABLE_NAME"
lipo -extract "$ARCH" "$FRAMEWORK_EXECUTABLE_PATH" -o "$FRAMEWORK_EXECUTABLE_PATH-$ARCH"
EXTRACTED_ARCHS+=("$FRAMEWORK_EXECUTABLE_PATH-$ARCH")
done

echo "Merging extracted architectures: ${ARCHS}"
lipo -o "$FRAMEWORK_EXECUTABLE_PATH-merged" -create "${EXTRACTED_ARCHS[@]}"
rm "${EXTRACTED_ARCHS[@]}"

echo "Replacing original executable with thinned version"
rm "$FRAMEWORK_EXECUTABLE_PATH"
mv "$FRAMEWORK_EXECUTABLE_PATH-merged" "$FRAMEWORK_EXECUTABLE_PATH"

done
fi
```

## Using the SDK

### Getting an authentication token

In order for your app to logon to the Zello system, you must provide an authentication token. This token identifies you as an app developer and proves that the app has permission to connect to your channels. See the [Zello Channel API Authentication documentation](https://github.com/zelloptt/zello-channel-api/blob/master/auth/README.md) for more information on how to generate authentication tokens on your system.

#### Development tokens
> **TODO:** Update link for generating development tokens
> **Q:** What do we call the site where you can generate keys?

During development, you can use a development authentication token to access the Zello server. You can generate a development token by visiting [the Zello dashboard](https://mesh.zellowork.com/keys.html). Click the "+ Create Key" button and copy the value in the "Sample Development Token" field. Save this value immediately, as you will not be able to look it up again in the Zello console.

Development tokens are only valid for use during development of your app. When you are ready to build your app for production, you will need to create authentication tokens on your own server and provide them to the client app as described above. Otherwise, your app may become unable to connect to the Zello Channel server unexpectedly when the development token expires.

### Creating a session and logging on

Each connection to the Zello server is represented by a `ZCCSession` object. When you create the `ZCCSession` object, you provide it with the address for the Zello server, your authentication token, the name of the channel you are connecting to, and optionally a username and password. You should also supply a `ZCCSessionDelegate` object so your app can be informed about session events such as disconnections and incoming messages.

###### iOS
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

### Sending voice messages

To start a voice message to the channel, call `-[ZCCSession startVoiceMessage]`. `startVoiceMessage` returns a `ZCCOutgoingVoiceStream` object representing the audio stream to the server. To stop sending the message, call `-stop` on the outgoing stream object.

###### iOS
```objc
// Action method for Touch Down
- (IBAction)buttonPressed:(id)sender {
  self.stream = [self.session startVoiceMessage];
}

// Action method for Touch Up Inside and Touch Up Outside
- (IBAction)buttonReleased:(id)sender {
  [self.stream stop];
  self.stream = nil;
}
```

### Handling session events

The Zello Channels SDK contains an events interface which you can implement to be notified about changes in incoming and outgoing messages, state, app online status, sign in progress etc. In most cases, your implementation will be a part of your activity code.

|iOS Callback|Description
|---|---
|`sessionDidStartConnecting:`|The Session has opened a web sockets connection to the server.
|`session:didFailToConnectWithError:`|Either the web sockets connection failed or the logon failed. Check the error parameter for more details.
|`sessionDidConnect:`|Logon completed successfully and you are set to send and receive voice messages.
|`sessionDidDisconnect:`|Session has disconnected from the server. The Zello Channels SDK attempts to stay connected through network changes, so there may be a delay between the network disconnection and this callback being called, as the SDK retries connecting and eventually times out.
|`session:outgoingVoice:didEncounterError:`|An error has occurred with an outgoing voice stream. When this is called, the stream has been closed.
|`session:outgoingVoiceDidChangeState:`|An outgoing voice stream has changed its internal state.
|`session:outgoingVoice:didUpdateProgress:`|This callback is called periodically as voice data is encoded.
|`session:incomingVoiceWillStart:`|This callback is called when an incoming voice stream is about to start. By returning an incoming voice configuration object, you can perform custom processing of the incoming voice stream, _e.g._ record it to storage or prevent it from producing audio.
|`session:incomingVoiceDidStart:`|An incoming voice stream has been established and has started playing.
|`session:incomingVoiceDidStop:`|An incoming voice stream has finished playing.
|`session:incomingVoice:didUpdateProgress:`|This callback is called periodically as incoming voice data is decoded.

> __NB:__ `ZCCSessionDelegate` methods are called on the dispatch queue you provided to the `ZCCSession` initializer. If you did not provide a dispatch queue, the delegate methods are called on the main dispatch queue.

## Going live with your Zello-enabled app
> __Q:__ What do we need to update here?

All apps using Zello SDK must adhere to the following guidelines:

* All UI screens, embedding Zello SDK must include Zello logo
* Use Zello logo and / or "Zello", "ZelloWork" names, when referencing to Zello inside of your app
* [Send us the app for review](https://zellowork.com/contact/) before distributing the app to any third parties or customers


## Additional resources

* [iOS SDK API reference](https://zelloptt.github.io/zello-channel-api/iOS/)
* [Channels Server API](https://github.com/zelloptt/zello-channel-api/blob/master/API.md)

### Licenses
[ZelloChannelKit incorporates portions of SocketRocket, Copyright 2016-present, Facebook, Inc. under the BSD license.](https://github.com/facebook/SocketRocket/blob/685f756f22bc9dbee9b98cfec47bc05ccc03e9b9/LICENSE)
[ZelloChannelKit incorporates the Opus audio codec under the BSD license](http://opus-codec.org/license/)
