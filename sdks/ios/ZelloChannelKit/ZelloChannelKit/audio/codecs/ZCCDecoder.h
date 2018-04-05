//
//  ZCCDecoder.h
//  LoudtalksLite
//
//  Created by JAMES PICKERING on 12/1/11.
//  Copyright © 2018 Zello. All rights reserved.
//

#import <Foundation/Foundation.h>
#import "ZCCAudioReceiver.h"

@class ZCCDecoder;
@class ZCCIncomingVoiceConfiguration;

@protocol ZCCDecoderDelegate <NSObject>

/**
 * Pulls a packet of data from the decoder's source(?) Listener should return Player.stopCookie
 * if the source is finished.
 */
- (NSData *)dataForDecoder:(ZCCDecoder *)decoder;
- (void)decoderDidBecomeReady:(ZCCDecoder *)decoder;
- (void)decoderDidStart:(ZCCDecoder *)decoder;
- (void)decoderDidStop:(ZCCDecoder *)decoder;
- (void)decoder:(ZCCDecoder *)decoder didEncounterError:(NSError *)error;

@end

@interface ZCCDecoder : NSObject<ZCCAudioReceiverDelegate>

@property (atomic, weak) id<ZCCDecoderDelegate> delegate;

@property (atomic) NSInteger volume;
@property (atomic, readonly) NSTimeInterval position;
@property (atomic, readonly) BOOL overloaded;
@property (atomic, strong) id<ZCCAudioReceiver> player;
@property (atomic) BOOL started;

- (instancetype)init NS_UNAVAILABLE;

- (instancetype)initWithPlayer:(id<ZCCAudioReceiver>)player NS_DESIGNATED_INITIALIZER;

- (void)setPacketDuration:(NSUInteger)duration;
- (NSData *)getMissingPacket;
- (void)prepareAsync:(NSData *)header withPlaybackAmplifierGain:(NSInteger)gain;
- (void)start;
- (void)stop;
- (void)pause;
- (void)resume;
- (float)getLevel;
- (void)setGain:(NSInteger)gain;

@end
