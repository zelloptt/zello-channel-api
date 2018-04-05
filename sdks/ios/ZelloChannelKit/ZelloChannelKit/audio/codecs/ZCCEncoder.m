//
//  ZCCEncoder.m
//  LoudtalksLite
//
//  Created by JAMES PICKERING on 11/28/11.
//  Copyright © 2018 Zello. All rights reserved.
//

#import "ZCCEncoder.h"
#import "ZCCAudioSource.h"

@implementation ZCCEncoder

- (instancetype)init {
  self = [super init];
  return self;
}

- (ZCCCodecType)getId {
  return -1;
}

- (NSString *)getName {
  return nil;
}

- (NSString *)name {
  return [self getName];
}

- (NSData *)getHeader {
  return nil;
}

- (NSData *)header {
  return [self getHeader];
}

- (NSUInteger)getPacketDuration {
  return [self getFrameDuration] * self.framesPerPacket;
}

- (NSUInteger)packetDuration {
  return [self getPacketDuration];
}

- (NSUInteger)getFrameDuration {
  return 20;
}

- (NSUInteger)getBufferSampleCount {
  return self.sampleRate / 50 * self.framesPerPacket;
}

- (void)prepareAsync:(NSInteger)ampGain {
  [self doesNotRecognizeSelector:_cmd];
}

- (void)start {
}

- (void)stop {
}

- (void)setGain:(NSInteger)gain {
  [self doesNotRecognizeSelector:_cmd];
}

#pragma mark - ZCCRecorderDelegate

- (void)audioSource:(id<ZCCAudioSource>)source didProduceData:(NSData *)data {
}

- (void)audioSourceDidBecomeReady:(id<ZCCAudioSource>)source {
  [self.delegate encoderDidBecomeReady:self];
}

- (void)audioSourceDidStart:(id<ZCCAudioSource>)source {
  [self.delegate encoderDidStart:self];
}

- (void)audioSourceDidStop:(id<ZCCAudioSource>)source {
  [self.delegate encoderDidStop:self];
}

- (void)audioSourceDidEncounterError:(id<ZCCAudioSource>)source {
  [self.delegate encoderDidEncounterError:self];
}

- (void)audioSourceDidEncounterInitializationError:(id<ZCCAudioSource>)source {
  [self.delegate encoderDidEncounterError:self];
}

- (float)getLevel {
  return 0;
}

@end
