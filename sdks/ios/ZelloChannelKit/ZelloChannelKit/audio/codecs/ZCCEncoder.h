//
//  ZCCEncoder.h
//  LoudtalksLite
//
//  Created by JAMES PICKERING on 11/28/11.
//  Copyright © 2018 Zello. All rights reserved.
//

#import <Foundation/Foundation.h>
#import "ZCCAudioSource.h"
#import "ZCCCodec.h"

@class ZCCEncoder;

@protocol ZCCEncoderDelegate <NSObject>

- (void)encoder:(ZCCEncoder *)encoder didProduceData:(NSData *)data;
- (void)encoderDidBecomeReady:(ZCCEncoder *)encoder;
- (void)encoderDidStart:(ZCCEncoder *)encoder;
- (void)encoderDidStop:(ZCCEncoder *)encoder;
- (void)encoderDidEncounterError:(ZCCEncoder *)encoder;

@end

@interface ZCCEncoder : NSObject<ZCCAudioSourceDelegate>
@property (atomic) NSUInteger framesPerPacket;
@property (atomic) NSInteger bitrate;
@property (atomic) NSUInteger sampleRate;
@property (atomic) NSUInteger frameSize;
@property (atomic, strong) id<ZCCAudioSource> recorder;
@property (atomic, weak) id<ZCCEncoderDelegate> delegate;

@property (atomic, readonly) NSString *name;
@property (atomic, readonly) NSData *header;

/// Packet duration in ms
@property (nonatomic, readonly) NSUInteger packetDuration;

- (NSData *)getHeader;
- (ZCCCodecType)getId;
- (NSString *)getName;
- (NSUInteger)getPacketDuration;
- (NSUInteger)getFrameDuration;
- (NSUInteger)getBufferSampleCount;
- (void)prepareAsync:(NSInteger)ampGain;
- (void)start;
- (void)stop;
- (float)getLevel;
- (void)setGain:(NSInteger)gain;

@end
