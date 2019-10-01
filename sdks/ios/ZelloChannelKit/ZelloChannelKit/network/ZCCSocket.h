//
//  ZCCSocket.h
//  sdk
//
//  Created by Greg Cooksey on 1/31/18.
//  Copyright © 2018 Zello. All rights reserved.
//

@import Foundation;

#import "ZCCChannelInfo.h"

NS_ASSUME_NONNULL_BEGIN

@class ZCCImageHeader;
@class ZCCImageMessage;
@class ZCCLocationInfo;
@class ZCCSocket;
@class ZCCStreamParams;
@class ZCCWebSocketFactory;

@protocol ZCCSocketDelegate <NSObject>

- (void)socketDidOpen:(ZCCSocket *)socket;

- (void)socketDidClose:(ZCCSocket *)socket withError:(nullable NSError *)error;

- (void)socket:(ZCCSocket *)socket didReportStatus:(ZCCChannelInfo)status forChannel:(NSString *)channel usersOnline:(NSInteger)users;

- (void)socket:(ZCCSocket *)socket didStartStreamWithId:(NSUInteger)streamId params:(ZCCStreamParams *)params channel:(NSString *)channel sender:(NSString *)senderName;

- (void)socket:(ZCCSocket *)socket didStopStreamWithId:(NSUInteger)streamId;

- (void)socket:(ZCCSocket *)socket didReportError:(NSString *)errorMessage;

- (void)socket:(ZCCSocket *)socket didReceiveAudioData:(NSData *)data streamId:(NSUInteger)streamId packetId:(NSUInteger)packetId;

- (void)socket:(ZCCSocket *)socket didReceiveTextMessage:(NSString *)message sender:(NSString *)sender;

- (void)socket:(ZCCSocket *)socket didReceiveImageHeader:(ZCCImageHeader *)header;

- (void)socket:(ZCCSocket *)socket didReceiveImageData:(NSData *)data imageId:(NSUInteger)imageId isThumbnail:(BOOL)isThumbnail;

- (void)socket:(ZCCSocket *)socket didReceiveLocationMessage:(ZCCLocationInfo *)location sender:(NSString *)sender;

@optional
/**
 * Called if we receive a binary message with an unrecognized type byte. data contains the entire
 * data message, including the type byte. If we receive a binary message of length zero, this will
 * be called with type == 0.
 */
- (void)socket:(ZCCSocket *)socket didReceiveData:(NSData *)data unrecognizedType:(NSInteger)type;

@optional
/**
 * Called if we receive a message with an unrecognized format, or one that is missing required
 * parameters.
 */
- (void)socket:(ZCCSocket *)socket didEncounterErrorParsingMessage:(NSError *)error;

@end

/**
 * @param refreshToken reconnect token, used to reconnect to the server if the connection is lost
 */
typedef void (^ZCCLogonCallback)(BOOL succeeded, NSString * _Nullable refreshToken, NSString * _Nullable errorMessage);
typedef void (^ZCCStartStreamCallback)(BOOL succeeded, NSUInteger streamId, NSString * _Nullable errorMessage);

/**
 * Callback for simple commands that only return success or failure
 *
 * @param succeeded whether the server returned success for the command
 * @param errorMessage if the server returned failure, the error message from the server. If the
 *                     request timed out, a timed out message
 */
typedef void (^ZCCSimpleCommandCallback)(BOOL succeeded, NSString * _Nullable errorMessage);

/**
 * @param imageId the id of the image message. Must be passed as part of the image data messages.
 */
typedef void (^ZCCSendImageCallback)(BOOL succeeded, UInt32 imageId, NSString * _Nullable errorMessage);

/**
 * Wraps underlying websocket and translates between our high-level messages and bytes on the
 * wire.
 */
@interface ZCCSocket : NSObject

@property (atomic, weak) id<ZCCSocketDelegate> delegate;

#pragma mark - NSObject

- (instancetype)init NS_UNAVAILABLE;

- (instancetype)initWithURL:(NSURL *)url;

- (instancetype)initWithURL:(NSURL *)url socketFactory:(ZCCWebSocketFactory *)factory NS_DESIGNATED_INITIALIZER;

/**
 * The dispatch queue that delegate and response callbacks are called on
 */
- (void)setDelegateQueue:(nullable dispatch_queue_t)queue;

#pragma mark - Networking

- (void)close;

- (void)open;

- (void)sendLogonWithAuthToken:(nullable NSString *)authToken refreshToken:(nullable NSString *)refreshToken channel:(NSString *)channel username:(NSString *)username password:(NSString *)password callback:(ZCCLogonCallback)callback timeoutAfter:(NSTimeInterval)timeout;

- (void)sendTextMessage:(NSString *)message recipient:(nullable NSString *)username timeoutAfter:(NSTimeInterval)timeout;

- (void)sendLocation:(ZCCLocationInfo *)location recipient:(nullable NSString *)username timeoutAfter:(NSTimeInterval)timeout;

/**
 * Sends a start_stream command to start sending a voice message
 *
 * @param params codec parameters for the stream
 * @param username if non-nil, the stream will only be received by the named user
 * @param callback block that is called when we receive a response from the server
 * @param timeout how long to wait for a response from the server
 */
- (void)sendStartStreamWithParams:(ZCCStreamParams *)params recipient:(nullable NSString *)username callback:(ZCCStartStreamCallback)callback timeoutAfter:(NSTimeInterval)timeout;

- (void)sendStopStream:(NSUInteger)streamId;

- (void)sendAudioData:(NSData *)data stream:(NSUInteger)streamId;

- (void)sendImage:(ZCCImageMessage *)message callback:(ZCCSendImageCallback)callback timeoutAfter:(NSTimeInterval)timeout;
- (void)sendImageData:(ZCCImageMessage *)message imageId:(UInt32)imageId;


@end

NS_ASSUME_NONNULL_END
