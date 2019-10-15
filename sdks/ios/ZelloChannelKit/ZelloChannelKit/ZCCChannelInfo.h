//
//  ZCCChannelStatus.h
//  ZelloChannelKit
//
//  Created by Greg Cooksey on 9/18/19.
//  Copyright © 2019 Zello. All rights reserved.
//

#import <Foundation/Foundation.h>
#import "ZCCTypes.h"

NS_ASSUME_NONNULL_BEGIN

typedef struct {
  ZCCChannelStatus status;
  BOOL imagesSupported;
  BOOL textingSupported;
  BOOL locationsSupported;
} ZCCChannelInfo;

/// Returns a cleared-out channel info object
FOUNDATION_EXPORT ZCCChannelInfo ZCCChannelInfoZero(void);
FOUNDATION_EXPORT ZCCChannelStatus ZCCChannelStatusFromString(NSString *string);
FOUNDATION_EXPORT NSString *NSStringFromChannelInfo(ZCCChannelInfo channelInfo);

NS_ASSUME_NONNULL_END
