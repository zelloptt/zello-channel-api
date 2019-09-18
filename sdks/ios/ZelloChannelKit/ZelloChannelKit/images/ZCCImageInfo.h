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

/**
 * Encapsulates information about a received image
 */
@interface ZCCImageInfo : NSObject

/**
 * The server-assigned id for this message. Use the imageId to associate a thumbnail and a full-sized
 * image, when they arrive separately.
 */
@property (nonatomic, readonly) NSUInteger imageId;

/// The username of the user who sent the image message
@property (nonatomic, readonly) NSString *sender;

/// Thumbnail image
@property (nonatomic, readonly, nullable) UIImage *thumbnail;

/// Full-sized image
@property (nonatomic, readonly, nullable) UIImage *image;

- (instancetype)init NS_UNAVAILABLE;
@end

NS_ASSUME_NONNULL_END
