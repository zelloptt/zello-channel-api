//
//  ZCCErrors.h
//  sdk
//
//  Created by Greg Cooksey on 2/14/18.
//  Copyright © 2018 Zello. All rights reserved.
//

#import <Foundation/Foundation.h>

/**
 * Error domain for Zello Channels SDK errors. All errors in this domain have a code represented
 * in ZCCErrorCode.
 */
FOUNDATION_EXPORT NSString * const ZCCErrorDomain;

/**
 * When an NSError's code is ZCCErrorCodeWebSocketError, this key will be present and its value
 * will be the reason string passed up from the WebSockets library.
 */
FOUNDATION_EXPORT NSString * const ZCCErrorWebSocketReasonKey;

/**
 * When the WSS server sends an error message, we'll pass it up as the value for this key
 */
FOUNDATION_EXPORT NSString * const ZCCServerErrorMessageKey;

/**
 * If the server sends an unrecognized message, it will be contained as the value for this key.
 * Please include in bug reports to Zello.
 */
FOUNDATION_EXPORT NSString * const ZCCServerInvalidMessageKey;

/**
 * userInfo key for errors that wrap an underlying OSStatus value. The value for this key is an
 * OSStatus value wrapped in an NSNumber.
 */
FOUNDATION_EXPORT NSString * const ZCCOSStatusKey;

/**
 * If the error object was created in response to an NSException being thrown, this key will be
 * present and its value will be the NSException object.
 */
FOUNDATION_EXPORT NSString * const ZCCExceptionKey;

/// Value is the message type that we were trying to parse
FOUNDATION_EXPORT NSString * const ZCCInvalidJSONMessageKey;
/// Value is the key in the JSON object that we were trying to parse
FOUNDATION_EXPORT NSString * const ZCCInvalidJSONKeyKey;
/// Value is the description of the error encountered while trying to parse the JSON object
FOUNDATION_EXPORT NSString * const ZCCInvalidJSONProblemKey;

/**
 * Error messages sent by the Zello channels server
 */
typedef NSString * ZCCServerErrorMessage NS_TYPED_ENUM;
/**
 * The server didn't recognize the command sent by the client
 */
FOUNDATION_EXPORT ZCCServerErrorMessage const ZCCServerErrorMessageUnknownCommand;
/**
 * An internal error occured within the server. If the error persists please contact us at
 * support@zello.com
 */
FOUNDATION_EXPORT ZCCServerErrorMessage const ZCCServerErrorMessageInternalServerError;
/**
 * The command received included malformed JSON
 */
FOUNDATION_EXPORT ZCCServerErrorMessage const ZCCServerErrorMessageInvalidJSON;
/**
 * The server didn't  recognize the command format
 */
FOUNDATION_EXPORT ZCCServerErrorMessage const ZCCServerErrorMessageInvalidRequest;
/**
 * Username, password or token are not valid
 */
FOUNDATION_EXPORT ZCCServerErrorMessage const ZCCServerErrorMessageNotAuthorized;
/**
 * Server received a command before successful logon
 */
FOUNDATION_EXPORT ZCCServerErrorMessage const ZCCServerErrorMessageNotLoggedIn;
/**
 * The command didn't include required fields
 */
FOUNDATION_EXPORT ZCCServerErrorMessage const ZCCServerErrorMessageNotEnoughParams;
/**
 * The connection to the server was explicitly closed by the Zello server system.
 */
FOUNDATION_EXPORT ZCCServerErrorMessage const ZCCServerErrorMessageServerClosedConnection;
/**
 * The channel you are trying to talk to is not yet connected. Wait for channel status to be <code>online</code>
 * before sending a message
 */
FOUNDATION_EXPORT ZCCServerErrorMessage const ZCCServerErrorMessageChannelNotReady;
/**
 * The client tried to send a message over listen-only connection
 */
FOUNDATION_EXPORT ZCCServerErrorMessage const ZCCServerErrorMessageListenOnlyConnection;
/**
 * Unable to start the stream for unknown reason. You can try again later.
 */
FOUNDATION_EXPORT ZCCServerErrorMessage const ZCCServerErrorMessageFailedToStartStream;
/**
 * Unable to stop the stream for unknown reason. This error is safe to ignore.
 */
FOUNDATION_EXPORT ZCCServerErrorMessage const ZCCServerErrorMessageFailedToStopStream;
/**
 * An error occured while trying to send stream data packet
 */
FOUNDATION_EXPORT ZCCServerErrorMessage const ZCCServerErrorMessageFailedToSendData;
/**
 * A malformed audio packet was received
 */
FOUNDATION_EXPORT ZCCServerErrorMessage const ZCCServerErrorMessageInvalidAudioPacket;

/// Error codes for Zello Channels SDK errors. See <code>ZCCErrors.h</code> for more information about errors.
typedef NS_ENUM(NSInteger, ZCCErrorCode) {
  /**
   * An error has occurred in the underlying web socket. If the web socket layer provided an error
   * string, it will be present in userInfo as the value for the key <code>ZCCErrorWebSocketReasonKey</code>.
   */
  ZCCErrorCodeWebSocketError = 200,

  /**
   * <code>ZCCSession</code> could not connect to the server due to a malformed server address or server lookup
   * failure.
   */
  ZCCErrorCodeInvalidServerAddress = 1001,
  /// Session error
  ZCCErrorCodeConnectFailed = 1002,
  /**
   * The server has sent an unexpected message to the SDK. The error's <code>userInfo</code> dictionary
   * will contain the message as the value for the <code><ZCCServerInvalidMessageKey></code> key.
   */
  ZCCErrorCodeBadResponse = 1003,
  /// Session error
  ZCCErrorCodeNoResponse = 1004,
  /// Session error
  ZCCErrorCodeBadCredentials = 1005,
  /// Stream error
  ZCCErrorCodeBusy = 1006,
  /**
   * Invalid JSON message from the server. The error's <code>userInfo</code> dictionary will contain
   * the message as the value for the <code>ZCCServerInvalidMessageKey</code> key.
   */
  ZCCErrorCodeInvalidMessage = 1007,

  /// Something went wrong in the audio codec layer
  ZCCErrorCodeDecoderUnknown = 2000,

  /// Something went wrong in the Opus decoder
  ZCCErrorCodeDecoderOpus = 2010,

  /**
   * Not used as an error code. All error codes between <code>DecoderUnknown</code> and <code>DecoderLast</code>
   * are decoder-related errors.
   */
  ZCCErrorCodeDecoderLast = 2099,

  /// Something went wrong in the audio codec layer
  ZCCErrorCodeEncoder = 2100,

  /// Something went wrong in the audio player layer
  ZCCErrorCodeAudioPlayerUnknown = 2500,

  /**
   * Something went wrong in Audio Queue Services. The userInfo dictionary will contain
   * <code>ZCCOSStatusKey</code> with a value describing the specific error.
   */
  ZCCErrorCodeAudioQueueServices = 2501,

  /**
   * Not used as an error code. All error codes between <code>AudioPlayerUnknown</code> and <code>AudioPlayerLast</code>
   * are audio player-related errors.
   */
  ZCCErrorCodeAudioPlayerLast = 2599,

  /// Something went wrong with the iOS device
  ZCCErrorCodeDeviceUnknown = 3000,

  /// Permission to access the microphone has not been granted
  ZCCErrorCodePermissionsNoRecord = 3501,

  /// Something else went wrong
  ZCCErrorCodeUnknown = 9000
};
