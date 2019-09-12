//
//  ZCCImageInfo.h
//  ZelloChannelKit
//
//  Created by Greg Cooksey on 9/10/19.
//  Copyright © 2019 Zello. All rights reserved.
//

#import <UIKit/UIKit.h>

@class ZCCIncomingImageInfo;

NS_ASSUME_NONNULL_BEGIN

// TODO: Document ZCCImageInfo
@interface ZCCImageInfo : NSObject
@property (nonatomic, readonly) NSUInteger imageId;
@property (nonatomic, readonly) NSString *sender;
@property (nonatomic, readonly, nullable) UIImage *thumbnail;
@property (nonatomic, readonly, nullable) UIImage *image;

- (instancetype)init NS_UNAVAILABLE;
@end

NS_ASSUME_NONNULL_END
