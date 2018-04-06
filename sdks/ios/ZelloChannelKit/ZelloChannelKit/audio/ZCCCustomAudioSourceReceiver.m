//
//  ZCCCustomAudioSourceReceiver.m
//  ZelloChannelKit
//
//  Created by Greg Cooksey on 3/7/18.
//  Copyright © 2018 Zello. All rights reserved.
//

#import "ZCCCustomAudioSourceReceiver.h"
#import "ZCCCustomAudioSource.h"

@interface ZCCCustomAudioSourceReceiver ()
// Weak because the CustomAudioSource owns this object
@property (nonatomic, weak, readonly) ZCCCustomAudioSource *source;
@end

@implementation ZCCCustomAudioSourceReceiver

- (instancetype)initWithSource:(ZCCCustomAudioSource *)source {
  self = [super init];
  if (self) {
    _source = source;
  }
  return self;
}

#pragma mark - NSObject

// Overriding hash / equality and copy to let users use these objects as keys in dictionaries
- (BOOL)isEqual:(ZCCCustomAudioSourceReceiver *)other {
  if (![other isMemberOfClass:[self class]]) {
    return NO;
  }
  return self.source == other.source;
}

- (NSUInteger)hash {
  return [self.source hash];
}

#pragma mark - NSCopying

- (id)copyWithZone:(NSZone *)zone {
  return self;
}

#pragma mark - ZCCVoiceSink

- (void)provideAudio:(NSData *)audio {
  [self.source voiceSourceDidProvideAudio:audio];
}

- (void)stop {
  [self.source voiceSourceDidStop];
}

@end

