//
//  ZCCVoiceStream.m
//  sdk
//
//  Created by Alexey Gavrilov on 12/7/17.
//  Copyright © 2018 Zello. All rights reserved.
//

#import "ZCCVoiceStream+Internal.h"

static const NSTimeInterval audioStreamTimeout = 10.0;

@interface ZCCVoiceStream ()
@property (nonatomic) NSTimeInterval lastActive;
@end

@implementation ZCCVoiceStream {
  __weak id<ZCCVoiceStreamDelegate> _delegate;
  BOOL _incoming;
  ZCCStreamState _state;
  NSUInteger _streamId;
}

- (instancetype)initWithStreamId:(NSUInteger)streamId channel:(NSString *)channel isIncoming:(BOOL)isIncoming {
  self = [super init];
  if (self) {
    _state = ZCCStreamStateStopped;
    _lastActive = [NSDate timeIntervalSinceReferenceDate];
    _streamId = streamId;
    _channel = channel;
    _incoming = isIncoming;
  }
  return self;
}

#pragma mark - Properties

- (id<ZCCVoiceStreamDelegate>)delegate {
  return _delegate;
}

- (void)setDelegate:(id<ZCCVoiceStreamDelegate>)delegate {
  _delegate = delegate;
}

- (BOOL)isIncoming {
  return _incoming;
}

- (void)setIncoming:(BOOL)incoming {
  _incoming = incoming;
}

- (ZCCStreamState)state {
  return _state;
}

- (void)setState:(ZCCStreamState)state {
  if (state != _state) {
    ZCCStreamState oldState = _state;
    _state = state;
    [self.delegate voiceStream:self didChangeStateFrom:oldState to:state];
  }
}

- (NSUInteger)streamId {
  return _streamId;
}

- (void)setStreamId:(NSUInteger)streamId {
  _streamId = streamId;
}

- (BOOL)timedOut {
  return [NSDate timeIntervalSinceReferenceDate] - self.lastActive > audioStreamTimeout;
}

#pragma mark - Public Methods

- (void)start {
  [self touch];
}

- (void)stop {
  [self touch];
}

- (void)touch {
  self.lastActive = [NSDate timeIntervalSinceReferenceDate];
}

- (NSString *)description {
  return [NSString stringWithFormat:@"%@ %@ %@ [%zd] - %@",
          [self class], self.incoming ? @"from" : @"to", self.channel,
          self.streamId, [ZCCVoiceStream describeState:self.state]];
}

+ (NSString *)describeState:(ZCCStreamState)state {
  switch (state) {
    case ZCCStreamStateStarting:
      return @"starting";

    case ZCCStreamStateActive:
      return @"active";

    case ZCCStreamStateStopping:
      return @"stopping";

    case ZCCStreamStateStopped:
      return @"stopped";

    case ZCCStreamStateError:
      return @"error";
  }
}

@end
