//
//  ZCCImageMessageManager.h
//  ZelloChannelKit
//
//  Created by Greg Cooksey on 9/5/19.
//  Copyright © 2019 Zello. All rights reserved.
//

@import UIKit;

@class ZCCImageHeader;
@class ZCCImageMessageManager;
@class ZCCIncomingImageInfo;
@class ZCCQueueRunner;
@class ZCCSocket;

NS_ASSUME_NONNULL_BEGIN

@protocol ZCCImageMessageManagerDelegate <NSObject>
/**
 * Called when an image is received form the server. Will be called multiple times for the same image
 * when the thumbnail and main image are received.
 */
- (void)imageMessageManager:(ZCCImageMessageManager *)manager didReceiveImage:(ZCCIncomingImageInfo *)imageInfo;
- (void)imageMessageManager:(ZCCImageMessageManager *)manager didFailToSendImage:(UIImage *)image reason:(NSString *)failureReason;
@end

@interface ZCCImageMessageManager : NSObject
@property (nonatomic, weak) id<ZCCImageMessageManagerDelegate> delegate;
@property (nonatomic) NSTimeInterval requestTimeout;

- (instancetype)initWithRunner:(ZCCQueueRunner *)runner NS_DESIGNATED_INITIALIZER;

- (void)sendImage:(UIImage *)image recipient:(nullable NSString *)username socket:(ZCCSocket *)socket;

- (void)handleImageHeader:(ZCCImageHeader *)header;
- (void)handleImageData:(NSData *)data imageId:(NSUInteger)imageId isThumbnail:(BOOL)isThumbnail;

@end

NS_ASSUME_NONNULL_END
