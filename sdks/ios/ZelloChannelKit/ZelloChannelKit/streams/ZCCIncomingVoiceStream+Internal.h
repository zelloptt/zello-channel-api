//
//  ZCCIncomingVoiceStream+Internal.h
//  ZelloChannelKit
//
//  Created by Greg Cooksey on 2/27/18.
//  Copyright © 2018 Zello. All rights reserved.
//

#import "ZCCIncomingVoiceStream.h"

@class ZCCIncomingVoiceConfiguration;

@interface ZCCIncomingVoiceStream (Internal)

@property (nonatomic) BOOL autoStart;

- (nonnull instancetype)initWith:(NSUInteger)streamId
                          header:(nonnull NSData *)header
                  packetDuration:(NSUInteger)duration
                        channnel:(nonnull NSString *)channel
                            from:(nonnull NSString *)user
           receiverConfiguration:(nullable ZCCIncomingVoiceConfiguration *)configuration;

- (void)onData:(nonnull NSData *)data packetId:(NSUInteger)packetId;
- (void)onStreamStop;

@end
