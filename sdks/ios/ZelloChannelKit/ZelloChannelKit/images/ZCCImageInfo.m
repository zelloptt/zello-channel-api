//
//  ZCCImageInfo.m
//  ZelloChannelKit
//
//  Created by Greg Cooksey on 9/10/19.
//  Copyright © 2019 Zello. All rights reserved.
//

#import "ZCCImageHeader.h"
#import "ZCCImageInfo.h"
#import "ZCCIncomingImageInfo.h"

@interface ZCCImageInfo ()

@property (nonatomic, readonly, nonnull) ZCCIncomingImageInfo *incomingInfo;

@end

@implementation ZCCImageInfo

- (instancetype)initWithImageInfo:(ZCCIncomingImageInfo *)info {
  self = [super init];
  if (self) {
    _incomingInfo = info;
  }
  return self;
}

#pragma mark - Properties

//@property (nonatomic, readonly) NSUInteger imageId;
- (NSUInteger)imageId {
  return self.incomingInfo.header.imageId;
}

//@property (nonatomic, readonly) NSString *sender;
- (NSString *)sender {
  return self.incomingInfo.header.sender;
}

//@property (nonatomic, readonly, nullable) UIImage *thumbnail;
- (UIImage *)thumbnail {
  return self.incomingInfo.thumbnail;
}

//@property (nonatomic, readonly, nullable) UIImage *image;
- (UIImage *)image {
  return self.incomingInfo.image;
}

#pragma mark - NSObject

- (NSString *)description {
  return [NSString stringWithFormat:@"<%@ %p id:%lu sender:%@ thumbnail? %@ image? %@>", NSStringFromClass([self class]), self, self.imageId, self.sender, (self.thumbnail ? @"YES" : @"NO"), (self.image ? @"YES" : @"NO")];
}

@end
