//
//  ZCCCodecFactory.h
//  LoudtalksLite
//
//  Created by JAMES PICKERING on 12/2/11.
//  Copyright © 2018 Zello. All rights reserved.
//

#import <Foundation/Foundation.h>

@class ZCCDecoder;
@class ZCCEncoder;
@class ZCCIncomingVoiceConfiguration;
@class ZCCIncomingVoiceStream;
@class ZCCOutgoingVoiceConfiguration;
@class ZCCOutgoingVoiceStream;

typedef NS_ENUM(NSInteger, ZCCConnectionRank) {
  ZCCConnectionRankGPRS = 0,
  ZCCConnectionRank3G = 20,
  ZCCConnectionRank4G = 40,
  ZCCConnectionRankWiFi = 80,
  ZCCConnectionRankLAN = 100
};

@interface ZCCCodecFactory : NSObject

+ (nonnull ZCCCodecFactory *)instance;
- (nonnull ZCCEncoder *)createEncoderWithConfiguration:(nullable ZCCOutgoingVoiceConfiguration *)configuration stream:(nonnull ZCCOutgoingVoiceStream *)stream;
- (nonnull ZCCEncoder *)createEncoderWithRank:(ZCCConnectionRank)rank configuration:(nullable ZCCOutgoingVoiceConfiguration *)configuration stream:(nonnull ZCCOutgoingVoiceStream *)stream;
- (nonnull ZCCDecoder *)createDecoderWithConfiguration:(nullable ZCCIncomingVoiceConfiguration *)configuration stream:(nonnull ZCCIncomingVoiceStream *)stream;

@end
