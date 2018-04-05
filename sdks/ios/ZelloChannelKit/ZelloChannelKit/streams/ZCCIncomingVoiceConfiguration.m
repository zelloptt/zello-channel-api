//
//  ZCCIncomingVoiceConfiguration.m
//  ZelloChannelKit
//
//  Created by Greg Cooksey on 3/5/18.
//  Copyright © 2018 Zello. All rights reserved.
//

#import "ZCCIncomingVoiceConfiguration.h"
#import "ZCCIncomingVoiceStreamInfo+Internal.h"

@implementation ZCCIncomingVoiceStreamInfo
- (instancetype)initWithChannel:(NSString *)channel sender:(NSString *)sender {
  self = [super init];
  if (self) {
    _channel = channel;
    _sender = sender;
  }
  return self;
}

- (NSUInteger)hash {
  return self.channel.hash + self.sender.hash;
}

- (BOOL)isEqual:(id)object {
  if (![object isKindOfClass:[ZCCIncomingVoiceStreamInfo class]]) {
    return NO;
  }
  ZCCIncomingVoiceStreamInfo *other = object;
  return [self.channel isEqualToString:other.channel] && [self.sender isEqualToString:other.sender];
}
@end

@implementation ZCCIncomingVoiceConfiguration

- (instancetype)copyWithZone:(NSZone *)zone {
  ZCCIncomingVoiceConfiguration *copy = [[ZCCIncomingVoiceConfiguration alloc] init];
  copy.playThroughSpeaker = self.playThroughSpeaker;
  copy.receiver = self.receiver;
  return copy;
}

@end
