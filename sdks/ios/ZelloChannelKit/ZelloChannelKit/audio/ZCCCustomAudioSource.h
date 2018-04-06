//
//  ZCCCustomAudioSource.h
//  ZelloChannelKit
//
//  Created by Greg Cooksey on 3/1/18.
//  Copyright © 2018 Zello. All rights reserved.
//

#import <Foundation/Foundation.h>
#import "ZCCAudioSource.h"
#import "ZCCQueueRunner.h"

@class ZCCOutgoingVoiceConfiguration;
@class ZCCOutgoingVoiceStream;

@interface ZCCCustomAudioSource : ZCCQueueRunner <ZCCAudioSource>

- (nonnull instancetype)init NS_UNAVAILABLE;

- (nonnull instancetype)initWithConfiguration:(nonnull ZCCOutgoingVoiceConfiguration *)configuration stream:(nonnull ZCCOutgoingVoiceStream *)stream NS_DESIGNATED_INITIALIZER;

- (void)voiceSourceDidProvideAudio:(nonnull NSData *)audioData;
- (void)voiceSourceDidStop;

@end
