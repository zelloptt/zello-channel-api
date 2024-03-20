# Zello Channel API specification
[WebSocket](http://www.websocket.org/aboutwebsocket.html) based API to connect to Zello channels

Version 1.0


## Overview

This document is intended for developers interested in implementation of their own Zello Channel API client connecting to Zello channels. If you want integrate Zello into your iOS or Android app, check out the [mobile SDKs](sdks) instead.

This API supports subset of Zello features and currently focused on sending and receiving channel voice messages. See [Supported features](#supported-features) for the complete list.

To access the API you will need valid account credentials and/or a valid access token, based on the [JWT](https://jwt.io/) standard. See [Authentication](#authentication).

## API entry points
| Service | WebSocket URL
|---|---
| Consumer Zello | wss://zello.io/ws
| Zello Work | wss://zellowork.io/ws/`network name`
| Zello Enterprise Server | wss://`your server domain`/ws/mesh

Note that the protocol only supports secure connections over TLS.

## Authentication

The API supports two types of accounts:

Anonymous accounts:

* No need to provide username or password
* Can access unrestricted channels in listen only mode
* Only supported with consumer Zello
* A valid [auth token](AUTH.md) is required

Named accounts:

* Must include a valid username and password
* Have full access to authorized channels
* Supported for both Zello Work and consumer Zello
* A valid [auth token](AUTH.md) is required for consumer Zello but optional for Zello Work

## Connection keepalive
The API monitors connectivity by sending a [WebSocket Ping frame](https://datatracker.ietf.org/doc/html/rfc6455#section-5.5.2) to the client every 30 seconds. The WebSocket client must respond to the Ping frame with a Pong frame. If a client takes longer than 30 seconds to respond with a Pong frame, the API terminates the connection.

## WebSocket commands protocol

This API uses persistent WebSocket connection with JSON-formatted WebSocket text messages for control protocol and WebSocket binary messages for voice data.

Each control request contains a command and an optional sequence number. 

* `command` Command name
* `seq` Sequence number

A sequence number is required only if a response is expected. Both server and client maintain their own counters to ensure that unique sequence numbers are used with commands that include a sequence number.

## Logon


### `logon`

Authenticates the client and connects to channels. This must be the first command the client sends after establishing WebSocket connection. To stop the session and disconnect from the channels simply close the connection.

Connecting to multiple channels (up to 100) is currently supported for Zello Work only.

#### Attributes

| Name | Type | Value  / Description
|---|---|---
| `command` | string | `logon`
| `seq` | integer | Command sequence number
| `auth_token` | string | (optional) API authentication token. If omitted `refresh_token` is required when connecting to consumer Zello. See [Authentication](#authentication)
| `refresh_token` | string | (optional) API refresh token. If omitted `auth_token ` is required when connecting to consumer Zello. See [Authentication](#authentication)
| `username` | string | (optional) Username to logon with. If not provided the client will connect anonymously. See [Authentication](#authentication)
| `password` | string | (optional) Password to logon with. Required if username is provided.
| `channels` | array of strings | The list of names of the channels to connect to. 
| `listen_only` | boolean | (optional) Set to `true` to connect in listen-only mode.

#### Request:

```json
{
  "command": "logon",
  "seq": 1,
  "auth_token": "[json web token]",
  "username": "sherlock",
  "password": "secret",
  "channels": ["Baker Street 221B", "Reichenbach Falls"]
}
``` 
#### Response:

```json
{
  "seq": 1,
  "success": true,
  "refresh_token": "[refresh json web token]"
}
```
or

```json
{
  "seq": 1,
  "error": "error code"
}
```

A successful response includes `refresh_token` which can be used to quickly reconnect if the WebSocket connection is broken due to brief network interruption. 
`images_supported` flag indicates channel will accept images. `texting_supported` flag indicates if channel will accept text messages. `locations_supported` flag indicates if channel will accept locations.

#### Response error codes

| Value | Description
|---|---
| `not enough params` | The request is missing required parameters, such as token or username/password
| `not authorized` | The logon fails due to invalid credentials
| `internal server error` | There are any unexpected server side failures; an immediate retry may or may not succeed
| `channels limit exceeded` | The list of channels supplied is longer than supported by the API. 


## Streaming voice messages

After successfully connecting to the channel and receiving [channel status](#on_channel_status) you can start sending voice messages. Each message is sent as stream, which begins with `start_stream` command followed by the sequence of binary packets with audio data and ends with `stop_stream` command. Zello uses [Opus](http://opus-codec.org/) voice codec to compress audio stream.

### `start_stream`

Starts a new stream to the channel. The successful response includes `stream_id` which must be used in all data packets for this message as well as in `stop_stream` command.

#### Attributes

| Name | Type | Value  / Description
|---|---|---
| `command` | string | `start_stream `
| `seq` | integer | Command sequence number
| `channel` | string | The channel to send the message to
| `type` | string | Stream type. Only `audio` is currently supported
| `codec` | string | The name of audio codec used. Required for `audio` streams. Must be `opus`.
| `codec_header` | string | base64-encoded string, representing audio encoding parameters. Required for `audio` streams. See [below](#codec_header-attribute)
| `packet_duration` | integer | Audio packet duration in milliseconds. Values between 2.5 ms and 60 ms are supported.
| `for` | string | Optional username to send message to. Other users in the channel won't be receiving this message

##### `codec_header` attribute

`codec_header` is base64-encoded 4 byte array, which represents audio encoding attributes used for the message being sent: 

`{sample_rate_hz(16LE), frames_per_packet(8), frame_size_ms(8)}`

| Byte | Value| Description
|---|---|---
|0 & 1 | `sample_rate_hz` | 16 bit little-endian value of audio sample rate in Hz
|2 | `frames_per_packet` | Number of frames per packet (1 or 2)
|3 | `frame_size_ms` | Audio frame size in milliseconds

Example: value of `gD4BPA==` in base64 decodes to `{0x80, 0x3e, 0x01, 0x3c}` which represents 16000 Hz sample rate, 1 frame per packet, 60 ms frame size. See [example implementation](https://github.com/zelloptt/zello-channel-api/blob/409378acd06257bcd07e3f89e4fbc885a0cc6663/sdks/js/src/classes/utils.js#L60L67). 

#### Request:

```json
{
  "command": "start_stream",
  "seq": 2,
  "channel": "Baker Street 221B",
  "type": "audio",
  "codec": "opus",
  "codec_header": "gD4BPA==",
  "packet_duration": 20
}
``` 

or

```json
{
  "command": "start_stream",
  "seq": 2,
  "channel": "Baker Street 221B",
  "type": "audio",
  "codec": "opus",
  "codec_header": "gD4BPA==",
  "packet_duration": 20,
  "for": "mrs.hudson"
}
```

#### Response:

```json
{
  "seq": 2,
  "success": true,
  "stream_id": 22695
}
```

### `stop_stream`

Stops outgoing stream. Send this command after you sent the last data packet. 

#### Attributes

| Name | Type | Value  / Description
|---|---|---
| `command` | string | `stop_stream `
| `seq` | integer | Command sequence number
| `stream_id` | integer | Stream ID as returned in response to `start_stream` command
| `channel` | string | The channel to send the message to


#### Request:

```json
{
  "command": "stop_stream",
  "seq": 3,
  "stream_id": 22695,
  "channel": "Baker Street 221B"
}
```

### Stream data
The same binary packet structure is used for any streamed data (e.g. audio) travelling both ways. The `packet_id` field is populated with the packet number for the audio packets sent from the server to a client. When streaming data to the server the `packet_id` value is ignored and should be filled with zeroes.  Fields are stored in network byte order.

`{type(8) = 0x01, stream_id(32), packet_id(32), data[]}`

## Sending images
After successfully connecting to the channel and receiving channel status you can start sending images. 
If channel does not support image messaging you will receive an error for `send_image` command. 
Each image begins with send_image command followed by the sequence of binary packets with image thumbnail data and full image data. 

### `send_image`
Starts sending a new image to the channel. The successful response includes `image_id` which must be used in all data packets for this image.

| Name | Type | Value  / Description
|---|---|---
| `command` | string | `send_image `
| `seq` | integer | Command sequence number
| `channel` | string | The channel to send the message to
| `type` | string | Image type. Only `jpeg` is currently supported
| `thumbnail_content_length` | integer | Image thumbnail content length in bytes
| `content_length` | integer | Full image content length in bytes
| `width` | integer | Full image width in pixels
| `height` | integer | Full image width in pixels
| `source` | string | Image source (`camera` or `library`)
| `for` | string | Optional username to send image to. Other users in the channel won't be receiving this image


#### Request: 
```json
{
  "command": "send_image",
  "seq": 2,
  "channel": "Reichenbach Falls",
  "type": "jpeg",
  "source": "camera",
  "width": 1279,
  "height": 959,
  "thumbnail_content_length": 10616,
  "content_length": 183716
}
```

#### Response:

```json
{
  "seq": 2,
  "success": true,
  "image_id": 22695
}
```

### Sending image binary data
#### Image thumbnail packet
`{type(8) = 0x02, image_id(32), image_type(32) = 0x02, data[]}`

#### Full image packet
`{type(8) = 0x02, image_id(32), image_type(32) = 0x01, data[]}`

## Sending text messages
After successfully connecting to the channel and receiving channel status you can start sending text messages.

### `send_text_message`
Sends a new text message to the channel.

| Name | Type | Value  / Description
|---|---|---
| `command` | string | `send_text_message`
| `seq` | integer | Command sequence number
| `channel` | string | The channel to send the message to
| `text` | string | Message text. 30 Kb maximum
| `for` | string | Optional username to send text message to. Other users in the channel won't be receiving this text message

#### Request:
```json
{
  "command": "send_text_message",
  "seq": 3,
  "channel": "Reichenbach Falls",
  "text": "Where are you?",
  "for": "holmes"
}
```

#### Response:
```json
{
  "seq": 3,
  "success": true
}
```

## Sending  locations
After successfully connecting to the channel and receiving channel status you can start sending locations.

### `send_location`
Sends user's location to the channel.

| Name | Type | Value  / Description
|---|---|---
| `command` | string | `send_location`
| `seq` | integer | Command sequence number
| `channel` | string | The channel to send the message to
| `latitude` | number | Shared location latitude
| `longitude` | number | Shared location longitude
| `accuracy` | number | Shared location accuracy in meters
| `formatted_address` | string |  Shared location reverse geocoding result (street address)
| `for` | string | Optional username to send location to. Other users in the channel won't be receiving this location data 

#### Request:
```json
{
  "command": "send_location",
  "seq": 3,
  "channel": "Reichenbach Falls",
  "latitude": 46.714475,
  "longitude": 8.1806319,
  "accuracy": 10,
  "formatted_address": "Hausenstrasse 34, 3860 Meiringen, Switzerland",
  "for": "watson"
}
```

#### Response:
```json
{
  "seq": 3,
  "success": true
}
```

## Events

### `on_channel_status`

Indicates there was a change in channel status, which may include channel being connected/disconnected, number of online users changed, or supported features changed.

#### Attributes

| Name | Type | Value  / Description
|---|---|---
| `command` | string | `on_channel_status`
| `channel ` | string | The name of the channel
| `status ` | string | Channel status. Can be `online` or `offline`
| `users_online ` | integer | Number of users currently connected to the channel.
| `images_supported` | boolean | Channel will accept image messages.
| `texting_supported` | boolean | Channel will accept text messages.
| `locations_supported` | boolean | Channel will accept locations.
| `error` | string | Includes error description, when channel disconnected due to error. 
| `error_type` | string | `unknown`, `configuration` Indicates error type. When set to `configuration` indicates that current channel configuration doesn't allow connecting using the channel API credentials used.

#### Example:

```json
{
  "command": "on_channel_status",
  "channel": "test",
  "status": "online",
  "users_online": 2,
  "images_supported": true,
  "texting_supported": true,
  "locations_supported": true
}
```


### `on_stream_start`

Indicates the start of the new incoming stream. This event corresponds to `start_stream` command sent by another channel user.

#### Attributes

| Name | Type | Value  / Description
|---|---|---
| `command` | string | `on_stream_start`
| `type` | string | Stream type. Only `audio` is currently supported
| `codec` | string | The name of audio codec used. Required for `audio` streams. Must be `opus`
| `codec_header` | string | base64-encoded codec header buffer. Required for `opus` streams
| `packet_duration` | integer | Audio packet duration in milliseconds. Values between 2.5 ms and 60 ms are supported
| `stream_id ` | integer |  The id of the stream that started
| `channel ` | string | The name of the channel
| `from ` | string | The username of the sender of the message
| `for ` | string | The username of the recipient of the message if it was sent with `for` parameter 


#### Example:

```json
{
  "command": "on_stream_start",
  "type": "audio",
  "codec": "opus",
  "codec_header": "gD4BPA==",
  "packet_duration": 20,
  "stream_id": 22695,
  "channel": "test",
  "from": "alex",
  "for": "jim"
}
```

### `on_stream_stop` 
Indicates the stop of the incoming stream. This event corresponds to `stop_stream` command sent by another channel user.

#### Attributes

| Name | Type | Value  / Description
|---|---|---
| `command` | string | `on_stream_stop `
| `stream_id ` | integer | The id of the stream that stopped

#### Example:

```json
{
  "command": "on_stream_stop",
  "stream_id": 22695
}
```


### `on_error`
Indicates a server error.

#### Attributes

| Name | Type | Value  / Description
|---|---|---
| `command` | string | `on_error `
| `error ` | string | One of the [error codes](#error-codes)

#### Example:

```json
{
  "command": "on_error",
  "error": "server closed connection"
}
```

### `on_image`
Indicates incoming image from the channel. This event corresponds to `send_image` command sent by another channel user.

#### Attributes

| Name | Type | Value  / Description
|---|---|---
| `command` | string | `on_image`
| `channel` | string | The name of the channel
| `from ` | string | The username of the sender of the image
| `for ` | string | The username of the recipient of the image if it was sent with `for` parameter
| `message_id` | integer |  The id of the image message
| `type` | string | image content type (`jpeg`)
| `height` | integer |  Image height (some clients don't provide this value)
| `width` | integer |  Image width (some clients don't provide this value)
| `source` | string |  Image source (`camera` or `library`)

#### Example:

```json
{
  "command": "on_image",
  "channel": "test",
  "from":"alex",
  "for": false,
  "message_id": 59725,
  "source": "camera",
  "width": 591,
  "height": 1280,
  "ct": "jpeg"
}
```

### Receiving images data
`on_image` event is followed by the sequence of two binary packets with image thumbnail data and full image data.
Fields are stored in network byte order similar to audio stream packets.

#### Image thumbnail packet
`{type(8) = 0x02, message_id(32), image_type(32) = 0x02, data[]}`

#### Full image packet
`{type(8) = 0x02, message_id(32), image_type(32) = 0x01, data[]}`

### `on_text_message`
Indicates incoming text message from the channel.

#### Attributes
| Name | Type | Value  / Description
|---|---|---
| `command` | string | `on_text_message`
| `channel` | string | The name of the channel
| `from ` | string | The username of the sender of the text message
| `for ` | string\|boolean | The username of the recipient of the text message if it was sent with `for` parameter, `false` otherwise
| `message_id` | integer |  The id of the text message
| `text` | string |  Message text

#### Example:

```json
{
  "command": "on_text_message",
  "channel": "test",
  "from": "alex",
  "for": false,
  "message_id": 16777216,
  "text": "Hello Zello!"
}
```

### `on_location`
Indicates incoming shared location from the channel.

#### Attributes
| Name | Type | Value  / Description
|---|---|---
| `command` | string | `on_location`
| `channel` | string | The name of the channel
| `from ` | string | The username of the sender of the shared location
| `for ` | string | The username of the recipient of the location if it was sent with `for` parameter
| `message_id` | integer | The id of the shared location message
| `latitude` | number | Shared location latitude
| `longitude` | number | Shared location longitude
| `formatted_address` | string |  Shared location reverse geocoding result (street address) 
| `accuracy` | number | Shared location accuracy in meters 


#### Example:

```json
{
  "command": "on_location",
  "channel": "test",
  "from": "alex",
  "message_id": 16777217,
  "latitude": 30.27386375722625,
  "longitude": -97.76014980128478,
  "rgl": "1317 W 6th St, Austin"
}
```

## Error codes

|Error Code | Description
|---|---
|unknown command | Server didn't recognize the command received from the client.
|internal server error | An internal error occured within the server. If the error persists please contact us at support@zello.com
|invalid json | The command received included malformed JSON
|invalid request | The server couldn't recognize command format.
|not authorized | Username, password or token are not valid.
|not logged in | Server received a command before successful `logon`.
|not enough params | The command doesn't include some of the required attributes.
|server closed connection | The connection to Zello network was closed. You can try re-connecting.
|channel is not ready | Channel you are trying to talk to is not yet connected. Wait for channel `online` status before sending a message
|listen only connection | The client tried to send a message over listen-only connection.
|failed to start stream | Unable to start the stream for unknown reason. You can try again later.
|failed to stop stream | Unable to stop the stream for unknown reason. This error is safe to ignore.
|failed to send data | An error occured while trying to send stream data packet.
|invalid audio packet | Malformed audio packet is received.



## Supported features


|Feature|Consumer Zello|Zello Work
|---|---|---
|Access channels using authorized user credentials | Supported | Supported
|Access channels anonymously in listen only mode | Supported | Not supported
|Send and receive voice messages | Supported | Supported
|Interoperability with Zello apps on Android, iOS, and PC | Supported | Supported
|Create and access ad hoc channels anonymously | Planned | Planned
|Send and receive images | Supported | Supported
|Send and receive text messages | Supported | Supported
|Send and receive locations | Supported | Supported
|Send and receive emergency alerts | - | Planned
