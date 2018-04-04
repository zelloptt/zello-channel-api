# Zello Channel API specification
[WebSocket](http://www.websocket.org/aboutwebsocket.html) based API to connect to Zello channels

Version 1.0


## Overview

This document is intended for developers interested in implementation of their own Zello Channel API client connecting to Zello channels. If you want integrate Zello into your iOS or Android app, check out the [mobile SDKs](sdks) instead.

This API supports subset of Zello features and currently focused on sending and receiving channel voice messages. See [Supported features](#supported-features) for the complete list.

To access the API you need to generate a valid access token, based on [JWT](https://jwt.io/) standard. See [Authentication](#authentication).

## API entry points
|Service|WebSocket URL
|---|---
|Consumer Zello|wss://zello.io/ws
|ZelloWork|wss://zellowork.io/ws/[network name]
|Zello Enterprise Server|wss://[your server domain]/ws

Note that the protocol only supports secure connections over TLS.

## Authentication


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
| `username` | string | (optional) Username to logon with. If not proided the client will connect anonymously.
| `password` | string | (optional) Password to logon with. Required if username is provided.
| `channel` | string | The name of the channel to connect to. 

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
Request:

```json
{
  "command": "start_stream",
  "seq": 2,
  "type": "audio",
  "codec": "opus",
  "codec_header": <base64>,
  "packet_duration": 200
}
``` 
Response:

```json
{
  "seq": 2,
  "success": true,
  "stream_id": 22695
}
```

### `stop_stream`

```json
{
  "command": "stop_stream",
  "stream_id": 22695
}
```

## Events
Channel status changes:
### `on_channel_status`
```json
{
  "command": "on_channel_status",
  "channel": "test",
  "status": "online",
  "users_online": 2
}
```


Receiving messages:
### `on_stream_start`
```json
{
  "command": "on_stream_start",
  "type": "audio",
  "codec": "opus",
  "codec_header": <base64>,
  "packet_duration": 200,
  "stream_id": 22695,
  "channel": "test",
  "from": "alex"
}
```

### `on_stream_stop` 
```json
{
  "command": "on_stream_stop",
  "stream_id": 22695
}
```

Errors and state changes:

### `on_error`
```json
{
  "command": "on_error",
  "error": "Error description"
}
```
## Binary data
`{type(8), data[]}`

## Stream data
The same packet structure is used for any streamed data (e.g. audio) travelling both ways. The packet ID field is only used with the audio packets sent from the server to a client. Fields are stored in network byte order.

`{type(8) = 0x01, stream_id(32), packet_id(32), data[]}`

## Error codes

|Error Code | Description
|---|---
||

## Supported features



|Feature|Support status
|---|---
|Access consumer Zello channels using authorized user credentials | Supported
|Access public Zello channels anonymously in listen only mode | Supported
|Access ZelloWork channels using authorized user credentials | Supported
|Send and receive voice messages | Supported
|Interoperability with Zello apps on Android, iOS, and PC | Supported
|Create and access ad hoc Zello channels anonymously | Planned
|Create and access ad hoc ZelloWork channels anonymously | Planned
|Send and receive images | Planned
|Send and receive text messages | Planned
|Moderate Zello consumer channels | Planned