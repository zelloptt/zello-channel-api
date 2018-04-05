//
//  ZCCAudioReceiver.h
//  ZelloChannelKit
//
//  Created by Greg Cooksey on 3/6/18.
//  Copyright © 2018 Zello. All rights reserved.
//

@protocol ZCCAudioReceiver;

@protocol ZCCAudioReceiverDelegate <NSObject>

- (NSData *)dataForReceiver:(id<ZCCAudioReceiver>)receiver;
- (NSData *)PLCDataForReceiver:(id<ZCCAudioReceiver>)receiver;
- (void)receiverDidBecomeReady:(id<ZCCAudioReceiver>)receiver;
- (void)receiverDidStartPlayback:(id<ZCCAudioReceiver>)receiver;
- (void)receiverDidEndPlayback:(id<ZCCAudioReceiver>)receiver;
- (void)receiver:(id<ZCCAudioReceiver>)receiver didEncounterError:(NSError *)error;

@end

@protocol ZCCAudioReceiver <NSObject>
@property (atomic, weak) id<ZCCAudioReceiverDelegate> delegate;
@property (atomic, readonly) BOOL paused;
@property (atomic) NSInteger volume;
@property (atomic, readonly) NSTimeInterval currentTime;
@property (atomic, readonly) float level;
@property (atomic, readonly) BOOL overloaded;

- (void)prepareWith:(NSInteger)channels sampleRate:(NSInteger)sampleRate bitsPerSample:(NSInteger)bps packetDuration:(NSInteger)duration;
- (void)play;
- (void)stop;
- (void)pause;
- (void)resume;
@end
