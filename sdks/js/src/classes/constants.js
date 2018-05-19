module.exports = {
  ERROR_NOT_ENOUGH_PARAMS: 'Not enough parameters',
  ERROR_INVALID_SERVER_PROTOCOL: 'Invalid server protocol, use ws:// or wss://',
  ERROR_UNSUPPORTED: "Your browser does not support all required APIs.\n" +
    "Read more here https://github.com/zelloptt/zello-channel-api",

  ERROR_RECORDING_NO_HTTPS: 'Recording will work over https:// loaded pages only',
  ERROR_WIDGET_ELEMENT_NOT_FOUND: 'DOM element for widget is not found',
  ERROR_INVALID_DECODER:
    'Invalid incoming message decoder. Should implement ZCC.Decoder interface.',

  ERROR_INVALID_PLAYER:
    'Invalid incoming message player. Should implement ZCC.Player interface.',


  ERROR_INVALID_RECORDER:
    'Invalid outgoing message recorder. Should implement ZCC.Recorder interface.',

  ERROR_INVALID_ENCODER:
    'Invalid outgoing message encoder. Should implement ZCC.Encoder interface.',

  EVENT_ERROR: 'error',
  EVENT_CONNECT: 'connect',
  EVENT_CLOSE: 'close',
  EVENT_LOGON: 'logon',
  EVENT_STATUS: 'status',

  EVENT_BUTTON_PRESS: 'button_press',

  EVENT_START_STREAM: 'start_stream',
  EVENT_STOP_STREAM: 'stop_stream',

  EVENT_SESSION_START_CONNECT: 'session_start_connect',
  EVENT_SESSION_CONNECT: 'session_connect',
  EVENT_SESSION_FAIL_CONNECT: 'session_fail_connect',
  EVENT_SESSION_CONNECTION_LOST: 'session_connection_lost',
  EVENT_SESSION_DISCONNECT: 'session_disconnect',

  EVENT_INCOMING_VOICE_WILL_START: 'incoming_voice_will_start',
  EVENT_INCOMING_VOICE_DID_START: 'incoming_voice_did_start',
  EVENT_INCOMING_VOICE_DID_STOP: 'incoming_voice_did_stop',

  EVENT_INCOMING_VOICE_DATA: 'incoming_voice_data',
  EVENT_INCOMING_VOICE_DATA_DECODED: 'incoming_voice_data_decoded',

  EVENT_DATA: 'data',
  EVENT_DATA_ENCODED: 'data_encoded',
  EVENT_RECORDER_READY: 'recorder_ready'

};