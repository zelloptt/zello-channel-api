//
//  ZCCImageMessage.m
//  ZelloChannelKit
//
//  Created by Greg Cooksey on 9/5/19.
//  Copyright © 2019 Zello. All rights reserved.
//

#import "ZCCImageMessage.h"
#import "ZCCImageUtils.h"

static const NSUInteger maxImageDataLength = 524288;

@interface ZCCImageMessage ()
@property (nonatomic) ZCCImageType imageType;
@property (nonatomic) NSUInteger contentLength;
@property (nonatomic) NSUInteger thumbnailLength;
@property (nonatomic) NSInteger width;
@property (nonatomic) NSInteger height;
@property (nonatomic, copy, nullable) NSString *recipient;

@property (nonatomic, copy) NSData *imageData;
@property (nonatomic, copy) NSData *thumbnailData;
@end

@implementation ZCCImageMessage

- (BOOL)isEqual:(id)object {
  if (![object isKindOfClass:[ZCCImageMessage class]]) {
    return NO;
  }
  ZCCImageMessage *other = object;
  if (self.imageType != other.imageType) {
    return NO;
  }
  if (self.contentLength != other.contentLength) {
    return NO;
  }
  if (self.thumbnailLength != other.thumbnailLength) {
    return NO;
  }
  if (self.width != other.width) {
    return NO;
  }
  if (self.height != other.height) {
    return NO;
  }
  if (self.recipient && ![other.recipient isEqualToString:self.recipient]) {
    return NO;
  }
  if (!self.recipient && other.recipient) {
    return NO;
  }
  if (![self.imageData isEqualToData:other.imageData]) {
    return NO;
  }
  if (![self.thumbnailData isEqualToData:other.thumbnailData]) {
    return NO;
  }

  return YES;
}

- (NSUInteger)hash {
  return self.imageData.hash * self.thumbnailData.hash;
}

@end

@interface ZCCImageMessageBuilder ()
@property (nonatomic, strong) UIImage *image;
@property (nonatomic, copy, nullable) NSString *recipient;
@end

@implementation ZCCImageMessageBuilder

+ (instancetype)builderWithImage:(UIImage *)image {
  return [[ZCCImageMessageBuilder alloc] initWithImage:image];
}

- (instancetype)initWithImage:(UIImage *)image {
  self = [super init];
  if (self) {
    _image = image;
  }
  return self;
}

- (ZCCImageMessage *)message {
  CGSize maxImageSize = CGSizeMake(1280.0f, 1280.0f);
  UIImage *resized = [ZCCImageUtils resizeImage:self.image maxSize:maxImageSize ignoringScreenScale:YES];
  NSData *imageData = [ZCCImageUtils JPEGRepresentationForImage:resized maxSize:maxImageDataLength];

  CGSize maxThumbnailSize = CGSizeMake(90.0f, 90.0f);
  UIImage *thumbnail = [ZCCImageUtils resizeImage:self.image maxSize:maxThumbnailSize ignoringScreenScale:YES];
  NSData *thumbnailData = UIImageJPEGRepresentation(thumbnail, 0.75);

  ZCCImageMessage *message = [[ZCCImageMessage alloc] init];
  message.imageType = ZCCImageTypeJPEG;
  message.contentLength = imageData.length;
  message.thumbnailLength = thumbnailData.length;
  message.width = (NSInteger)(resized.size.width * resized.scale);
  message.height = (NSInteger)(resized.size.height * resized.scale);
  message.recipient = self.recipient;
  message.imageData = imageData;
  message.thumbnailData = thumbnailData;
  return message;
}

@end
