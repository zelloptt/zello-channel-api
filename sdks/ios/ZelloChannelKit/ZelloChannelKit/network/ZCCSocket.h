//
//  ZCCSocket.h
//  sdk
//
//  Created by Greg Cooksey on 1/31/18.
//  Copyright © 2018 Zello. All rights reserved.
//

@import Foundation;

NS_ASSUME_NONNULL_BEGIN

@class ZCCSocket;
@class ZCCStreamParams;
@class ZCCWebSocketFactory;

@protocol ZCCSocketDelegate <NSObject>

- (void)socketDidOpen:(ZCCSocket *)socket;

- (void)socketDidClose:(ZCCSocket *)socket withError:(nullable NSError *)error;

- (void)socket:(ZCCSocket *)socket didReportStatus:(NSString *)status forChannel:(NSString *)channel usersOnline:(NSInteger)users;

- (void)socket:(ZCCSocket *)socket didStartStreamWithId:(NSUInteger)streamId params:(ZCCStreamParams *)params channel:(NSString *)channel sender:(NSString *)senderName;

- (void)socket:(ZCCSocket *)socket didStopStreamWithId:(NSUInteger)streamId;

- (void)socket:(ZCCSocket *)socket didReportError:(NSString *)errorMessage;

- (void)socket:(ZCCSocket *)socket didReceiveAudioData:(NSData *)data streamId:(NSUInteger)streamId packetId:(NSUInteger)packetId;

/**
 * Called if we receive a binary message with an unrecognized type byte. data contains the entire
 * data message, including the type byte. If we receive a binary message of length zero, this will
 * be called with type == 0.
 */
@optional
- (void)socket:(ZCCSocket *)socket didReceiveData:(NSData *)data unrecognizedType:(NSInteger)type;

/**
 * Called if we receive a text message with an unrecognized format. message contains the entire
 * message.
 */
@optional
- (void)socket:(ZCCSocket *)socket didReceiveUnrecognizedMessage:(NSString *)message;

@end

/**
 * @param refreshToken reconnect token, used to reconnect to the server if the connection is lost
 */
typedef void (^ZCCLogonCallback)(BOOL succeeded, NSString * _Nullable refreshToken, NSString * _Nullable errorMessage);
typedef void (^ZCCStartStreamCallback)(BOOL succeeded, NSUInteger streamId, NSString * _Nullable errorMessage);

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

- (void)sendStartStreamWithParams:(ZCCStreamParams *)params callback:(ZCCStartStreamCallback)callback timeoutAfter:(NSTimeInterval)timeout;

- (void)sendStopStream:(NSUInteger)streamId;

- (void)sendAudioData:(NSData *)data stream:(NSUInteger)streamId;

@end

NS_ASSUME_NONNULL_END
