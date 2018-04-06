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
 * userInfo key for errors that wrap an underlying OSStatus value. The value for this key is an
 * OSStatus value wrapped in an NSNumber.
 */
FOUNDATION_EXPORT NSString * const ZCCOSStatusKey;

/**
 * If the error object was created in response to an NSException being thrown, this key will be
 * present and its value will be the NSException object.
 */
FOUNDATION_EXPORT NSString * const ZCCExceptionKey;

/// Error codes for Zello Channels SDK errors.
typedef NS_ENUM(NSInteger, ZCCErrorCode) {
  /**
   * An error has occurred in the underlying web socket. If the web socket layer provided an error
   * string, it will be present in userInfo as the value for the key ZCCErrorWebSocketReasonKey.
   */
  ZCCErrorCodeWebSocketError = 200,

  /**
   * ZCCSession could not connect to the server due to a malformed server address or server lookup
   * failure.
   */
  ZCCErrorCodeInvalidServerAddress = 1001,
  /// Session error
  ZCCErrorCodeConnectFailed = 1002,
  /// Session error
  ZCCErrorCodeBadResponse = 1003,
  /// Session error
  ZCCErrorCodeNoResponse = 1004,
  /// Session error
  ZCCErrorCodeBadCredentials = 1005,
  /// Stream error
  ZCCErrorCodeBusy = 1006,

  /// Something went wrong in the audio codec layer
  ZCCErrorCodeDecoderUnknown = 2000,

  /// Something went wrong in the Opus decoder
  ZCCErrorCodeDecoderOpus = 2010,

  /**
   * Not used as an error code. All error codes between DecoderUnknown and DecoderLast are decoder-related
   * errors.
   */
  ZCCErrorCodeDecoderLast = 2099,

  /// Something went wrong in the audio codec layer
  ZCCErrorCodeEncoder = 2100,

  /// Something went wrong in the audio player layer
  ZCCErrorCodeAudioPlayerUnknown = 2500,

  /**
   * Something went wrong in Audio Queue Services. The userInfo dictionary will contain
   * ZCCOSStatusKey with a value describing the specific error.
   */
  ZCCErrorCodeAudioQueueServices = 2501,

  /**
   * Not used as an error code. All error codes between AudioPlayerUnknown and AudioPlayerLast
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
