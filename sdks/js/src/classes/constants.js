module.exports = {
  ERROR_NOT_ENOUGH_PARAMS: 'Not enough parameters',
  ERROR_INVALID_SERVER_PROTOCOL: 'Invalid server protocol, use ws:// or wss://',
  ERROR_UNSUPPORTED: "Your browser does not support all required APIs.\n" +
    "Read more here https://github.com/zelloptt/zello-channel-api",

  ERROR_RECORDING_NO_HTTPS: 'Recording will work over https:// loaded pages only',
  ERROR_WIDGET_ELEMENT_NOT_FOUND: 'DOM element for widget is not found',
  ERROR_INVALID_DECODER:
    'Invalid incoming message decoder. Should implement ZCC.Decoder interface',

  ERROR_INVALID_PLAYER:
    'Invalid incoming message player. Should implement ZCC.Player interface',


  ERROR_INVALID_RECORDER:
    'Invalid outgoing message recorder. Should implement ZCC.Recorder interface',

  ERROR_INVALID_ENCODER:
    'Invalid outgoing message encoder. Should implement ZCC.Encoder interface',

  ERROR_SESSION_FAIL_CONNECT: 'Failed to connect',

  ERROR_INVALID_IMAGE_WIDTH_OR_HEIGHT: 'Invalid image width or height',
  ERROR_FAILED_TO_SEND_IMAGE: 'Failed to send image',

  ERROR_IMAGE_NOT_READY_TO_BE_SENT: 'Image is not ready to be sent',
  ERROR_NO_CAMERA_AVAILABLE: 'No camera available',

  ERROR_TYPE_UNKNOWN_SERVER_ERROR: 'Unknown server error',
  ERROR_TYPE_CONFIGURATION: 'configuration',

  EVENT_ERROR: 'error',
  EVENT_CONNECT: 'connect',
  EVENT_CLOSE: 'close',
  EVENT_LOGON: 'logon',
  EVENT_STATUS: 'status',

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
  EVENT_OUTGOING_VOICE_DID_STOP: 'outgoing_voice_did_stop',

  EVENT_INCOMING_VOICE_DATA: 'incoming_voice_data',
  EVENT_INCOMING_VOICE_DATA_DECODED: 'incoming_voice_data_decoded',

  EVENT_INCOMING_IMAGE_DATA: 'incoming_image_data',

  EVENT_DATA: 'data',
  EVENT_DATA_ENCODED: 'data_encoded',
  EVENT_ENCODER_DONE: 'encoder_done',
  EVENT_RECORDER_READY: 'recorder_ready',

  EVENT_WIDGET_OPEN_BUTTON_CLICK: 'widget_open_button_click',
  EVENT_WIDGET_MUTE: 'widget_mute',
  EVENT_WIDGET_UNMUTE: 'widget_unmute',
  EVENT_WIDGET_SPEAKING_USERNAME_CLICK: 'speaking_username_click',

  EVENT_INCOMING_TEXT_MESSAGE: 'incoming_text_message',
  EVENT_INCOMING_LOCATION: 'incoming_location',
  EVENT_INCOMING_IMAGE: 'incoming_image',
  EVENT_IMAGE_DATA: 'image_data',
  EVENT_THUMBNAIL_DATA: 'thumbnail_data',

  EVENT_IMAGE_PREVIEW_DATA: 'image_preview_data',
  EVENT_THUMBNAIL_PREVIEW_DATA: 'thumbnail_preview_data',

  EVENT_DISPATCH_CALL_STATUS: 'dispatch_call_status',

  MAX_OUTGOING_IMAGE_SCALE_PX: 1280,
  OUTGOING_IMAGE_THUMBNAIL_SCALE_PX: 90,

  SN_STATUS_SUCCESS: 'success',
  SN_STATUS_ONLINE: 'online',
  SN_STATUS_OFFLINE: 'offline',

  MESSAGE_TYPE_AUDIO: 1,
  MESSAGE_TYPE_IMAGE: 2,
  MESSAGE_TYPE_JSON: 123,

  IMAGE_TYPE_FULL: 1,
  IMAGE_TYPE_THUMBNAIL: 2,

  TALK_PRIORITY_VALUE_NORMAL: 100,
  TALK_PRIORITY_VALUE_LOW: 10

};