//
//  ZCCVoiceStreamsManager.h
//  sdk
//
//  Created by Alexey Gavrilov on 12/7/17.
//  Copyright © 2018 Zello. All rights reserved.
//

#import <Foundation/Foundation.h>
#import "ZCCQueueRunner.h"
#import "ZCCOutgoingVoiceConfiguration.h"
#import "ZCCVoiceStream+Internal.h"

NS_ASSUME_NONNULL_BEGIN

@class ZCCIncomingVoiceConfiguration;
@class ZCCOutgoingVoiceStream;
@class ZCCSocket;
@class ZCCVoiceStreamsManager;

@protocol ZCCVoiceStreamsManagerDelegate <NSObject>
- (void)voiceStreamsManager:(ZCCVoiceStreamsManager *)manager stream:(ZCCVoiceStream *)stream didEncounterError:(NSError *)error;
- (void)voiceStreamsManager:(ZCCVoiceStreamsManager *)manager streamDidStart:(ZCCVoiceStream *)stream;
- (void)voiceStreamsManager:(ZCCVoiceStreamsManager *)manager streamDidStop:(ZCCVoiceStream *)stream;
- (void)voiceStreamsManager:(ZCCVoiceStreamsManager *)manager streamDidChangeState:(ZCCVoiceStream *)stream;
- (void)voiceStreamsManager:(ZCCVoiceStreamsManager *)manager stream:(ZCCVoiceStream *)stream didUpdatePosition:(NSTimeInterval)position;
@end

@interface ZCCVoiceStreamsManager : ZCCQueueRunner<ZCCVoiceStreamDelegate>

@property (nonatomic, weak, nullable) id<ZCCVoiceStreamsManagerDelegate> delegate;
@property (nonatomic) NSTimeInterval requestTimeout;

- (ZCCOutgoingVoiceStream *)startStream:(NSString *)channel recipient:(nullable NSString *)username socket:(ZCCSocket *)socket voiceConfiguration:(nullable ZCCOutgoingVoiceConfiguration *)configuration;
- (void)stopStream;
- (void)onIncomingData:(NSData *)data streamId:(NSUInteger)streamId packetId:(NSUInteger)packetId;
- (void)onIncomingStreamStart:(NSUInteger)streamId
                       header:(NSData *)header
               packetDuration:(NSUInteger)duration
                      channel:(NSString *)channel
                         from:(NSString *)user
        receiverConfiguration:(nullable ZCCIncomingVoiceConfiguration *)configuration;

- (void)onIncomingStreamStop:(NSUInteger)streamId;
- (NSArray<ZCCVoiceStream *> *)activeStreams;

@end

NS_ASSUME_NONNULL_END
