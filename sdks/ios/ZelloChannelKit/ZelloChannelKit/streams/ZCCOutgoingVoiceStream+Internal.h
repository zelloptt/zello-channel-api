//
//  ZCCOutgoingVoiceStream+Internal.h
//  ZelloChannelKit
//
//  Created by Greg Cooksey on 2/27/18.
//  Copyright © 2018 Zello. All rights reserved.
//

#import "ZCCOutgoingVoiceStream.h"

@class ZCCOutgoingVoiceConfiguration;
@class ZCCSocket;

@interface ZCCOutgoingVoiceStream (Internal)

- (nonnull instancetype)initWithChannel:(nonnull NSString *)channel socket:(nonnull ZCCSocket *)socket configuration:(nullable ZCCOutgoingVoiceConfiguration *)configuration;

- (void)startWithTimeout:(NSTimeInterval)timeout;

@end
