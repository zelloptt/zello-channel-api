//
//  ZCCChannelStatus.m
//  ZelloChannelKit
//
//  Created by Greg Cooksey on 9/18/19.
//  Copyright © 2019 Zello. All rights reserved.
//

#import "ZCCChannelInfo.h"

ZCCChannelInfo ZCCChannelInfoZero() {
  ZCCChannelInfo info = { .status = ZCCChannelStatusUnknown, .imagesSupported = NO, .locationsSupported = NO, .textingSupported = NO };
  return info;
}

ZCCChannelStatus ZCCChannelStatusFromString(NSString *string) {
  NSDictionary *statuses = @{@"online": @(ZCCChannelStatusOnline),
                             @"offline": @(ZCCChannelStatusOffline)};
  return [statuses[string] integerValue];
}

static NSString *stringFromChannelStatus(ZCCChannelStatus status) {
  switch (status) {
    case ZCCChannelStatusUnknown:
      return @"unknown";
    case ZCCChannelStatusOffline:
      return @"offline";
    case ZCCChannelStatusOnline:
      return @"online";
  }
}

NSString *NSStringFromChannelInfo(ZCCChannelInfo channelInfo) {
  return [NSString stringWithFormat:@"<ZCCChannelInfo %@%@%@%@>",
          stringFromChannelStatus(channelInfo.status), (channelInfo.imagesSupported ? @" images" : @""),
          (channelInfo.locationsSupported ? @" locations" : @""), (channelInfo.textingSupported ? @" texting" : @"")];
}
