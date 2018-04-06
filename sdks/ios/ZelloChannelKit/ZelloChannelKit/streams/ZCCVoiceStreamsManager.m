//
//  ZCCVoiceStreamsManager.m
//  sdk
//
//  Created by Alexey Gavrilov on 12/7/17.
//  Copyright © 2018 Zello. All rights reserved.
//

#import "ZCCVoiceStreamsManager.h"
#import "ZCCErrors.h"
#import "ZCCIncomingVoiceConfiguration.h"
#import "ZCCIncomingVoiceStream+Internal.h"
#import "ZCCOutgoingVoiceStream+Internal.h"
#import "ZCCSocket.h"
#import "ZCCVoiceStream+Internal.h"
#import "ZCCWeakTimer.h"

static const NSTimeInterval streamsCheckIntervalSec = 1.0;

@interface ZCCVoiceStreamsManager ()
@property (nonatomic, strong, readonly) NSMutableArray<ZCCVoiceStream *> *streams;
@property (nonatomic, strong) ZCCWeakTimer *timer;
@end


@implementation ZCCVoiceStreamsManager

- (instancetype)init {
  if (self = [super init]) {
    _streams = [@[] mutableCopy];
  }
  return self;
}

- (ZCCOutgoingVoiceStream *)startStream:(NSString *)channel socket:(ZCCSocket *)socket voiceConfiguration:(ZCCOutgoingVoiceConfiguration *)configuration {
  [self stopStream];

  ZCCOutgoingVoiceStream *stream = [[ZCCOutgoingVoiceStream alloc] initWithChannel:channel socket:socket configuration:configuration];
  stream.delegate = self;

  [self runAsync:^{
    [self addStream:stream];
    [stream startWithTimeout:self.requestTimeout];
  }];

  return stream;
}

- (void)stopStream {
  [self runAsync:^{
    for (ZCCVoiceStream *stream in self.streams) {
      if (!stream.incoming) {
        [stream stop];
      }
    }
  }];
}

- (void)onIncomingData:(NSData *)data streamId:(NSUInteger)streamId packetId:(NSUInteger)packetId {
  [self runAsync:^{
    ZCCVoiceStream *stream = [self streamById:streamId];
    if (stream.incoming) {
      [((ZCCIncomingVoiceStream *)stream) onData:data packetId:packetId];
    }
  }];
}

- (void)onIncomingStreamStart:(NSUInteger)streamId
                       header:(NSData *)header
               packetDuration:(NSUInteger)duration
                      channel:(NSString *)channel
                         from:(NSString *)user
        receiverConfiguration:(ZCCIncomingVoiceConfiguration *)configuration {
  [self runAsync:^{
    ZCCVoiceStream *stream = [self streamById:streamId];
    if (stream && stream.incoming) {
      // TODO: Pass meaningful error to user
      NSLog(@"[ZCC-VSM] Error: Stream ID conflict");
      return;
    }
    ZCCIncomingVoiceStream *streamIn = [[ZCCIncomingVoiceStream alloc] initWith:streamId
                                                                         header:header
                                                                 packetDuration:duration
                                                                       channnel:channel
                                                                           from:user
                                                          receiverConfiguration:configuration];
    streamIn.delegate = self;
    streamIn.autoStart = YES;
    [self addStream:streamIn];
  }];
}

- (void)onIncomingStreamStop:(NSUInteger)streamId {
  [self runAsync:^{
    ZCCIncomingVoiceStream *stream = (ZCCIncomingVoiceStream *)[self streamById:streamId];
    if (!stream.incoming) {
      NSLog(@"[ZCC-VSM] Incoming stream not found, ignoring end");
      return;
    }
    [stream onStreamStop];
  }];
}

- (NSArray<ZCCVoiceStream *> *)activeStreams {
  __block NSArray<ZCCVoiceStream *> *result = nil;
  [self runSync:^{
    result = [NSArray arrayWithArray:self.streams];
  }];
  return result;
}

#pragma mark - Internal methods for use from runner queue only

- (ZCCVoiceStream *)streamById:(NSUInteger)streamId {
  for (ZCCVoiceStream *stream in self.streams) {
    if (stream.streamId == streamId) {
      return stream;
    }
  }
  return nil;
}

- (void)addStream:(ZCCVoiceStream *)stream {
  [self.streams addObject:stream];
  [self checkStreams];
}

- (void)removeStream:(ZCCVoiceStream *)stream {
  if (![self.streams containsObject:stream]) {
    return;
  }
  [self.streams removeObject:stream];
  [self checkStreams];
}

- (void)checkStreams {
  // Stop any timed out streams
  NSMutableArray<ZCCVoiceStream *> *timedOutStreams = [@[] mutableCopy];
  for (ZCCVoiceStream *stream in self.streams) {
    if (stream.timedOut) {
      [stream stop];
      [timedOutStreams addObject:stream];
    }
  }
  if (timedOutStreams.count > 0) {
    [self.streams removeObjectsInArray:timedOutStreams];
  }
  // If we have any streams, keep checking them by timer
  if (self.streams.count > 0) {
    if (!self.timer) {
      self.timer = [ZCCWeakTimer scheduledTimerWithTimeInterval:streamsCheckIntervalSec
                                                         target:self
                                                       selector:@selector(checkStreams)
                                                       userInfo:nil
                                                        repeats:YES
                                                  dispatchQueue:self.queue];
    }
  } else {
    [self.timer invalidate];
    self.timer = nil;
  }
}

#pragma mark - ZCCAudioStreamDelegate

- (void)voiceStreamDidStart:(ZCCVoiceStream *)stream {
  [self runAsync:^{
    [self.delegate voiceStreamsManager:self streamDidStart:stream];
  }];
}

- (void)voiceStreamDidStop:(ZCCVoiceStream *)stream {
  [self runAsync:^{
    [self removeStream:stream];
    [self.delegate voiceStreamsManager:self streamDidStop:stream];
  }];
}

- (void)voiceStream:(ZCCVoiceStream *)stream didStopWithError:(NSError *)error {
  [self runAsync:^{
    [self removeStream:stream];
    [self.delegate voiceStreamsManager:self stream:stream didEncounterError:error];
  }];
}

- (void)voiceStream:(ZCCVoiceStream *)stream didChangeStateFrom:(ZCCStreamState)oldState to:(ZCCStreamState)newState {
  [self runAsync:^{
    [self.delegate voiceStreamsManager:self streamDidChangeState:stream];
  }];
}

- (void)voiceStream:(ZCCVoiceStream *)stream didUpdatePosition:(NSTimeInterval)position {
  [self runAsync:^{
    [self.delegate voiceStreamsManager:self stream:stream didUpdatePosition:position];
  }];
}

@end
