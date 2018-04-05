//
//  ZCCCustomAudioReceiver.h
//  ZelloChannelKit
//
//  Created by Greg Cooksey on 3/6/18.
//  Copyright © 2018 Zello. All rights reserved.
//

#import <Foundation/Foundation.h>
#import "ZCCAudioReceiver.h"

@class ZCCIncomingVoiceConfiguration;
@class ZCCIncomingVoiceStream;

@interface ZCCCustomAudioReceiver : NSObject <ZCCAudioReceiver>

- (nonnull instancetype)init NS_UNAVAILABLE;
- (nonnull instancetype)initWithConfiguration:(nonnull ZCCIncomingVoiceConfiguration *)configuration stream:(nonnull ZCCIncomingVoiceStream *)stream;

@end
