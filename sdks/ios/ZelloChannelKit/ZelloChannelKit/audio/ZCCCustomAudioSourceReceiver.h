//
//  ZCCCustomAudioSourceReceiver.h
//  ZelloChannelKit
//
//  Created by Greg Cooksey on 3/7/18.
//  Copyright © 2018 Zello. All rights reserved.
//

#import <Foundation/Foundation.h>
#import "ZCCOutgoingVoiceConfiguration.h"

@class ZCCCustomAudioSource;

/**
 * This class is a thin wrapper around the ZCCVoiceSink protocol.
 */
@interface ZCCCustomAudioSourceReceiver : NSObject<ZCCVoiceSink>
- (nonnull instancetype)init NS_UNAVAILABLE;
- (nonnull instancetype)initWithSource:(nonnull ZCCCustomAudioSource *)source;
@end

