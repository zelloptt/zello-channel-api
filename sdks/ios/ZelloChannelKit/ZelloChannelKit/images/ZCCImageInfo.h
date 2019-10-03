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
 * @abstract The server-assigned id for this message. Use the <code>imageId</code> to associate a
 * thumbnail and a full-sized image, when they arrive separately.
 */
@property (nonatomic, readonly) NSUInteger imageId;

/**
 * @abstract The username of the user who sent the image message
 */
@property (nonatomic, readonly) NSString *sender;

/**
 * @abstract Thumbnail image
 *
 * @discussion If the image is larger than 90x90, a thumbnail image will usually be provided to
 * increase responsiveness while the larger image is being transferred.
 */
@property (nonatomic, readonly, nullable) UIImage *thumbnail;

/**
 * @abstract Full-sized image
 */
@property (nonatomic, readonly, nullable) UIImage *image;

/**
 * @abstract Do not create instances of <code>ZCCImageInfo</code>. They will be created by the channels SDK.
 */
- (instancetype)init NS_UNAVAILABLE;

@end

NS_ASSUME_NONNULL_END
