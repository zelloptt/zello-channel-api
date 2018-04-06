//
//  ZCCIncomingVoiceStreamInfo+Internal.h
//  ZelloChannelKit
//
//  Created by Greg Cooksey on 3/5/18.
//  Copyright © 2018 Zello. All rights reserved.
//

@import Foundation;
#import "ZCCIncomingVoiceConfiguration.h"

NS_ASSUME_NONNULL_BEGIN

@interface ZCCIncomingVoiceStreamInfo (Internal)
- (instancetype)initWithChannel:(NSString *)channel sender:(NSString *)sender;
@end

NS_ASSUME_NONNULL_END
