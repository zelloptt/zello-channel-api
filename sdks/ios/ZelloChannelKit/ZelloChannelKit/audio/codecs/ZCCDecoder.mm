//
//  ZCCDecoder.m
//  LoudtalksLite
//
//  Created by JAMES PICKERING on 12/1/11.
//  Copyright © 2018 Zello. All rights reserved.
//

#import "ZCCDecoder.h"
#import "ZCCErrors.h"
#import "ZCCIncomingVoiceConfiguration.h"

static NSData *missingPacket = [NSData dataWithBytesNoCopy:(unsigned char[]){0} length:1];

@implementation ZCCDecoder

@synthesize position = _position;
@synthesize overloaded = _overloaded;

- (instancetype)initWithPlayer:(id<ZCCAudioReceiver>)player {
  self = [super init];
  if (self) {
    _player = player;
    _player.delegate = self;
    _started = NO;
  }
  return self;
}

- (void)setPacketDuration:(NSUInteger)count {
}

- (NSData *)getMissingPacket {
  return missingPacket;
}

- (void)prepareAsync:(NSData *)header withPlaybackAmplifierGain:(NSInteger)gain {
  [self doesNotRecognizeSelector:_cmd];
}

- (void)start {
  [self.player play];
}

- (void)stop {
  self.started = NO;
  [self.player stop];
}

- (void)pause {
  [self.player pause];
}

- (void)resume {
  [self.player resume];
}

- (void)setVolume:(NSInteger)volume {
  self.player.volume = volume;
}

- (NSInteger)volume {
  return self.player.volume;
}

- (NSTimeInterval)position {
  return self.player.currentTime;
}

- (BOOL)overloaded {
  return self.player.overloaded;
}

- (float)getLevel {
  return self.player.level;
}

- (void)setGain:(NSInteger)gain {
  [self doesNotRecognizeSelector:_cmd];
}

#pragma mark - ZCCAudioReceiverDelegate

- (NSData *)dataForReceiver:(id<ZCCAudioReceiver>)player {
  return nil;
}

- (NSData *)PLCDataForReceiver:(id<ZCCAudioReceiver>)player {
  return nil;
}

- (void)receiverDidBecomeReady:(id<ZCCAudioReceiver>)player {
  [self.delegate decoderDidBecomeReady:self];
}

- (void)receiverDidStartPlayback:(id<ZCCAudioReceiver>)player {
  [self.delegate decoderDidStart:self];
}

- (void)receiverDidEndPlayback:(id<ZCCAudioReceiver>)player {
  [self.delegate decoderDidStop:self];
}

- (void)receiver:(id<ZCCAudioReceiver>)receiver didEncounterError:(NSError *)error {
  [self.delegate decoder:self didEncounterError:error];
}

@end
