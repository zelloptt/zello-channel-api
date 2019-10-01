//
//  ZCCImageMessageManager.m
//  ZelloChannelKit
//
//  Created by Greg Cooksey on 9/5/19.
//  Copyright © 2019 Zello. All rights reserved.
//

#import "ZCCImageMessageManager.h"
#import "ZCCImageHeader.h"
#import "ZCCImageMessage.h"
#import "ZCCIncomingImageInfo.h"
#import "ZCCQueueRunner.h"
#import "ZCCSocket.h"

@interface ZCCImageMessageManager ()
@property (nonatomic, readonly, nonnull) ZCCQueueRunner *queueRunner;
/**
 * Maps image ID to incoming image info. Items are removed after both thumbnail and image are received.
 *
 * @warning Access to incomingImages should be via queueRunner only.
 */
@property (nonatomic, readonly, nonnull) NSMutableDictionary<NSNumber *, ZCCIncomingImageInfo *> *incomingImages;

/// When image metadata is older than this, it will be removed from incomingImages on the next cleanup pass
@property (nonatomic) NSTimeInterval cleanupOlderThan;
/// Don't fire incomingImages cleanup passes more frequently than this
@property (nonatomic) NSTimeInterval minimumCleanupInterval;

/**
 * Set when we're preparing to run a cleanup on the incomingImages dictionary
 *
 * @warning Access to needsCleanup should be via queueRunner only.
 */
@property (nonatomic) BOOL needsCleanup;
/**
 * Stores the last time we scheduled a cleanup. Don't schedule a new one unless minimumCleanupInterval
 * has elapsed.
 *
 * @warning Access to lastCleanupScheduledAt should be via queueRunner only.
 */
@property (nonatomic) NSDate *lastCleanupScheduledAt;
@end

@implementation ZCCImageMessageManager

- (instancetype)init {
  return [self initWithRunner:[[ZCCQueueRunner alloc] initWithName:@"ZCCImageMessageManager"]];
}

- (instancetype)initWithRunner:(ZCCQueueRunner *)runner {
  self = [super init];
  if (self) {
    _queueRunner = runner;
    _incomingImages = [NSMutableDictionary dictionary];
    _requestTimeout = 30.0;
    // Clean up incomplete messages after 2 minutes
    _cleanupOlderThan = 120.0;
    // Don't run clean up more frequently than every 15 seconds
    _minimumCleanupInterval = 15.0;
    _lastCleanupScheduledAt = [NSDate date];
    [NSNotificationCenter.defaultCenter addObserver:self selector:@selector(performLowMemoryCleanup:) name:UIApplicationDidReceiveMemoryWarningNotification object:nil];
  }
  return self;
}

- (void)dealloc {
  [NSNotificationCenter.defaultCenter removeObserver:self];
}

- (void)sendImage:(UIImage *)image recipient:(nullable NSString *)username socket:(ZCCSocket *)socket {
  ZCCImageMessageBuilder *builder = [ZCCImageMessageBuilder builderWithImage:image];
  [builder setRecipient:username];
  ZCCImageMessage *imageMessage = [builder message];
  [socket sendImage:imageMessage callback:^(BOOL succeeded, UInt32 imageId, NSString * _Nullable errorMessage) {
    if (!succeeded) {
      [self.delegate imageMessageManager:self didFailToSendImage:image reason:errorMessage];
      return;
    }

    [socket sendImageData:imageMessage imageId:imageId];
  } timeoutAfter:self.requestTimeout];
}

- (void)handleImageHeader:(ZCCImageHeader *)header {
  __weak typeof(self) weakSelf = self;
  [self.queueRunner runAsync:^{
    typeof(self) strongSelf = weakSelf;
    if (!strongSelf) {
      return;
    }
    ZCCIncomingImageInfo *info = [[ZCCIncomingImageInfo alloc] initWithHeader:header];
    strongSelf.incomingImages[@(header.imageId)] = info;

    [strongSelf setNeedsCleanup];
  }];
}

- (void)handleImageData:(NSData *)data imageId:(NSUInteger)imageId isThumbnail:(BOOL)isThumbnail {
  UIImage *image = [UIImage imageWithData:data];
  if (!image) {
    NSLog(@"[ZCC] Error decoding image from message");
    return;
  }

  __weak typeof(self) weakSelf = self;
  [self.queueRunner runAsync:^{
    typeof(self) strongSelf = weakSelf;
    if (!strongSelf) {
      return;
    }
    ZCCIncomingImageInfo *info = strongSelf.incomingImages[@(imageId)];
    if (!info) {
      return;
    }
    if (isThumbnail) {
      info.thumbnail = image;
      [self setNeedsCleanup];
    } else {
      info.image = image;
    }

    [self.delegate imageMessageManager:self didReceiveImage:info];

    if (info.image) {
      strongSelf.incomingImages[@(imageId)] = nil;
    }
  }];
}

#pragma mark - Private

- (void)performLowMemoryCleanup:(NSNotification *)notification {
  // Remove thumbnails if we get a low memory warning. The user has already received them, and we're
  // keeping enough information to send them the images themselves when they arrive.
  [self.queueRunner runAsync:^{
    for (ZCCIncomingImageInfo *info in self.incomingImages.allValues) {
      info.thumbnail = nil;
    }
  }];
}

/// @warning only call this method from queueRunner
- (void)setNeedsCleanup {
  NSDate *now = [NSDate date];
  if ([now timeIntervalSinceDate:self.lastCleanupScheduledAt] > self.minimumCleanupInterval) {
    self.lastCleanupScheduledAt = now;
    self.needsCleanup = YES;
    __weak typeof(self) weakSelf = self;
    [self.queueRunner run:^{
      [weakSelf cleanupIncomingImagesIfNeeded];
    } after:self.cleanupOlderThan];
  }
}

/// @warning only call this method from queueRunner
- (void)cleanupIncomingImagesIfNeeded {
  if (!self.needsCleanup) {
    return;
  }

  NSMutableArray *toRemove = [NSMutableArray array];
  for (NSNumber *imageId in self.incomingImages) {
    ZCCIncomingImageInfo *imageInfo = self.incomingImages[imageId];
    if ([[NSDate date] timeIntervalSinceDate:imageInfo.lastTouched] > self.cleanupOlderThan) {
      [toRemove addObject:imageId];
    }
  }
  if (toRemove.count > 0) {
    [self.incomingImages removeObjectsForKeys:toRemove];
  }

  self.needsCleanup = NO;
}


@end
