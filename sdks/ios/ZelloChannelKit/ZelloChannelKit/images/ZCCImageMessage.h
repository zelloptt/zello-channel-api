//
//  ZCCImageMessage.h
//  ZelloChannelKit
//
//  Created by Greg Cooksey on 9/5/19.
//  Copyright © 2019 Zello. All rights reserved.
//

#import <UIKit/UIKit.h>

typedef NS_ENUM(NSInteger, ZCCImageType) {
  ZCCImageTypeUnkown,
  ZCCImageTypeJPEG
};

NS_ASSUME_NONNULL_BEGIN

/**
 * Don't create ZCCImageMessage objects directly. Instead, use ZCCImageMessageBuilder to create them.
 */
@interface ZCCImageMessage : NSObject
@property (nonatomic, readonly) ZCCImageType imageType;
@property (nonatomic, readonly) NSUInteger contentLength;
@property (nonatomic, readonly) NSUInteger thumbnailLength;
@property (nonatomic, readonly) NSInteger width;
@property (nonatomic, readonly) NSInteger height;
@property (nonatomic, readonly, nullable) NSString *recipient;

@property (nonatomic, readonly) NSData *imageData;
@property (nonatomic, readonly) NSData *thumbnailData;
@end

@interface ZCCImageMessageBuilder : NSObject
+ (instancetype)builderWithImage:(UIImage *)image;
- (void)setRecipient:(NSString *)recipient;
- (ZCCImageMessage *)message;
@end

NS_ASSUME_NONNULL_END
