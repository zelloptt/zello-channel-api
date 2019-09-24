//
//  ZCCIncomingImageInfo.m
//  ZelloChannelKit
//
//  Created by Greg Cooksey on 9/10/19.
//  Copyright © 2019 Zello. All rights reserved.
//

#import "ZCCIncomingImageInfo.h"
#import "ZCCImageHeader.h"

@interface ZCCIncomingImageInfo ()
@property (nonatomic, strong, nonnull) NSDate *lastTouched;
@end

@implementation ZCCIncomingImageInfo {
  UIImage *_thumbnail;
  UIImage *_image;
}

- (instancetype)initWithHeader:(ZCCImageHeader *)header {
  self = [super init];
  if (self) {
    _header = header;
    _lastTouched = [NSDate date];
  }
  return self;
}

#pragma mark - Properties

- (UIImage *)image {
  return _image;
}

- (void)setImage:(UIImage *)image {
  _image = image;
  self.lastTouched = [NSDate date];
}

- (UIImage *)thumbnail {
  return _thumbnail;
}

- (void)setThumbnail:(UIImage *)thumbnail {
  _thumbnail = thumbnail;
  self.lastTouched = [NSDate date];
}

@end
