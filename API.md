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
|Consumer Zello|https://zello.io/ws
|ZelloWork|https://zellowork.io/ws/[network name]
|Zello Enterprise Server|https://[your server domain]/ws

## Authentication


## WebSocket commands protocol

This API uses JSON-formatted WebSocket text messages for control protocol and WebSocket binary messages for voice data.
The list of common command attributes includes:

* `command` Command name
* `seq` Sequence number

Each request contains a command and an optional sequence number. A sequence number is required only if a response is expected. Both server and client maintain their own counters to ensure that unique sequence numbers are used with commands that include a sequence number.

## Logon

### `logon`
Request:

```json
{
  "command": "logon",
  "seq": 1,
  "auth_token": "[json web token]",
  "refresh_token": "[refresh json web token]",
  "username": "shelock",
  "password": "secret",
  "channel": "Baker Street 221B"
}
``` 
Response:

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

## Sending messages
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