//
//  ZCCIncomingVoiceStream.m
//  sdk
//
//  Created by Alexey Gavrilov on 12/7/17.
//  Copyright © 2018 Zello. All rights reserved.
//

#import "ZCCIncomingVoiceStream+Internal.h"
#import "ZCCCodecFactory.h"
#import "ZCCDecoder.h"
#import "ZCCErrors.h"
#import "ZCCIncomingVoiceConfiguration.h"
#import "ZCCPlayer.h"
#import "ZCCVoiceStream+Internal.h"

// TODO: Replace this with proper jitter buffer
static const NSUInteger prebufferPackets = 3;

@interface ZCCIncomingVoiceStream () <ZCCDecoderDelegate>

@property (nonatomic, readonly) ZCCDecoder *decoder;
@property (nonatomic, readonly) NSMutableArray *audioData;
// long long because it needs to handle range from 1..UINT32_MAX but also uses -1 as a signal value
@property (nonatomic) long long firstPacketId;
@property (nonatomic) NSUInteger playbackPosition;
@property (nonatomic) BOOL decoderReady;
@property (nonatomic) BOOL decoderStarted;

@property (nonatomic) BOOL finished;

@end

@implementation ZCCIncomingVoiceStream {
  BOOL _autoStart;
}

- (instancetype)initWith:(NSUInteger)streamId
                  header:(NSData *)header
          packetDuration:(NSUInteger)duration
                channnel:(NSString *)channel
                    from:(NSString *)user
   receiverConfiguration:(ZCCIncomingVoiceConfiguration *)configuration {
  self = [super initWithStreamId:streamId channel:channel isIncoming:YES];
  if (self) {
    _sender = user;
    _audioData = [@[] mutableCopy];
    _decoder = [[ZCCCodecFactory instance] createDecoderWithConfiguration:configuration stream:self];
    _firstPacketId = -1;
    _decoderReady = NO;
    _decoder.delegate = self;
    [_decoder setPacketDuration:duration];
    [_decoder prepareAsync:header withPlaybackAmplifierGain:0];
  }
  return self;
}

#pragma mark - Properties

- (BOOL)autoStart {
  return _autoStart;
}

- (void)setAutoStart:(BOOL)autoStart {
  _autoStart = autoStart;
}

#pragma mark - Internal methods

- (void)start {
  [super start];
  self.state = ZCCStreamStateStarting;
  [self startIfReady];
}

- (void)stop {
  [super stop];
  [self.decoder stop];
  self.state = ZCCStreamStateStopped;
}

- (void)onData:(NSData *)data packetId:(NSUInteger)packetId {
  if (self.firstPacketId == -1) {
    self.firstPacketId = (long long)packetId;
  }
  NSUInteger first = (NSUInteger)self.firstPacketId;
  // if (index < 0) return
  if (first > packetId) {
    return;
  }
  NSUInteger index = packetId - first;
  // Fill gaps with NSNull
  while (index > self.audioData.count) {
    [self.audioData addObject:[NSNull null]];
  }
  if (index == self.audioData.count) {
    [self.audioData addObject:data];
  } else if (index < self.audioData.count) {
    self.audioData[index] = data;
  }
  [self touch];
  [self startIfReady];
}

- (void)onStreamStop {
  self.finished = YES;
  self.state = ZCCStreamStateStopped;
  [self startIfReady];
}

- (void)startIfReady {
  if (!self.decoderStarted && self.decoderReady && (self.audioData.count > prebufferPackets) &&
      (self.autoStart || self.finished)) {
    [self.decoder start];
    self.decoderStarted = YES;
  }
}

- (NSData *)dataForDecoder:(ZCCDecoder *)decoder {
  if (self.playbackPosition >= self.audioData.count) {
    if (self.finished) {
      return ZCCPlayer.stopCookie;
    }
    return nil;
  }
  NSData *packet = self.audioData[self.playbackPosition];
  ++self.playbackPosition;
  if (!packet || (NSNull *)packet == [NSNull null]) {
    packet = [self.decoder getMissingPacket];
  }

  [self.delegate voiceStream:self didUpdatePosition:decoder.position];

  return packet;
}

- (void)decoder:(ZCCDecoder *)decoder didEncounterError:(NSError *)error {
  self.decoderStarted = NO;
  self.state = ZCCStreamStateError;
  [self.delegate voiceStream:self didStopWithError:error];
}

- (void)decoderDidBecomeReady:(ZCCDecoder *)decoder {
  self.decoderReady = YES;
  [self startIfReady];
}

- (void)decoderDidStart:(ZCCDecoder *)decoder {
  self.state = ZCCStreamStateActive;
  [self.delegate voiceStreamDidStart:self];
}

- (void)decoderDidStop:(ZCCDecoder *)decoder {
  self.decoderStarted = NO;
  self.state = ZCCStreamStateStopped;
  [self.delegate voiceStreamDidStop:self];
}

@end
