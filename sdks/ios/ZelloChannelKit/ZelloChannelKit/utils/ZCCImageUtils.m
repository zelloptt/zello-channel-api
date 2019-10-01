//
//  ZCCImageUtils.m
//  ZelloChannelKit
//
//  Created by Greg Cooksey on 9/5/19.
//  Copyright © 2019 Zello. All rights reserved.
//

@import UIKit;

#import "ZCCImageUtils.h"

@implementation ZCCImageUtils

+ (UIImage *)resizeImage:(UIImage *)image maxSize:(CGSize)maxSize ignoringScreenScale:(BOOL)ignoreScreenScale {
  // In next line, pass 0.0 to use the current device's pixel scaling factor (and thus account for Retina resolution).
  // Pass 1.0 to force exact pixel size.
  CGFloat scale;
  CGSize imageSize = image.size;
  if (ignoreScreenScale) {
    scale = 1.0;
    imageSize.width = imageSize.width * image.scale;
    imageSize.height = imageSize.height * image.scale;
  } else {
    scale = 0.0;
  }
  if (imageSize.width <= maxSize.width && imageSize.height <= maxSize.height) {
    return image;
  }
  CGSize newSize = imageSize;

  if (newSize.width > maxSize.width || newSize.height > maxSize.height) {
    CGFloat aspectWidth = maxSize.width / newSize.width;
    CGFloat aspectHeight = maxSize.height / newSize.height;
    if (aspectWidth < aspectHeight) {
      newSize.width = newSize.width * aspectWidth;
      newSize.height = newSize.height * aspectWidth;
    } else {
      newSize.width = newSize.width * aspectHeight;
      newSize.height = newSize.height * aspectHeight;
    }
  }

  UIGraphicsBeginImageContextWithOptions(newSize, NO, scale);
  [image drawInRect:CGRectMake(0, 0, newSize.width, newSize.height)];
  UIImage *newImage = UIGraphicsGetImageFromCurrentImageContext();
  UIGraphicsEndImageContext();
  return newImage;
}

+ (nullable NSData *)JPEGRepresentationForImage:(UIImage *)image maxSize:(NSUInteger)maxSize {
  NSData *imageData = nil;

  for (float quality = 0.95f; quality > 0; quality -= 0.1f) {
    imageData = UIImageJPEGRepresentation(image, quality);
    if (imageData.length < maxSize) {
      break;
    }
  }

  if (!imageData) {
    NSLog(@"[ZCC] Image too large.");
    imageData = UIImageJPEGRepresentation(image, 0.1f); // Pass back lowest quality
  }
  return imageData;
}

@end
