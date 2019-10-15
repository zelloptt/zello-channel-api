//
//  ZCCImageUtils.h
//  ZelloChannelKit
//
//  Created by Greg Cooksey on 9/5/19.
//  Copyright © 2019 Zello. All rights reserved.
//

#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@interface ZCCImageUtils : NSObject

+ (UIImage *)resizeImage:(UIImage *)image maxSize:(CGSize)newSize ignoringScreenScale:(BOOL)ignoreScreenScale;

+ (nullable NSData *)JPEGRepresentationForImage:(UIImage *)image maxSize:(NSUInteger)maxSize;

@end

NS_ASSUME_NONNULL_END
