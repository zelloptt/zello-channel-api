//
//  ZCCSocket.m
//  sdk
//
//  Created by Greg Cooksey on 1/31/18.
//  Copyright © 2018 Zello. All rights reserved.
//

#import "ZCCSRWebSocket.h"
#import "ZCCSocket.h"
#import "ZCCCommands.h"
#import "ZCCErrors.h"
#import "ZCCProtocol.h"
#import "ZCCQueueRunner.h"
#import "ZCCStreamParams.h"
#import "ZCCWebSocketFactory.h"

typedef NS_ENUM(NSInteger, ZCCSocketRequestType) {
  ZCCSocketRequestTypeLogon = 1,
  ZCCSocketRequestTypeStartStream,
  ZCCSocketRequestTypeLocationMessage,
  ZCCSocketRequestTypeTextMessage
};

@interface ZCCSocketResponseCallback : NSObject
@property (nonatomic, readonly) NSInteger sequenceNumber;
@property (nonatomic, readonly) ZCCSocketRequestType requestType;
@property (nonatomic, strong) ZCCLogonCallback logonCallback;
@property (nonatomic, strong) ZCCStartStreamCallback startStreamCallback;
/**
 * @warning simpleCommandCallback is called on an arbitrary thread/queue, so if it needs to perform
 *          work on a particular queue, it is responsible for dispatching to that queue.
 */
@property (nonatomic, strong) ZCCSimpleCommandCallback simpleCommandCallback;
@property (nonatomic, strong) dispatch_block_t timeoutBlock;
- (instancetype)init NS_UNAVAILABLE;
- (instancetype)initWithSequenceNumber:(NSInteger)sequenceNumber type:(ZCCSocketRequestType)type NS_DESIGNATED_INITIALIZER;
@end

@implementation ZCCSocketResponseCallback
- (instancetype)initWithSequenceNumber:(NSInteger)sequenceNumber type:(ZCCSocketRequestType)type {
  self = [super init];
  if (self) {
    _sequenceNumber = sequenceNumber;
    _requestType = type;
  }
  return self;
}
@end

@interface ZCCSocket () <ZCCSRWebSocketDelegate>
@property (nonatomic, strong, readonly) ZCCQueueRunner *workRunner;

/// @warning Only access nextSequenceNumber from the workRunner's queue
@property (nonatomic) NSInteger nextSequenceNumber;

@property (nonatomic, strong, readonly) ZCCSRWebSocket *webSocket;

@property (nonatomic, strong) NSMutableDictionary <NSNumber *, ZCCSocketResponseCallback *> *callbacks;

@property (nonatomic, strong) ZCCQueueRunner *delegateRunner;

@end

@implementation ZCCSocket

#pragma mark - NSObject

- (instancetype)initWithURL:(NSURL *)url {
  return [self initWithURL:url socketFactory:[[ZCCWebSocketFactory alloc] init]];
}

- (instancetype)initWithURL:(NSURL *)url socketFactory:(ZCCWebSocketFactory *)factory {
  self = [super init];
  if (self) {
    _callbacks = [[NSMutableDictionary alloc] init];
    _delegateRunner = [[ZCCQueueRunner alloc] initWithName:@"ZCCSocketDelegate"];
    _webSocket = [factory socketWithURL:url];
    _webSocket.delegate = self;
    _workRunner = [[ZCCQueueRunner alloc] initWithName:@"ZCCSocket"];
  }
  return self;
}

- (void)dealloc {
  _webSocket.delegate = nil;
}

#pragma mark - Properties

- (void)setDelegateQueue:(dispatch_queue_t)queue {
  if (queue) {
    self.delegateRunner = [[ZCCQueueRunner alloc] initWithQueue:queue];
  } else {
    self.delegateRunner = [[ZCCQueueRunner alloc] initWithName:@"ZCCSocketDelegate"];
  }
}

#pragma mark - Networking

- (void)close {
  [self.webSocket close];
}

- (void)open {
  [self.webSocket open];
}

- (void)sendLogonWithAuthToken:(NSString *)authToken
                  refreshToken:(NSString *)refreshToken
                       channel:(NSString *)channel
                      username:(NSString *)username
                      password:(NSString *)password
                      callback:(ZCCLogonCallback)callback
                  timeoutAfter:(NSTimeInterval)timeout {
  [self.workRunner runSync:^{
    [self sendRequest:^NSString *(NSInteger seqNo) {
      return [ZCCCommands logonWithSequenceNumber:seqNo authToken:authToken refreshToken:refreshToken channel:channel username:username password:password];
    } type:ZCCSocketRequestTypeLogon timeout:timeout prepareCallback:^(ZCCSocketResponseCallback *responseCallback) {
      responseCallback.logonCallback = callback;
    } failBlock:^(NSString *failureReason) {
      callback(NO, nil, failureReason);
    } timeoutBlock:^(ZCCSocketResponseCallback *responseCallback) {
      responseCallback.logonCallback(NO, nil, @"Timed out");
    }];
  }];
}

- (void)sendLocation:(ZCCLocationInfo *)location recipient:(NSString *)username timeoutAfter:(NSTimeInterval)timeout {
  ZCCSimpleCommandCallback callback = ^(BOOL success, NSString *errorMessage) {
    if (!success && errorMessage) {
      [self reportError:errorMessage];
    }
  };

  [self.workRunner runSync:^{
    [self sendRequest:^NSString *(NSInteger seqNo) {
      return [ZCCCommands sendLocation:location sequenceNumber:seqNo recipient:username];
    } type:ZCCSocketRequestTypeLocationMessage timeout:timeout prepareCallback:^(ZCCSocketResponseCallback *responseCallback) {
      responseCallback.simpleCommandCallback = callback;
    } failBlock:^(NSString *failureReason) {
      callback(NO, failureReason);
    } timeoutBlock:^(ZCCSocketResponseCallback *responseCallback) {
      responseCallback.simpleCommandCallback(NO, @"Send location timed out");
    }];
  }];
}

- (void)sendTextMessage:(NSString *)message recipient:(NSString *)username timeoutAfter:(NSTimeInterval)timeout {
  [self.workRunner runSync:^{
    [self sendRequest:^NSString *(NSInteger seqNo) {
      return [ZCCCommands sendText:message sequenceNumber:seqNo recipient:username];
    } type:ZCCSocketRequestTypeTextMessage timeout:timeout prepareCallback:^(ZCCSocketResponseCallback *responseCallback) {
      // TODO: Implement response prep handler
    } failBlock:^(NSString *failureReason) {
      // TODO: Implement failure handler
    } timeoutBlock:^(ZCCSocketResponseCallback *responseCallback) {
      // TODO: Implement timeout handler
    }];
  }];
}

- (void)sendStartStreamWithParams:(ZCCStreamParams *)params
                           recipient:(NSString *)username
                         callback:(nonnull ZCCStartStreamCallback)callback
                     timeoutAfter:(NSTimeInterval)timeout {
  [self.workRunner runSync:^{
    [self sendRequest:^(NSInteger seqNo) {
      return [ZCCCommands startStreamWithSequenceNumber:seqNo params:params recipient:username];
    } type:ZCCSocketRequestTypeStartStream timeout:timeout prepareCallback:^(ZCCSocketResponseCallback *responseCallback) {
      responseCallback.startStreamCallback = callback;
    } failBlock:^(NSString *failureReason) {
      callback(NO, 0, failureReason);
    } timeoutBlock:^(ZCCSocketResponseCallback *responseCallback) {
      responseCallback.startStreamCallback(NO, 0, @"Timed out");
    }];
  }];
}

/**
 * This method manages the boilerplate of sending messages to the WSS server that we expect responses
 * to. It takes a number of block parameters that serve to fill in the details of the message we
 * send to the server and the handling we do when we receive a response.
 *
 * @warning Only call from workRunner
 *
 * @param prepareRequest this block is called with the sequence number that should be used for the
 * request. It should return a string to be sent to the server.
 *
 * @param requestType the type of the request. Categorizes the ZCCSocketRequestCallback object that
 * represents the pending request.
 *
 * @param timeout if > 0, specifies the amount of time to wait after sending the message to the
 * server before calling the timedOut block.
 *
 * @param prepareCallback this block is called with the ZCCSocketRequestCallback object that will
 * be used to handle responses from the server. The block should set the appropriate callback
 * property of the ZCCSocketRequestCallback object and do any other necessary preparation.
 *
 * @param fail this block is called if the request fails to send in the same call context
 * as sendRequest:... was called
 *
 * @param timedOut this block is called if timeout > 0 and the request is still outstanding when
 * the timeout expires. Its argument is the response callback object for this request.
 */
- (void)sendRequest:(NSString * (^)(NSInteger seqNo))prepareRequest
               type:(ZCCSocketRequestType)requestType
            timeout:(NSTimeInterval)timeout
    prepareCallback:(void (^)(ZCCSocketResponseCallback *responseCallback))prepareCallback
          failBlock:(void (^)(NSString *failureReason))fail
       timeoutBlock:(void (^)(ZCCSocketResponseCallback *responseCallback))timedOut {
  NSInteger seqNo = [self incrementedSequenceNumber];
  NSString *request = prepareRequest(seqNo);
  NSError *error = nil;
  if (![self.webSocket sendString:request error:&error]) {
    if (error) {
      [self.delegateRunner runAsync:^{
        fail(error.localizedDescription);
      }];
      return;
    }

    [self.delegateRunner runAsync:^{
      fail(@"Failed to send");
    }];
    return;
  }

  dispatch_block_t timeoutBlock = nil;
  if (timeout > 0) {
    timeoutBlock = dispatch_block_create(0, ^{
      ZCCSocketResponseCallback *responseCallback = self.callbacks[@(seqNo)];
      if (responseCallback) {
        [self.delegateRunner runAsync:^{
          timedOut(responseCallback);
        }];
        self.callbacks[@(seqNo)] = nil;
      }
    });
    [self.workRunner run:timeoutBlock after:timeout];
  }

  ZCCSocketResponseCallback *responseCallback = [[ZCCSocketResponseCallback alloc] initWithSequenceNumber:seqNo type:requestType];
  prepareCallback(responseCallback);
  responseCallback.timeoutBlock = timeoutBlock;
  self.callbacks[@(seqNo)] = responseCallback;
}

- (void)sendStopStream:(NSUInteger)streamId {
  [self.workRunner runSync:^{
    NSInteger seqNo = [self incrementedSequenceNumber];
    NSString *stopCommand = [ZCCCommands stopStreamWithSequenceNumber:seqNo streamId:streamId];
    NSError *error = nil;
    if (![self.webSocket sendString:stopCommand error:&error]) {
      // TODO: Add a way to return error instead of logging and silently failing
      NSLog(@"[ZCC] Failed to send stop stream: %@", error);
    }
  }];
}

- (void)sendAudioData:(NSData *)data stream:(NSUInteger)streamId {
  NSData *dataMessage = [ZCCCommands messageForAudioData:data stream:streamId];
  NSError *error = nil;
  if (![self.webSocket sendData:dataMessage error:&error]) {
    // TODO: Add a way to return error instead of logging and silently failing
    NSLog(@"[ZCC] Failed to send audio: %@", error);
  }
}

#pragma mark - SRWebSocketDelegate

- (void)webSocketDidOpen:(ZCCSRWebSocket *)webSocket {
  id<ZCCSocketDelegate> delegate = self.delegate;
  if ([delegate respondsToSelector:@selector(socketDidOpen:)]) {
    [self.delegateRunner runAsync:^{
      [delegate socketDidOpen:self];
    }];
  }
}

- (void)webSocket:(ZCCSRWebSocket *)webSocket didFailWithError:(NSError *)error {
  id<ZCCSocketDelegate> delegate = self.delegate;
  if ([delegate respondsToSelector:@selector(socketDidClose:withError:)]) {
    // TODO: Wrap error in something more meaningful to our SDK?
    [self.delegateRunner runAsync:^{
      [delegate socketDidClose:self withError:error];
    }];
  }
}

- (void)webSocket:(ZCCSRWebSocket *)webSocket didCloseWithCode:(NSInteger)code reason:(nullable NSString *)reason wasClean:(BOOL)wasClean {
  id<ZCCSocketDelegate> delegate = self.delegate;
  if ([delegate respondsToSelector:@selector(socketDidClose:withError:)]) {
    // Anything other than code 1000 (ZCCSRStatusCodeNormal) is an error so we should report it to our delegate
    NSError *error = nil;
    if (code != ZCCSRStatusCodeNormal) {
      NSDictionary *errorInfo = nil;
      if (reason) {
        errorInfo = @{ZCCErrorWebSocketReasonKey:reason};
      }
      error = [NSError errorWithDomain:ZCCErrorDomain code:ZCCErrorCodeWebSocketError userInfo:errorInfo];
    }

    [self.delegateRunner runAsync:^{
      [delegate socketDidClose:self withError:error];
    }];
  }
}

- (void)webSocket:(ZCCSRWebSocket *)webSocket didReceiveMessageWithString:(NSString *)string {
  [self.workRunner runSync:^{
    NSError *error = nil;
    NSData *data = [string dataUsingEncoding:NSUTF8StringEncoding];
    NSDictionary *json = [NSJSONSerialization JSONObjectWithData:data options:0 error:&error];
    if (!json) {
      id<ZCCSocketDelegate> delegate = self.delegate;
      if ([delegate respondsToSelector:@selector(socket:didReceiveUnrecognizedMessage:)]) {
        [self.delegateRunner runAsync:^{
          [delegate socket:self didReceiveUnrecognizedMessage:string];
        }];
      }
      return;
    }

    id seqNo = json[ZCCSeqKey];
    if ([seqNo isKindOfClass:[NSNumber class]]) {
      [self handleResponse:json original:string];
      return;
    }
    id command = json[ZCCCommandKey];
    if (![command isKindOfClass:[NSString class]]) {
      [self reportInvalidStringMessage:string];
      return;
    }

    if ([command isEqualToString:ZCCEventOnChannelStatus]) {
      [self handleChannelStatus:json original:string];
      return;
    }
    if ([command isEqualToString:ZCCEventOnStreamStart]) {
      [self handleStreamStart:json original:string];
      return;
    }
    if ([command isEqualToString:ZCCEventOnStreamStop]) {
      [self handleStreamStop:json original:string];
      return;
    }
    if ([command isEqualToString:ZCCEventOnError]) {
      [self handleError:json original:string];
      return;
    }
    if ([command isEqualToString:ZCCEventOnTextMessage]) {
      [self handleTextMessage:json original:string];
      return;
    }

    [self reportInvalidStringMessage:string];
  }];
}

- (void)handleResponse:(NSDictionary *)encoded original:(NSString *)original {
  NSNumber *seq = encoded[ZCCSeqKey];
  ZCCSocketResponseCallback *callback = self.callbacks[seq];
  if (!callback) {
    return;
  }
  switch (callback.requestType) {
    case ZCCSocketRequestTypeLogon:
      [self handleLogonResponse:encoded callback:callback original:original];
      break;

    case ZCCSocketRequestTypeStartStream:
      [self handleStartStreamResponse:encoded callback:callback original:original];
      break;

    case ZCCSocketRequestTypeTextMessage:
    case ZCCSocketRequestTypeLocationMessage:
      [self handleSimpleCommandResponse:encoded callback:callback original:original];
      break;
  }
  if (callback.timeoutBlock) {
    dispatch_block_cancel(callback.timeoutBlock);
  }
  self.callbacks[seq] = nil;
}

- (void)handleLogonResponse:(NSDictionary *)encoded callback:(ZCCSocketResponseCallback *)callback original:(NSString *)original {
  if (!callback.logonCallback) {
    // Incorrect response type
    [self reportInvalidStringMessage:original];
    return;
  }

  id success = encoded[ZCCSuccessKey];
  if ([success isKindOfClass:[NSNumber class]] && [success boolValue]) {
    id refreshToken = encoded[ZCCRefreshTokenKey];
    if (![refreshToken isKindOfClass:[NSString class]]) {
      refreshToken = nil;
    }
    [self.delegateRunner runAsync:^{
      callback.logonCallback(YES, refreshToken, nil);
    }];
    return;
  }

  id errorMessage = encoded[ZCCErrorKey];
  if (![errorMessage isKindOfClass:[NSString class]]) {
    errorMessage = nil;
  }
  [self.delegateRunner runAsync:^{
    callback.logonCallback(NO, nil, errorMessage);
  }];
}

- (void)handleStartStreamResponse:(NSDictionary *)encoded callback:(ZCCSocketResponseCallback *)callback original:(NSString *)original {
  if (!callback.startStreamCallback) {
    // Incorrect response type
    [self reportInvalidStringMessage:original];
    return;
  }

  id success = encoded[ZCCSuccessKey];
  if ([success isKindOfClass:[NSNumber class]] && [success boolValue]) {
    id streamId = encoded[ZCCStreamIDKey];
    if (![streamId isKindOfClass:[NSNumber class]]) {
      // Missing or invalid stream id
      [self reportInvalidStringMessage:original];
      return;
    }
    long long streamIdValue = [streamId longLongValue];
    if (streamIdValue < 0 || streamIdValue > UINT32_MAX) {
      // Stream ID out of range
      [self reportInvalidStringMessage:original];
      return;
    }
    [self.delegateRunner runAsync:^{
      callback.startStreamCallback(YES, (NSUInteger)streamIdValue, nil);
    }];
    return;
  }

  // I'm guessing at how to handle error responses when attempting to start a stream
  id errorMessage = encoded[ZCCErrorKey];
  if (![errorMessage isKindOfClass:[NSString class]]) {
    errorMessage = nil;
  }
  [self.delegateRunner runAsync:^{
    callback.startStreamCallback(NO, 0, errorMessage);
  }];
}

- (void)handleSimpleCommandResponse:(NSDictionary *)encoded callback:(ZCCSocketResponseCallback *)callback original:(NSString *)original {
  if (!callback.simpleCommandCallback) {
    [self reportInvalidStringMessage:original];
    return;
  }
  ZCCSimpleCommandCallback simpleCallback = callback.simpleCommandCallback;

  id success = encoded[ZCCSuccessKey];
  if ([success isKindOfClass:[NSNumber class]] && [success boolValue]) {
    simpleCallback(YES, nil);
    return;
  }

  id errorMessage = encoded[ZCCErrorKey];
  if (![errorMessage isKindOfClass:[NSString class]]) {
    errorMessage = @"Unknown server error";
  }
  simpleCallback(NO, errorMessage);
}

- (void)handleChannelStatus:(NSDictionary *)encoded original:(NSString *)original {
  id channelName = encoded[ZCCChannelNameKey];
  if (![channelName isKindOfClass:[NSString class]]) {
    [self reportInvalidStringMessage:original];
    return;
  }
  id status = encoded[ZCCChannelStatusStatusKey];
  if (![status isKindOfClass:[NSString class]]) {
    [self reportInvalidStringMessage:original];
    return;
  }
  id numUsers = encoded[ZCCChannelStatusNumberOfUsersKey];
  if (![numUsers isKindOfClass:[NSNumber class]]) {
    [self reportInvalidStringMessage:original];
    return;
  }

  id<ZCCSocketDelegate> delegate = self.delegate;
  if ([delegate respondsToSelector:@selector(socket:didReportStatus:forChannel:usersOnline:)]) {
    [self.delegateRunner runAsync:^{
      [delegate socket:self didReportStatus:status forChannel:channelName usersOnline:[numUsers integerValue]];
    }];
  }
}

- (void)handleStreamStart:(NSDictionary *)encoded original:(NSString *)original {
  id type = encoded[ZCCStreamTypeKey];
  if (![type isKindOfClass:[NSString class]]) {
    [self reportInvalidStringMessage:original];
    return;
  }
  id codec = encoded[ZCCStreamCodecKey];
  if (![codec isKindOfClass:[NSString class]]) {
    [self reportInvalidStringMessage:original];
    return;
  }
  id header = encoded[ZCCStreamCodecHeaderKey];
  if (![type isKindOfClass:[NSString class]]) {
    [self reportInvalidStringMessage:original];
    return;
  }
  NSData *headerData = [[NSData alloc] initWithBase64EncodedString:header options:0];
  if (!headerData) {
    [self reportInvalidStringMessage:original];
    return;
  }
  id packetDuration = encoded[ZCCStreamPacketDurationKey];
  if (![packetDuration isKindOfClass:[NSNumber class]]) {
    [self reportInvalidStringMessage:original];
    return;
  }
  long long packetDurationValue = [packetDuration longLongValue];
  if (packetDurationValue < 0) {
    [self reportInvalidStringMessage:original];
    return;
  }
  id streamId = encoded[ZCCStreamIDKey];
  if (![streamId isKindOfClass:[NSNumber class]]) {
    [self reportInvalidStringMessage:original];
    return;
  }
  long long streamIdValue = [streamId longLongValue];
  if (streamIdValue < 0 || streamIdValue > UINT32_MAX) {
    // Stream ID out of range
    [self reportInvalidStringMessage:original];
    return;
  }
  // Should we check that streamId fits into 16 bits?
  id channel = encoded[ZCCChannelNameKey];
  if (![channel isKindOfClass:[NSString class]]) {
    [self reportInvalidStringMessage:original];
    return;
  }
  id from = encoded[ZCCOnStreamStartSenderKey];
  if (![from isKindOfClass:[NSString class]]) {
    [self reportInvalidStringMessage:original];
    return;
  }

  ZCCStreamParams *params = [[ZCCStreamParams alloc] init];
  params.codecName = codec;
  params.type = type;
  params.codecHeader = headerData;
  params.packetDuration = (NSUInteger)packetDurationValue;
  id<ZCCSocketDelegate> delegate = self.delegate;
  if ([delegate respondsToSelector:@selector(socket:didStartStreamWithId:params:channel:sender:)]) {
    [self.delegateRunner runAsync:^{
      [delegate socket:self didStartStreamWithId:(NSUInteger)streamIdValue params:params channel:channel sender:from];
    }];
  }
}

- (void)handleStreamStop:(NSDictionary *)encoded original:(NSString *)original {
  id streamId = encoded[ZCCStreamIDKey];
  if (![streamId isKindOfClass:[NSNumber class]]) {
    [self reportInvalidStringMessage:original];
    return;
  }
  long long streamIdValue = [streamId longLongValue];
  if (streamIdValue < 0 || streamIdValue > UINT32_MAX) {
    // Stream ID out of range
    [self reportInvalidStringMessage:original];
    return;
  }

  id<ZCCSocketDelegate> delegate = self.delegate;
  if ([delegate respondsToSelector:@selector(socket:didStopStreamWithId:)]) {
    [self.delegateRunner runAsync:^{
      [delegate socket:self didStopStreamWithId:(NSUInteger)streamIdValue];
    }];
  }
}

- (void)handleError:(NSDictionary *)encoded original:(NSString *)original {
  id errorMessage = encoded[ZCCErrorKey];
  if (![errorMessage isKindOfClass:[NSString class]]) {
    [self reportInvalidStringMessage:original];
    return;
  }

  [self reportError:errorMessage];
}

- (void)handleTextMessage:(NSDictionary *)encoded original:(NSString *)original {
  id message = encoded[ZCCTextContentKey];
  if (![message isKindOfClass:[NSString class]]) {
    [self reportInvalidStringMessage:original];
    return;
  }
  id sender = encoded[ZCCFromUserKey];
  if (![sender isKindOfClass:[NSString class]]) {
    [self reportInvalidStringMessage:original];
    return;
  }

  id<ZCCSocketDelegate> delegate = self.delegate;
  [self.delegateRunner runAsync:^{
    [delegate socket:self didReceiveTextMessage:message sender:sender];
  }];
}

- (void)reportInvalidStringMessage:(NSString *)message {
  id<ZCCSocketDelegate> delegate = self.delegate;
  if ([delegate respondsToSelector:@selector(socket:didReceiveUnrecognizedMessage:)]) {
    [self.delegateRunner runAsync:^{
      [delegate socket:self didReceiveUnrecognizedMessage:message];
    }];
  }
}

- (void)webSocket:(ZCCSRWebSocket *)webSocket didReceiveMessageWithData:(NSData *)data {
  [self.workRunner runSync:^{
    NSUInteger minValidLength = sizeof(uint8_t) + sizeof(uint32_t) + sizeof(uint32_t);
    if (data.length < minValidLength) { // minimum audio data message is 5 bytes
      uint8_t type = 0;
      if (data.length >= 1) {
        [data getBytes:&type length:1];
      }
      [self reportUnrecognizedBinaryMessage:data type:type];
      return;
    }

    char type = 0x00;
    [data getBytes:&type length:sizeof(type)];
    if (type != 0x01) {
      [self reportUnrecognizedBinaryMessage:data type:type];
      return;
    }

    uint32_t streamId = 0;
    NSUInteger streamIdOffset = sizeof(type);
    [data getBytes:&streamId range:NSMakeRange(streamIdOffset, sizeof(streamId))];
    streamId = ntohl(streamId);
    uint32_t packetId = 0;
    NSUInteger packetIdOffset = streamIdOffset + sizeof(streamId);
    [data getBytes:&packetId range:NSMakeRange(packetIdOffset, sizeof(packetId))];
    packetId = ntohl(packetId);
    NSUInteger dataOffset = packetIdOffset + sizeof(packetId);
    NSData *audio = [data subdataWithRange:NSMakeRange(dataOffset, data.length - dataOffset)];
    id<ZCCSocketDelegate> delegate = self.delegate;
    if ([delegate respondsToSelector:@selector(socket:didReceiveAudioData:streamId:packetId:)]) {
      [self.delegateRunner runAsync:^{
        [delegate socket:self didReceiveAudioData:audio streamId:streamId packetId:packetId];
      }];
    }
  }];
}

- (void)reportUnrecognizedBinaryMessage:(NSData *)data type:(NSInteger)type {
  id<ZCCSocketDelegate> delegate = self.delegate;
  if ([delegate respondsToSelector:@selector(socket:didReceiveData:unrecognizedType:)]) {
    [self.delegateRunner runAsync:^{
      [delegate socket:self didReceiveData:data unrecognizedType:type];
    }];
  }
}

#pragma mark - Private

- (NSInteger)incrementedSequenceNumber {
    self.nextSequenceNumber += 1;
    return self.nextSequenceNumber;
}

- (void)reportError:(nonnull NSString *)errorMessage {
  id<ZCCSocketDelegate> delegate = self.delegate;
  if ([delegate respondsToSelector:@selector(socket:didReportError:)]) {
    [self.delegateRunner runAsync:^{
      [delegate socket:self didReportError:errorMessage];
    }];
  }
}

@end
