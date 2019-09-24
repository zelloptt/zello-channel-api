//
//  ZCCImageHeader.m
//  ZelloChannelKit
//
//  Created by Greg Cooksey on 9/6/19.
//  Copyright © 2019 Zello. All rights reserved.
//

#import "ZCCImageHeader.h"

@implementation ZCCImageHeader

- (BOOL)isEqual:(id)object {
  if (![object isKindOfClass:[ZCCImageHeader class]]) {
    return NO;
  }
  ZCCImageHeader *other = object;

  if ((self.channel && ![other.channel isEqualToString:self.channel])
      || (!self.channel && other.channel)) {
    return NO;
  }
  if ((self.sender && ![other.sender isEqualToString:self.sender])
      || (!self.sender && other.sender)) {
    return NO;
  }
  if (self.imageId != other.imageId) {
    return NO;
  }
  if (self.imageType != other.imageType) {
    return NO;
  }
  if (self.height != other.height) {
    return NO;
  }
  if (self.width != other.width) {
    return NO;
  }
  if ((self.source && ![other.source isEqualToString:self.source])
      || (!self.source && other.source)) {
    return NO;
  }

  return YES;
}

- (NSUInteger)hash {
  return self.imageId;
}

@end
