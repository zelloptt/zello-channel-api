//
//  ZCCStreamParams.m
//  sdk
//
//  Created by Greg Cooksey on 1/31/18.
//  Copyright © 2018 Zello. All rights reserved.
//

#import "ZCCStreamParams.h"
#import "ZCCEncoder.h"

@implementation ZCCStreamParams

- (instancetype)initWithType:(NSString *)type encoder:(ZCCEncoder *)encoder {
  self = [self init];
  if (self) {
    _type = type;
    _codecName = encoder.name;
    _codecHeader = encoder.header;
    _packetDuration = encoder.packetDuration;
  }
  return self;
}

- (NSUInteger)hash {
  // We don't key off ZCCStreamParams, so this probably doesn't matter
  return self.codecHeader.length;
}

- (BOOL)isEqual:(id)object {
  if (![object isKindOfClass:[ZCCStreamParams class]]) {
    return NO;
  }
  ZCCStreamParams *other = object;
  return [self.codecName isEqualToString:other.codecName] && [self.type isEqualToString:other.type] && [self.codecHeader isEqualToData:other.codecHeader] && self.packetDuration == other.packetDuration;
}

@end
