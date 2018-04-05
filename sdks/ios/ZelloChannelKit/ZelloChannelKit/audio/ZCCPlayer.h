//
//  ZCCPlayer.h
//  Zello
//
//  Created by Alexey Gavrilov on 1/9/12.
//  Copyright © 2018 Zello. All rights reserved.
//

#import <Foundation/Foundation.h>
#import "ZCCAudioHelper.h"
#import "ZCCAudioReceiver.h"

@class ZCCPlayer;
@class ZCCQueueRunner;

@interface ZCCPlayer : NSObject<ZCCInterruptableAudioEndpoint, ZCCAudioReceiver>

@property (nonatomic, readonly, class) NSData *stopCookie;

@property (atomic, weak) id<ZCCAudioReceiverDelegate> delegate;
@property (atomic, readonly) BOOL paused;
@property (atomic) NSInteger volume;
@property (atomic, readonly) NSTimeInterval currentTime;
@property (atomic, readonly) float level;
@property (atomic, readonly) BOOL overloaded;

// Exposing this so we can wrap ZCCPlayer in ZCCCustomAudioReceiver without causing problems
// dispatch_syncing to the same thread
@property (atomic, readonly) ZCCQueueRunner *runner;

- (void)prepareWith:(NSInteger)channels sampleRate:(NSInteger)sampleRate bitsPerSample:(NSInteger)bps packetDuration:(NSInteger)duration;
- (void)play;
- (void)stop;
- (void)pause;
- (void)resume;

@end
