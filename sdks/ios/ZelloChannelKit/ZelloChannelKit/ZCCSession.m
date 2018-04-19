//
//  ZCCSession.m
//  sdk
//
//  Created by Jim Pickering on 12/4/17.
//  Copyright © 2018 Zello. All rights reserved.
//

@import AVFoundation;
@import Foundation;

#import "ZCCSession.h"
#import "ZCCErrors.h"
#import "ZCCIncomingVoiceConfiguration.h"
#import "ZCCIncomingVoiceStreamInfo+Internal.h"
#import "ZCCPermissionsManager.h"
#import "ZCCProtocol.h"
#import "ZCCSocket.h"
#import "ZCCSocketFactory.h"
#import "ZCCStreamParams.h"
#import "ZCCVoiceStreamsManager.h"

static void LogWarningForDevelopmentToken(NSString *token) {
  NSArray *parts = [token componentsSeparatedByString:@"."];
  if (parts.count < 3) {
    NSLog(@"[ZCC] Auth token not in valid JWT format");
    return;
  }
  NSData *claimsData = [[NSData alloc] initWithBase64EncodedString:parts[1] options:0];
  NSError *error = nil;
  NSDictionary *claims = [NSJSONSerialization JSONObjectWithData:claimsData options:0 error:&error];
  if (!claims) {
    NSLog(@"[ZCC] Auth token not in valid JWT format: %@", error);
    return;
  }

  NSString *azp = claims[@"azp"];
  if ([azp isKindOfClass:[NSString class]]) {
    if ([azp caseInsensitiveCompare:@"dev"] == NSOrderedSame) {
      NSNumber *exp = claims[@"exp"];
      NSString *expiration = @"...";
      if ([exp isKindOfClass:[NSNumber class]]) {
        NSDateFormatter *formatter = [[NSDateFormatter alloc] init];
        formatter.locale = [NSLocale localeWithLocaleIdentifier:@"en_US_POSIX"];
        formatter.timeZone = [NSTimeZone timeZoneForSecondsFromGMT:0];
        formatter.dateFormat = @"yyyy-MM-dd'T'HH:mm:ssZZZZZ";
        expiration = [formatter stringFromDate:[NSDate dateWithTimeIntervalSince1970:exp.doubleValue]];
      }
      NSLog(@"[ZCC] Development token warning:\n\n\n\
            ======================================================================================================\n\
            WARNING:\tDevelopment token expires %@\n\
            WARNING:\tAuth token is valid for development only. You must use a production token in production builds.\n\
            DETAILS:\thttps://github.com/zelloptt/zello-channel-api/blob/master/AUTH.md\n\
            ======================================================================================================\n\n\n.",
            expiration);
      return;
    }
  }
  return;
}

@interface ZCCSession () <ZCCSocketDelegate, ZCCVoiceStreamsManagerDelegate>

@property (nonatomic, strong, nonnull) ZCCPermissionsManager *permissionsManager;
@property (nonatomic, strong, nonnull) ZCCSocketFactory *socketFactory;

@property (atomic) ZCCSessionState state;

@property (nonatomic, strong, nonnull) ZCCVoiceStreamsManager *streamsManager;

@property (nonatomic, strong) ZCCSocket *webSocket;

@property (nonatomic, strong, nonnull, readonly) dispatch_queue_t delegateCallbackQueue;

@property (nonatomic, strong, readonly, nonnull) ZCCQueueRunner *runner;

@property (nonatomic, copy, readonly) NSString *authToken;
@property (nonatomic, copy, nullable) NSString *refreshToken;
@property (nonatomic) NSTimeInterval nextReconnectDelay;

@end

@implementation ZCCSession {
  NSTimeInterval _requestTimeout;
}

- (instancetype)initWithURL:(NSURL *)url authToken:(NSString *)token username:(NSString *)username password:(NSString *)password channel:(NSString *)channel callbackQueue:(dispatch_queue_t)queue {
  self = [super init];
  if (self) {
    _permissionsManager = [[ZCCPermissionsManager alloc] init];
    _socketFactory = [[ZCCSocketFactory alloc] init];
    _authToken = token;
    _username = username ?: @"";
    _password = password ?: @"";
    _address = url;
    _channel = channel;
    if (queue) {
      _delegateCallbackQueue = queue;
    } else {
      _delegateCallbackQueue = dispatch_get_main_queue();
    }
    _requestTimeout = 30.0;
    _streamsManager = [[ZCCVoiceStreamsManager alloc] init];
    _streamsManager.delegate = self;
    _streamsManager.requestTimeout = _requestTimeout;
    _state = ZCCSessionStateDisconnected;
    _runner = [[ZCCQueueRunner alloc] initWithName:@"ZCCSession"];
  }
  return self;
}

- (instancetype)initWithURL:(NSURL *)url authToken:(NSString *)token channel:(NSString *)channel callbackQueue:(dispatch_queue_t)queue {
  return [self initWithURL:url authToken:token username:nil password:nil channel:channel callbackQueue:queue];
}

- (void)dealloc {
  if (_webSocket) {
    NSLog(@"[ZCC] Warning: Call -[ZCCSession disconnect] before releasing ZCCSession");
  }
  _webSocket.delegate = nil;
  [_webSocket close];
}

#pragma mark - Properties

- (NSArray *)activeStreams {
  return self.streamsManager.activeStreams;
}

- (NSTimeInterval)requestTimeout {
  __block NSTimeInterval timeout;
  [self.runner runSync:^{
    timeout = _requestTimeout;
  }];
  return timeout;
}

- (void)setRequestTimeout:(NSTimeInterval)timeout {
  [self.runner runSync:^{
    _requestTimeout = timeout;
    self.streamsManager.requestTimeout = timeout;
  }];
}

#pragma mark - Public Methods

- (void)disconnect {
  [self.runner runAsync:^{
    self.refreshToken = nil;
    if (self.webSocket) {
      [self performDisconnect];

      // Call sessionDidDisconnect: immediately. Socket closed callback won't do it because our state
      // is already disconnected.
      id<ZCCSessionDelegate> delegate = self.delegate;
      if ([delegate respondsToSelector:@selector(sessionDidDisconnect:)]) {
        dispatch_async(self.delegateCallbackQueue, ^{
          [delegate sessionDidDisconnect:self];
        });
      }
    }
  }];
}

- (void)connect {
  // Our API on Android returns a boolean because it can fail synchronously while setting up the
  // web socket or something. Our API can only fail asynchronously, so we just don't return anything.
  [self.runner runAsync:^{
    id<ZCCSessionDelegate> delegate = self.delegate;
    LogWarningForDevelopmentToken(self.authToken);

    // Not sure how useful this callback is, but it matches the semantics of the Android API
    if ([delegate respondsToSelector:@selector(sessionDidStartConnecting:)]) {
      dispatch_async(self.delegateCallbackQueue, ^{
        [delegate sessionDidStartConnecting:self];
      });
    }

    if (self.state != ZCCSessionStateConnected) {
      self.state = ZCCSessionStateConnecting;
      if (!self.webSocket) {
        [self setup];
      }
      // Can't login until socket is up
      // we will do this on the socket connected handler
      return;
    }

    [self connectToChannel];
  }];
}

- (ZCCOutgoingVoiceStream *)startVoiceMessage {
  if (self.state != ZCCSessionStateConnected) {
    return nil;
  }
  if ([self.permissionsManager recordPermission] != AVAudioSessionRecordPermissionGranted) {
    return nil;
  }

  return [self startStreamWithConfiguration:nil];
}

- (ZCCOutgoingVoiceStream *)startVoiceMessageWithSource:(ZCCOutgoingVoiceConfiguration *)sourceConfiguration {
  // Validate configuration
  if (![ZCCOutgoingVoiceConfiguration.supportedSampleRates containsObject:@(sourceConfiguration.sampleRate)]) {
    NSException *parameterException = [NSException exceptionWithName:NSInvalidArgumentException reason:@"Unsupported sampleRate. Check ZCCOutgoingVoiceConfiguration.supportedSampleRates." userInfo:nil];
    @throw parameterException;
  }

  return [self startStreamWithConfiguration:sourceConfiguration];
}

#pragma mark - ZCCVoiceStreamsManagerDelegate

- (void)voiceStreamsManager:(ZCCVoiceStreamsManager *)manager streamDidStart:(ZCCVoiceStream *)stream {
  [self.runner runSync:^{
    if (stream.incoming) {
      ZCCIncomingVoiceStream *incoming = (ZCCIncomingVoiceStream *)stream;
      id<ZCCSessionDelegate> delegate = self.delegate;
      if ([delegate respondsToSelector:@selector(session:incomingVoiceDidStart:)]) {
        dispatch_async(self.delegateCallbackQueue, ^{
          [delegate session:self incomingVoiceDidStart:incoming];
        });
      }
    }
  }];
}

- (void)voiceStreamsManager:(ZCCVoiceStreamsManager *)manager streamDidStop:(ZCCVoiceStream *)stream {
  [self.runner runSync:^{
    if (stream.incoming) {
      id<ZCCSessionDelegate> delegate = self.delegate;
      if ([delegate respondsToSelector:@selector(session:incomingVoiceDidStop:)]) {
        dispatch_async(self.delegateCallbackQueue, ^{
          [delegate session:self incomingVoiceDidStop:(id)stream];
        });
      }
    }
  }];
}

- (void)voiceStreamsManager:(ZCCVoiceStreamsManager *)manager streamDidChangeState:(ZCCVoiceStream *)stream {
  [self.runner runSync:^{
    if (!stream.incoming) {
      id<ZCCSessionDelegate> delegate = self.delegate;
      if ([delegate respondsToSelector:@selector(session:outgoingVoiceDidChangeState:)]) {
        dispatch_async(self.delegateCallbackQueue, ^{
          [self.delegate session:self outgoingVoiceDidChangeState:(id)stream];
        });
      }
    }
  }];
}

- (void)voiceStreamsManager:(ZCCVoiceStreamsManager *)manager stream:(ZCCVoiceStream *)stream didEncounterError:(NSError *)error {
  [self.runner runSync:^{
    id<ZCCSessionDelegate> delegate = self.delegate;

    if (stream.incoming) {
      if ([delegate respondsToSelector:@selector(session:incomingVoiceDidStop:)]) {
        dispatch_async(self.delegateCallbackQueue, ^{
          [delegate session:self incomingVoiceDidStop:(ZCCIncomingVoiceStream *)stream];
        });
      }
    } else {
      if ([delegate respondsToSelector:@selector(session:outgoingVoice:didEncounterError:)]) {
        dispatch_async(self.delegateCallbackQueue, ^{
          [delegate session:self outgoingVoice:(ZCCOutgoingVoiceStream *)stream didEncounterError:error];
        });
      }
    }
  }];
}

- (void)voiceStreamsManager:(ZCCVoiceStreamsManager *)manager stream:(ZCCVoiceStream *)stream didUpdatePosition:(NSTimeInterval)position {
  [self.runner runSync:^{
    id<ZCCSessionDelegate> delegate = self.delegate;
    if (stream.incoming) {
      if ([delegate respondsToSelector:@selector(session:incomingVoice:didUpdateProgress:)]) {
        dispatch_async(self.delegateCallbackQueue, ^{
          [delegate session:self incomingVoice:(id)stream didUpdateProgress:position];
        });
      }
    } else {
      if ([delegate respondsToSelector:@selector(session:outgoingVoice:didUpdateProgress:)]) {
        dispatch_async(self.delegateCallbackQueue, ^{
          [delegate session:self outgoingVoice:(id)stream didUpdateProgress:position];
        });
      }
    }
  }];
}

#pragma mark - ZCCSocketDelegate
// Socket callbacks are already running on delegateCallbackQueue, so we don't need to dispatch from
// them before calling our delegate

- (void)socketDidOpen:(ZCCSocket *)socket {
  NSLog(@"[ZCC] ZCCSocket did open");
  [self.runner runSync:^{
    self.nextReconnectDelay = 1.0;

    if (self.channel) {
      [self connectToChannel];
    }
  }];
}

- (void)socketDidClose:(ZCCSocket *)socket withError:(nullable NSError *)socketError {
  NSLog(@"[ZCC] socket closed with error %@", socketError);

  id<ZCCSessionDelegate> delegate = self.delegate;
  __block ZCCSessionState oldState;
  __block BOOL haveRefreshToken = NO;
  [self.runner runSync:^{
    oldState = self.state;
    self.state = ZCCSessionStateError;
    haveRefreshToken = self.refreshToken != nil;
  }];
  BOOL shouldReconnect = haveRefreshToken;
  if (haveRefreshToken) {
    if ([delegate respondsToSelector:@selector(session:willReconnectForReason:)]) {
      shouldReconnect = [delegate session:self willReconnectForReason:ZCCReconnectReasonUnknown];
    }
  }

  [self.runner runSync:^{
    self.webSocket = nil;

    BOOL wasReconnecting = self.refreshToken != nil;
    if (self.refreshToken) {
      if (shouldReconnect) {
        NSLog(@"[ZCC] Have reconnect token; assuming unintentional disconnect and reconnecting");
        [self connectAfterDelay];
        return;
      }
      self.refreshToken = nil; // Not reconnecting, so clear the refresh token
    }

    self.state = ZCCSessionStateDisconnected;

    if (oldState == ZCCSessionStateConnecting && !wasReconnecting) {
      NSError *error = socketError;
      if (!error) {
        error = [NSError errorWithDomain:ZCCErrorDomain code:ZCCErrorCodeUnknown userInfo:nil];
      }
      if ([delegate respondsToSelector:@selector(session:didFailToConnectWithError:)]) {
        dispatch_async(self.delegateCallbackQueue, ^{
          [delegate session:self didFailToConnectWithError:error];
        });
      }
      return;
    }

    if (oldState == ZCCSessionStateConnected || oldState == ZCCSessionStateConnecting) {
      if ([delegate respondsToSelector:@selector(sessionDidDisconnect:)]) {
        dispatch_async(self.delegateCallbackQueue, ^{
          [delegate sessionDidDisconnect:self];
        });
      }
    }
  }];
}

- (void)socket:(ZCCSocket *)socket didReportStatus:(NSString *)status forChannel:(NSString *)channel usersOnline:(NSInteger)users {
  NSLog(@"[ZCC] statusChange %@", status ?: @"?");
}

- (void)socket:(ZCCSocket *)socket didStartStreamWithId:(NSUInteger)streamId params:(ZCCStreamParams *)params channel:(NSString *)channel sender:(NSString *)senderName {
  NSLog(@"[ZCC] Incoming stream started");
  id<ZCCSessionDelegate> delegate = self.delegate;
  ZCCIncomingVoiceConfiguration *configuration = nil;
  if ([delegate respondsToSelector:@selector(session:incomingVoiceWillStart:)]) {
    configuration = [delegate session:self incomingVoiceWillStart:[[ZCCIncomingVoiceStreamInfo alloc] initWithChannel:channel sender:senderName]];
  }
  configuration = [configuration copy]; // Defensive copy
  [self.streamsManager onIncomingStreamStart:streamId header:params.codecHeader packetDuration:params.packetDuration channel:channel from:senderName receiverConfiguration:configuration];
}

- (void)socket:(ZCCSocket *)socket didStopStreamWithId:(NSUInteger)streamId {
  NSLog(@"[ZCC] Incoming stream stopped");
  [self.streamsManager onIncomingStreamStop:streamId];
}

- (void)socket:(ZCCSocket *)socket didReceiveAudioData:(NSData *)data streamId:(NSUInteger)streamId packetId:(NSUInteger)packetId {
  NSLog(@"[ZCC] Incoming data for stream %ld (packet %ld)", (long)streamId, (long)packetId);
  [self.streamsManager onIncomingData:data streamId:streamId packetId:packetId];
}

- (void)socket:(nonnull ZCCSocket *)socket didReportError:(nonnull NSString *)errorMessage {
  NSLog(@"[ZCC] Error from websocket: %@", errorMessage);
  if ([errorMessage caseInsensitiveCompare:ZCCServerErrorMessageServerClosedConnection] == NSOrderedSame) {
    [self.runner runSync:^{
      self.refreshToken = nil;
    }];
  }
}

#pragma mark - Private

/**
 * Initializes our WebSocket and connects to the server
 *
 * @warning This method should only be called from the ZCCQueueRunner
 */
- (void)setup {
  self.webSocket = [self.socketFactory socketWithURL:self.address];
  self.webSocket.delegate = self;
  self.webSocket.delegateQueue = self.delegateCallbackQueue;
  [self.webSocket open];
}

/// @warning Only call from runner
- (void)connectAfterDelay {
  // adjustment in [0.5, 1.5] gives us a random value around the delay increment
  float adjustment = ((float)arc4random() / UINT32_MAX) + 0.5f;
  NSTimeInterval delay = self.nextReconnectDelay * adjustment;
  // Exponential backoff, capped at one minute
  self.nextReconnectDelay = MIN(self.nextReconnectDelay * 2.0, 60.0);
  [self.runner run:^{
    [self connect];
  } after:delay];
}

/**
 * @warning This method should only be called from the ZCCQueueRunner
 */
- (void)connectToChannel {
  // Weak self dance to break retain cycle self -> webSocket -> callback -> self
  __weak typeof(self) weakSelf = self;
  ZCCLogonCallback callback = ^(BOOL succeeded, NSString *refreshToken, NSString *errorMessage) {
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wshadow"
    typeof(self) self = weakSelf;
#pragma clang diagnostic pop
    if (!self) {
      return;
    }

    id<ZCCSessionDelegate> delegate = self.delegate;
    if (succeeded) {
      self.refreshToken = refreshToken;
      if ([delegate respondsToSelector:@selector(sessionDidConnect:)]) {
        dispatch_async(self.delegateCallbackQueue, ^{
          [delegate sessionDidConnect:self];
        });
      }
      self.state = ZCCSessionStateConnected;
      return;
    }

    self.state = ZCCSessionStateError;
    [self disconnect];

    NSLog(@"[ZCC] Logon error: %@", errorMessage ?: @"unknown");
    if (![delegate respondsToSelector:@selector(session:didFailToConnectWithError:)]) {
      return;
    }
    NSDictionary *errorInfo = nil;
    if (errorMessage) {
      errorInfo = @{ZCCServerErrorMessageKey: errorMessage};
    }
    NSError *error = [NSError errorWithDomain:ZCCErrorDomain code:ZCCErrorCodeConnectFailed userInfo:errorInfo];
    dispatch_async(self.delegateCallbackQueue, ^{
      [delegate session:self didFailToConnectWithError:error];
    });
  };

  [self.webSocket sendLogonWithAuthToken:self.authToken refreshToken:self.refreshToken channel:self.channel username:self.username password:self.password callback:callback timeoutAfter:self.requestTimeout];
}

/// @warning this method should only be called from the ZCCQueueRunner
- (void)performDisconnect {
    self.state = ZCCSessionStateDisconnected;
    self.webSocket.delegate = nil;
    [self.webSocket close];
    self.webSocket = nil;
}

- (ZCCOutgoingVoiceStream *)startStreamWithConfiguration:(ZCCOutgoingVoiceConfiguration *)configuration {
  __block ZCCOutgoingVoiceStream *stream;
  [self.runner runSync:^{
    stream = [self.streamsManager startStream:self.channel socket:self.webSocket voiceConfiguration:configuration];
  }];
  return stream;
}

@end
