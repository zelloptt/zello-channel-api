# Zello Channel API specification
[WebSocket](http://www.websocket.org/aboutwebsocket.html) based API to connect to Zello channels

Version 1.0


## Overview

This document is intended for developers interested in implementation of their own Zello Channel API client connecting to Zello channels. If you want integrate Zello into your iOS or Android app, check out the [mobile SDKs](sdks) instead.

This API supports subset of Zello features and currently focused on sending and receiving channel voice messages. See [Supported features](#supported-features) for the complete list.

To access the API you need to generate a valid access token, based on [JWT](https://jwt.io/) standard. See [Authentication](#authentication).

## API entry points
| Service | WebSocket URL
|---|---
| Consumer Zello | wss://zello.io/ws
| ZelloWork | wss://zellowork.io/ws/`network name`
| Zello Enterprise Server | wss://`your server domain`/ws

Note that the protocol only supports secure connections over TLS.

## Authentication

The API supports two types of accounts for both Zello and ZelloWork:

Anonymous accounts:

* No need to provide username or password
* Can access unrestricted channels in listen only mode

Named accounts:

* Must include a valid username and password
* Have full access to authorized channels

In both cases you need to provide a valid [auth token](AUTH.md).

## WebSocket commands protocol

This API uses persistent WebSocket connection with JSON-formatted WebSocket text messages for control protocol and WebSocket binary messages for voice data.

Each control request contains a command and an optional sequence number. 

* `command` Command name
* `seq` Sequence number

A sequence number is required only if a response is expected. Both server and client maintain their own counters to ensure that unique sequence numbers are used with commands that include a sequence number.

## Logon


### `logon`

Authenticates the client and connects to a channel. This must be the first command the client sends after establishing WebSocket connection. To stop the session and disconnect from the channel simply close the connection.

#### Attributes

| Name | Type | Value  / Description
|---|---|---
| `command` | string | `logon`
| `seq` | integer | Command sequence number
| `auth_token` | string | (optional) API authentication token. If omitted `refresh_token` is required. See [Authentication](#authentication)
| `refresh_token` | string | (optional) API refresh token. If omitted `auth_token ` is required. See [Authentication](#authentication)
| `username` | string | (optional) Username to logon with. If not provided the client will connect anonymously.
| `password` | string | (optional) Password to logon with. Required if username is provided.
| `channel` | string | The name of the channel to connect to. 
| `listen_only` | boolean | (optional) Set to `true` to connect in listen-only mode.

#### Request:

```json
{
  "command": "logon",
  "seq": 1,
  "auth_token": "[json web token]",
  "username": "sherlock",
  "password": "secret",
  "channel": "Baker Street 221B"
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
Successful response includes `refresh_token` which can be use to quickly reconnect if WebSocket connection is broken due to brief network interruption. 

## Streaming voice messages

After successfully connecting to the channel and reciving [channel status](#on_channel_status) you can start sending voice messages. Each message is sent as stream, which begins with `start_stream` command followed by the sequence of binary packets with audio data and ends with `stop_stream` command. Zello uses [Opus](http://opus-codec.org/) voice codec to compress audio stream.

### `start_stream`

Starts a new stream to the channel. The successful response includes `stream_id` which must be used in all data packets for this message as well as in `stop_stream` command.

#### Attributes

| Name | Type | Value  / Description
|---|---|---
| `command` | string | `start_stream `
| `seq` | integer | Command sequence number
| `type` | string | Stream type. Only `audio` is currently supported
| `codec` | string | The name of audio codec used. Required for `audio` streams. Must be `opus`.
| `codec_header` | string | base64-encoded codec header buffer. Required for `opus` streams.
| `packet_duration` | integer | Audio packet duration in milliseconds. Values between 20 ms and 200 ms are supported.


#### Request:

```json
{
  "command": "start_stream",
  "seq": 2,
  "type": "audio",
  "codec": "opus",
  "codec_header": "gD4BPA==",
  "packet_duration": 200
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
| `stream_id ` | integer | Stream ID as returned in response to `start_stream` command


#### Request:

```json
{
  "command": "stop_stream",
  "stream_id": 22695
}
```

### Stream data
The same packet structure is used for any streamed data (e.g. audio) travelling both ways. The packet ID field is only used with the audio packets sent from the server to a client. Fields are stored in network byte order.

`{type(8) = 0x01, stream_id(32), packet_id(32), data[]}`


## Events

### `on_channel_status`

Indicates there was a change in channel status, which may include channel being connected / disconnected or number of online users changed.

#### Attributes

| Name | Type | Value  / Description
|---|---|---
| `command` | string | `on_channel_status`
| `channel ` | string | The name of the channel
| `status ` | string | Channel status. Can be `online` or `offline`
| `users_online ` | integer | Number of users currently connected to the channel. 

#### Example:

```json
{
  "command": "on_channel_status",
  "channel": "test",
  "status": "online",
  "users_online": 2
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
| `packet_duration` | integer | Audio packet duration in milliseconds. Values between 20 ms and 200 ms are supported
| `stream_id ` | integer |  The id of the stream that started
| `channel ` | string | The name of the channel
| `from ` | string | The username of the sender of the message


#### Example:

```json
{
  "command": "on_stream_start",
  "type": "audio",
  "codec": "opus",
  "codec_header": "gD4BPA==",
  "packet_duration": 200,
  "stream_id": 22695,
  "channel": "test",
  "from": "alex"
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


|Feature|Consumer Zello|ZelloWork
|---|---|---
|Access channels using authorized user credentials | Supported | Supported
|Access channels anonymously in listen only mode | Supported | Not supported
|Send and receive voice messages | Supported | Supported
|Interoperability with Zello apps on Android, iOS, and PC | Supported | Supported
|Create and access ad hoc channels anonymously | Planned | Planned
|Send and receive images | Planned | Planned
|Send and receive text messages | Planned | Planned
|Moderate Zello consumer channels | Planned | n/a
