# Zello Channel API specification
[WebSocket](http://www.websocket.org/aboutwebsocket.html) based API to connect to Zello channels

Version 1.0


## Overview

This document is intended for developers interested in implementation of their own Zello Channel API client connecting to Zello channels. If you want to integrate Zello into your iOS or Android app, check out the [Zello SDK](https://sdk.zello.com/) instead.

This API supports a subset of Zello features and is currently focused on sending and receiving channel voice messages. See [Supported features](#supported-features) for the complete list.

To access the API you will need valid account credentials and (for Zello Friends and Family) a valid access token, based on the [JWT](https://jwt.io/) standard. See [Authentication](#authentication).

## API entry points
| Service                 | WebSocket URL
|-------------------------|---
| Zello Friends and Family  | wss://zello.io/ws
| Zello Work              | wss://zellowork.io/ws/`network name`
| Zello Enterprise Server | wss://`your server domain`/ws/mesh

Note that the protocol only supports secure connections over TLS.

## Authentication

The API supports two types of accounts:

Anonymous accounts:

* No need to provide username or password
* Can access unrestricted channels in listen only mode
* Only supported with Zello Friends and Family
* A valid [auth token](AUTH.md) is required for Zello Friends and Family

Named accounts:

* Must include a valid username and password
* Have full access to authorized channels
* Supported for both Zello Work and Zello Friends and Family
* A valid [auth token](AUTH.md) is required for Zello Friends and Family

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

| Name            | Type | Value / Description
|-----------------|---|---
| `command`       | string | `logon`
| `seq`           | integer | Command sequence number
| `auth_token`    | string | (Zello Friends and Family only) API authentication token. If omitted `refresh_token` is required. See [Authentication](#authentication).
| `refresh_token` | string | (Zello Friends and Family only) API refresh token. If omitted `auth_token ` is required. See [Authentication](#authentication).
| `username`      | string | (optional for Zello Friends and Family) Username to logon with. If not provided the client will connect anonymously. See [Authentication](#authentication).
| `password`      | string | (optional for Zello Friends and Family) Password to logon with. Required if username is provided.
| `channels`      | array of strings | The list of names of the channels to connect to. 
| `listen_only`   | boolean | (optional; supported on Zello Friends and Family only) Set to `true` to connect in listen-only mode.
| `version`       | string | (optional) Client version string. If not provided, the server will use the Channel API server version.
| `platform_type` | string | (optional) Client platform type, any string
| `platform_name` | string | (optional) Client platform name, any string. If includes `Gateway` or `Kiosk` (case-insensitive), the Zello Alarms service will track the online status of this client.
| `language`      | string | (optional) Client ISO 639-1 language code. Required for translation channels.
| `features`      | object | (optional) Feature flags object. Include `transcriptions` as a boolean (for example `{"transcriptions": true}`) to enable voice message transcriptions; when enabled, the server emits `on_transcription` events for voice streams. Include `profiles` as a boolean to receive user profiles (display name and picture); when enabled, the server emits `on_user_profile` events and accepts `get_user_profiles`. Include `mentions` as a boolean to use [text message mentions](#mentions); when enabled, `send_text_message` accepts `mentions` and `on_text_message` carries it. Unknown flags are ignored.

### Zello Work

#### Request:
```json
{
  "command": "logon",
  "seq": 1,
  "username": "sherlock",
  "password": "secret",
  "channels": ["Baker Street 221B", "Reichenbach Falls"],
  "features": {
    "transcriptions": true,
    "profiles": true,
    "mentions": true
  }
}
``` 
#### Response:

```json
{
  "seq": 1,
  "success": true
}
```
or

```json
{
  "seq": 1,
  "error": "error code"
}
```
### Zello Friends and Family

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

| Name | Type | Value / Description
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

| Name | Type | Value / Description
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
The same binary packet structure is used for any streamed data (e.g. audio) traveling both ways. The `packet_id` field is populated with the packet number for the audio packets sent from the server to a client. When streaming data to the server the `packet_id` value is ignored and should be filled with zeroes. Fields are stored in network byte order.

`{type(8) = 0x01, stream_id(32), packet_id(32), data[]}`

## Sending images
After successfully connecting to the channel and receiving channel status you can start sending images. 
If channel does not support image messaging you will receive an error for `send_image` command. 
Each image begins with send_image command followed by the sequence of binary packets with image thumbnail data and full image data. 

### `send_image`
Starts sending a new image to the channel. The successful response includes `image_id` which must be used in all data packets for this image.

| Name | Type | Value / Description
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

| Name | Type | Value / Description
|---|---|---
| `command` | string | `send_text_message`
| `seq` | integer | Command sequence number
| `channel` | string | The channel to send the message to
| `text` | string | Message text. 30 Kb maximum
| `for` | string | Optional username to send text message to. Other users in the channel won't be receiving this text message
| `mentions` | array | Optional list of users mentioned in the text, see [Mentions](#mentions). Requires the `mentions` feature on `logon`. 50 entries maximum

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

### Mentions

A text message can name other users of the channel. The `text` stays plain (write the name inline however you like, `@holmes` is the convention) and `mentions` tells receiving clients where each mention sits and whom it refers to, so they can highlight it or notify the user.

Mentions are opt-in: log on with `features` including `"mentions": true`. Without it, a `send_text_message` that carries `mentions` is rejected with `not supported`, and `on_text_message` never includes the field, so a client that does not know about mentions keeps seeing plain text. Each entry:

| Name | Type | Value / Description
|---|---|---
| `username` | string | The username of the mentioned user
| `offset` | integer | Index of the first character of the mention in `text`, counted in UTF-16 code units (JavaScript string indices)
| `length` | integer | Number of UTF-16 code units the mention spans

The server checks the shape of every entry and that each span falls inside `text`, and rejects the message with `invalid mentions` otherwise. It does not check that the users exist or are members of the channel, and mentions do not change who receives the message or how it is delivered: they are passed through exactly as sent, on [`on_text_message`](#on_text_message), to every recipient that requested the `mentions` feature.

#### Request:
```json
{
  "command": "send_text_message",
  "seq": 4,
  "channel": "Reichenbach Falls",
  "text": "@holmes and @watson meet me at the falls",
  "mentions": [
    { "username": "holmes", "offset": 0, "length": 7 },
    { "username": "watson", "offset": 12, "length": 7 }
  ]
}
```

## Sending locations
After successfully connecting to the channel and receiving channel status you can start sending locations.

### `send_location`
Sends user's location to the channel.

| Name | Type | Value / Description
|---|---|---
| `command` | string | `send_location`
| `seq` | integer | Command sequence number
| `channel` | string | The channel to send the message to
| `latitude` | number | Shared location latitude
| `longitude` | number | Shared location longitude
| `accuracy` | number | Shared location accuracy in meters
| `formatted_address` | string | Shared location reverse geocoding result (street address)
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

## User profiles
Log on with `features` including `"profiles": true` and the server keeps the client informed about the users it encounters: every message author, every connected member of a dispatch channel, and every contact whose status the session receives produces an [`on_user_profile`](#on_user_profile) event. The event is sent after the message it relates to, so audio is never delayed by a profile lookup. Profiles are cached per connection and refreshed as they change.

### `get_user_profiles`
Requests the profiles of specific users, for example the members of a channel the client wants to render before any of them talks. The response only acknowledges the request; each profile arrives as a separate `on_user_profile` event, cached ones right away and the rest once fetched. Users the server knows nothing about still produce an event, without picture fields, so the client can stop waiting.

| Name | Type | Value / Description
|---|---|---
| `command` | string | `get_user_profiles`
| `seq` | integer | Command sequence number
| `users` | array of strings | User names to look up, at most 50 per request. Duplicates are ignored.

#### Request:
```json
{
  "command": "get_user_profiles",
  "seq": 4,
  "users": ["sherlock", "watson"]
}
```

#### Response:
```json
{
  "seq": 4,
  "success": true
}
```
or
```json
{
  "seq": 4,
  "error": "not supported"
}
```
when the client did not request the `profiles` feature on `logon`.

## Channel history

On a Zello Work network with offline channel messages enabled, the server keeps the last 24 hours of a channel's traffic, up to 50 messages per request. Nothing is delivered automatically: an API client asks for it. `get_history` returns the metadata, and the two companion commands bring one message's media back over the socket in the same form a live message would take. Dispatch channels keep no history, and anonymous or kiosk sessions cannot read it. `on_channel_status` reports `history_supported` so a client knows whether to ask.

### `get_history`

Lists the stored messages of a channel newer than a cursor, oldest first.

#### Attributes

| Name | Type | Value / Description
|---|---|---
| `command` | string | `get_history`
| `seq` | integer | Command sequence number
| `channel` | string | The name of the channel
| `since` | integer | (optional) Unix timestamp in milliseconds of the newest message the client already holds. Messages from the next whole second onward are returned. Omit or pass `0` for everything the server kept

#### Request:
```json
{
  "command": "get_history",
  "seq": 9,
  "channel": "Ops",
  "since": 1758300000000
}
```

#### Response:
```json
{
  "seq": 9,
  "success": true,
  "channel": "Ops",
  "messages": [
    {
      "type": "audio",
      "message_id": 22695,
      "from": "alex",
      "ts": 1758300001,
      "packet_duration": 60,
      "playable": true,
      "transcription": "Loading dock is clear"
    },
    {
      "type": "text",
      "message_id": 22701,
      "from": "kim",
      "ts": 1758300042,
      "text": "On my way"
    },
    {
      "type": "image",
      "message_id": 22710,
      "from": "kim",
      "ts": 1758300050,
      "source": "camera",
      "width": 591,
      "height": 1280,
      "content_type": "jpeg",
      "available": true
    }
  ]
}
```

Every message carries `type`, `message_id`, `from`, `ts` (Unix timestamp in seconds) and, when the original was sent with one, `for`. The rest depends on `type`:

| Type | Fields
|---|---
| `audio` | `packet_duration`, `playable` (whether `play_history_message` can replay it), and `transcription` with `language` when the network transcribed it
| `text` | `text`
| `image` | `width`, `height`, `source`, `content_type`, `text` (optional caption), `available` (whether `get_history_image` can fetch it)
| `location` | `latitude`, `longitude`, `formatted_address`, `accuracy`
| `alert` | `text`, `scope` (`all` or `connected`)

The server keeps at most 50 messages per request, newest first, so a busy channel may return fewer than 24 hours of traffic. Only one history command may be in flight on a connection at a time; a second one is answered with `busy`.

### `play_history_message`

Replays one stored voice message to this connection. The message plays exactly like a live incoming stream: [`on_stream_start`](#on_stream_start) with `message_id` set, binary audio packets paced at `packet_duration`, then [`on_stream_stop`](#on_stream_stop). The `stream_id` equals the `message_id`.

#### Attributes

| Name | Type | Value / Description
|---|---|---
| `command` | string | `play_history_message`
| `seq` | integer | Command sequence number
| `channel` | string | The name of the channel
| `message_id` | integer | The `message_id` of an `audio` entry returned by `get_history`
| `since` | integer | (optional) Cursor to re-read the history with when the message is not in the most recent `get_history` result for the channel

#### Request:
```json
{
  "command": "play_history_message",
  "seq": 10,
  "channel": "Ops",
  "message_id": 22695
}
```

#### Response:
```json
{
  "seq": 10,
  "success": true,
  "message_id": 22695,
  "stream_id": 22695
}
```

The response is sent when the stream starts. One playback runs at a time per connection; a second request is answered with `busy`. A `message_id` that is not an audio entry is answered with `message not playable`, and one the server no longer holds with `no message`.

### `get_history_image`

Fetches one stored image to this connection, delivered the same way as a live one: [`on_image`](#on_image) followed by the thumbnail and full image [binary packets](#receiving-images-data).

#### Attributes

| Name | Type | Value / Description
|---|---|---
| `command` | string | `get_history_image`
| `seq` | integer | Command sequence number
| `channel` | string | The name of the channel
| `message_id` | integer | The `message_id` of an `image` entry returned by `get_history`
| `since` | integer | (optional) Cursor to re-read the history with when the message is not in the most recent `get_history` result for the channel

#### Request:
```json
{
  "command": "get_history_image",
  "seq": 11,
  "channel": "Ops",
  "message_id": 22710
}
```

#### Response:
```json
{
  "seq": 11,
  "success": true,
  "message_id": 22710
}
```

The response precedes the `on_image` event. One fetch runs at a time per connection; a second request is answered with `busy`. A `message_id` that is not an image entry is answered with `message not playable`, and one the server no longer holds with `no message`.

## Contacts

### `get_contacts`
Returns the contact list of the logged-in user as Zello delivers it: every user the account can reach and every channel it belongs to, including team channels. The list is a snapshot; call again after reconnecting or when the network's users or channels change. Anonymous and listen-only sessions have no contact list and receive `not supported`.

| Name | Type | Value / Description
|---|---|---
| `command` | string | `get_contacts`
| `seq` | integer | Command sequence number

#### Request:
```json
{
  "command": "get_contacts",
  "seq": 5
}
```

#### Response:
```json
{
  "seq": 5,
  "success": true,
  "users": [
    {
      "username": "sherlock",
      "display_name": "Sherlock Holmes",
      "full_name": "Sherlock Holmes",
      "job_title": "Consulting detective",
      "status": "online",
      "tags": ["Everyone", "Baker Street"]
    },
    {
      "username": "watson",
      "display_name": "watson",
      "tags": ["Everyone"]
    }
  ],
  "channels": [
    { "name": "Baker Street", "dispatch": false, "team": true },
    { "name": "Dispatch", "dispatch": true, "team": false },
    { "name": "Everyone", "dispatch": false, "team": true }
  ]
}
```

Users are sorted by `display_name`, channels by `name`.

##### `users` entries

| Name | Type | Value / Description
|---|---|---
| `username` | string | The username
| `display_name` | string | The name to show: the name set in the Zello Work console, then the profile display name, then the username
| `full_name` | string | (optional) The name set in the Zello Work console
| `job_title` | string | (optional) The job title set in the Zello Work console
| `status` | string | (optional) Last known presence: `online`, `offline`, `away`, `busy`, `headphones` or `standby`. Absent until the server has received a status update for the user.
| `tags` | array of strings | Names of the team channels the user belongs to

##### `channels` entries

| Name | Type | Value / Description
|---|---|---
| `name` | string | The channel name
| `dispatch` | boolean | Whether the channel is a dispatch channel
| `team` | boolean | Whether the channel is a team channel (derived from user tags) rather than a regular channel

## Events

### `on_channel_status`

Indicates there was a change in channel status, which may include channel being connected/disconnected, number of online users changed, or supported features changed.

#### Attributes

| Name | Type | Value / Description
|---|---|---
| `command` | string | `on_channel_status`
| `channel ` | string | The name of the channel
| `status ` | string | Channel status. Can be `online` or `offline`
| `users_online ` | integer | Number of users currently connected to the channel.
| `images_supported` | boolean | Channel will accept image messages.
| `texting_supported` | boolean | Channel will accept text messages.
| `locations_supported` | boolean | Channel will accept locations.
| `history_supported` | boolean | Channel history can be read with [`get_history`](#get_history). Zello Work only.
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

| Name                    | Type    | Value / Description
|-------------------------|---------|---
| `command`               | string  | `on_stream_start`
| `type`                  | string  | Stream type. Only `audio` is currently supported
| `codec`                 | string  | The name of audio codec used. Required for `audio` streams. Must be `opus`
| `codec_header`          | string  | base64-encoded codec header buffer. Required for `opus` streams
| `packet_duration`       | integer | Audio packet duration in milliseconds. Values between 2.5 ms and 60 ms are supported
| `stream_id `            | integer | The id of the stream that started
| `channel `              | string  | The name of the channel
| `from `                 | string  | The username of the sender of the message
| `for `                  | string  | The username of the recipient of the message if it was sent with `for` parameter 
| `translations_enabled ` | boolean | (optional) Whether translations are enabled for this channel
| `language `             | string  | (optional) The ISO 639-1 language code of the sender
| `message_id `           | integer | (optional) Present when the stream is a `play_history_message` playback: the played message's id, equal to `stream_id`

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

| Name | Type | Value / Description
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

### `on_transcription`
Request transcriptions by including `features` on `logon` with `transcriptions` set to `true`. When transcriptions are enabled and supported by the network, the server delivers this event for voice messages (incoming and outgoing on Zello Work). Each event includes a `stream_id` that matches the `stream_id` of the voice stream. Transcriptions are sent for completed messages, or when a message reaches the one-minute mark.

#### Attributes

| Name            | Type             | Value / Description
|-----------------|------------------|---
| `command`       | string           | `on_transcription `
| `text`          | string           | The voice message transcription
| `stream_id `    | integer          | The id of the stream this transcription is for
| `confidence`    | number           | Percentage (0-1) confidence in the transcription accuracy
| `sender `       | string           | The username of the sender of the message
| `language `     | string           | The ISO 639-1 language code of the transcription
| `truncated `    | boolean          | Whether the transcription is partial or for the whole message
| `translations ` | array of objects | (optional) Translations of this transcription. Each object contains two strings, `language` and `message`

### `on_user_profile`
Carries the profile of a user. Sent only when the client requested the `profiles` feature on `logon`. See [User profiles](#user-profiles) for what triggers it. `display_name` is always present and follows the same rules Zello apps use: the name set in the Zello Work console, then the profile display name, then the username. Picture fields are omitted when the user has no picture.

#### Attributes

| Name                    | Type    | Value / Description
|-------------------------|---------|---
| `command`               | string  | `on_user_profile`
| `username`              | string  | The username the profile belongs to
| `display_name`          | string  | The name to show for the user
| `profile_picture`       | string  | (optional) URL of the profile picture
| `profile_picture_thumb` | string  | (optional) URL of the profile picture thumbnail
| `profile_ts`            | integer | (optional) Profile timestamp; absent when the user has no profile

#### Example:

```json
{
  "command": "on_user_profile",
  "username": "sherlock",
  "display_name": "Sherlock Holmes",
  "profile_picture": "https://example.com/profiles/sherlock.jpg",
  "profile_picture_thumb": "https://example.com/profiles/sherlock_thumb.jpg",
  "profile_ts": 1758700000
}
```

### `on_error`
Indicates a server error.

#### Attributes

| Name | Type | Value / Description
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

| Name | Type | Value / Description
|---|---|---
| `command` | string | `on_image`
| `channel` | string | The name of the channel
| `from ` | string | The username of the sender of the image
| `for ` | string | The username of the recipient of the image if it was sent with `for` parameter
| `message_id` | integer | The id of the image message
| `type` | string | image content type (`jpeg`)
| `height` | integer | Image height (some clients don't provide this value)
| `width` | integer | Image width (some clients don't provide this value)
| `source` | string | Image source (`camera` or `library`)

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
| Name | Type | Value / Description
|---|---|---
| `command` | string | `on_text_message`
| `channel` | string | The name of the channel
| `from ` | string | The username of the sender of the text message
| `for ` | string\|boolean | The username of the recipient of the text message if it was sent with `for` parameter, `false` otherwise
| `message_id` | integer | The id of the text message
| `text` | string | Message text
| `mentions` | array | The users mentioned in the text, as sent with the message (see [Mentions](#mentions)). Only sent to clients that requested the `mentions` feature on `logon`, and absent when the message carries none

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

#### Example with mentions:

```json
{
  "command": "on_text_message",
  "channel": "test",
  "from": "alex",
  "for": false,
  "message_id": 16777217,
  "text": "@holmes and @watson meet me at the falls",
  "mentions": [
    { "username": "holmes", "offset": 0, "length": 7 },
    { "username": "watson", "offset": 12, "length": 7 }
  ]
}
```

### `on_location`
Indicates incoming shared location from the channel.

#### Attributes
| Name | Type | Value / Description
|---|---|---
| `command` | string | `on_location`
| `channel` | string | The name of the channel
| `from ` | string | The username of the sender of the shared location
| `for ` | string | The username of the recipient of the location if it was sent with `for` parameter
| `message_id` | integer | The id of the shared location message
| `latitude` | number | Shared location latitude
| `longitude` | number | Shared location longitude
| `formatted_address` | string | Shared location reverse geocoding result (street address) 
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
|internal server error | An internal error occured within the server. If the error persists please contact us at support@zello.com.
|invalid json | The command received included malformed JSON.
|invalid request | The server couldn't recognize command format.
|not authorized | Username, password or token are not valid.
|not logged in | Server received a command before successful `logon`.
|not enough params | The command doesn't include some of the required attributes.
|server closed connection | The connection to Zello network was closed. You can try reconnecting.
|channel is not ready | Channel you are trying to talk to is not yet connected. Wait for channel `online` status before sending a message.
|listen only connection | The client tried to send a message over listen-only connection.
|failed to start stream | Unable to start the stream for unknown reason. You can try again later.
|failed to stop stream | Unable to stop the stream for unknown reason. This error is safe to ignore.
|failed to send data | An error occured while trying to send stream data packet.
|invalid audio packet | Malformed audio packet is received.
|invalid mentions | `send_text_message` carried a `mentions` value that is not an array of `{username, offset, length}` entries inside the text, or more than 50 of them.
|not supported | The command needs a feature the client did not request on `logon` (for example `get_user_profiles` without `profiles`, or `send_text_message` with `mentions` without `mentions`), one the network or channel does not offer (for example channel history on a network without offline channel messages), or a contact list the session does not have (`get_contacts` on an anonymous session).
|too many users | `get_user_profiles` was sent with more than 50 user names.
|busy | Another request of the same kind is still in progress on this connection. Retry once it completes.
|no message | The server no longer holds the requested history message.
|message not playable | The requested history message is not of a kind the command can deliver.
|download failed | The server could not fetch the stored media for the message.
|decrypt failed | The server could not decrypt the stored media for the message.



## Supported features


|Feature| Zello Friends and Family |Zello Work
|---|------------------------|---
|Access channels using authorized user credentials | Supported              | Supported
|Access channels anonymously in listen only mode | Supported              | Not supported
|Send and receive voice messages | Supported              | Supported
|Interoperability with Zello apps on Android, iOS, and PC | Supported              | Supported
|Create and access ad hoc channels anonymously | Planned                | Planned
|Send and receive images | Supported              | Supported
|Send and receive text messages | Supported              | Supported
|Send and receive locations | Supported              | Supported
|Send and receive emergency alerts | -                      | Planned
|Read channel history (offline channel messages) | Not supported          | Supported
