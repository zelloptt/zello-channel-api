//
//  ZCCIncomingImageInfo.m
//  ZelloChannelKit
//
//  Created by Greg Cooksey on 9/10/19.
//  Copyright © 2019 Zello. All rights reserved.
//

#import "ZCCIncomingImageInfo.h"
#import "ZCCImageHeader.h"

@implementation ZCCIncomingImageInfo
- (instancetype)initWithHeader:(ZCCImageHeader *)header {
  self = [super init];
  if (self) {
    _header = header;
  }
  return self;
}
@end
