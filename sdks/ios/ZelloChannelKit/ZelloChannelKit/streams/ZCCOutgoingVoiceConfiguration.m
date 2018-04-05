//
//  ZCCOutgoingVoiceConfiguration.m
//  ZelloChannelKit
//
//  Created by Greg Cooksey on 2/28/18.
//  Copyright © 2018 Zello. All rights reserved.
//

#import "ZCCOutgoingVoiceConfiguration.h"

@implementation ZCCOutgoingVoiceConfiguration

- (instancetype)init {
  self = [super init];
  if (self) {
    _sampleRate = 16000;
  }
  return self;
}

+ (NSArray *)supportedSampleRates {
  // The sample rates that ZCCEncoderOpus supports
  return @[@(8000), @(16000), @(24000), @(32000)];
}

@end
