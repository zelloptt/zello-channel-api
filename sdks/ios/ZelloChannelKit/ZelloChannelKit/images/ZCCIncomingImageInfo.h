//
//  ZCCIncomingImageInfo.h
//  ZelloChannelKit
//
//  Created by Greg Cooksey on 9/10/19.
//  Copyright © 2019 Zello. All rights reserved.
//

#import <UIKit/UIKit.h>

NS_ASSUME_NONNULL_BEGIN

@class ZCCImageHeader;

@interface ZCCIncomingImageInfo : NSObject
@property (nonatomic, strong) ZCCImageHeader *header;
@property (nonatomic, strong, nullable) UIImage *thumbnail;
@property (nonatomic, strong, nullable) UIImage *image;

- (instancetype)init NS_UNAVAILABLE;
- (instancetype)initWithHeader:(ZCCImageHeader *)header NS_DESIGNATED_INITIALIZER;
@end

NS_ASSUME_NONNULL_END
