//
//  ImageUtilities.m
//  ZelloChannelKitTests
//
//  Created by Greg Cooksey on 9/6/19.
//  Copyright © 2019 Zello. All rights reserved.
//

#import "ImageUtilities.h"

UIImage *solidImage(UIColor *color, CGSize size, CGFloat scale) {
  UIGraphicsBeginImageContextWithOptions(size, YES, scale);
  CGContextRef context = UIGraphicsGetCurrentContext();
  CGContextSetFillColorWithColor(context, color.CGColor);
  CGContextFillRect(context, CGRectInfinite);
  UIImage *image = UIGraphicsGetImageFromCurrentImageContext();
  UIGraphicsEndImageContext();
  return image;
}
