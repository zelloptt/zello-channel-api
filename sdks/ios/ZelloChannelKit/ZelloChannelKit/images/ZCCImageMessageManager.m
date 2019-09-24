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
 * @warning access to incomingImages should be via queueRunner only.
 */
@property (nonatomic, readonly, nonnull) NSMutableDictionary<NSNumber *, ZCCIncomingImageInfo *> *incomingImages;
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
  }
  return self;
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
    } else {
      info.image = image;
    }

    [self.delegate imageMessageManager:self didReceiveImage:info];

    if (info.thumbnail && info.image) {
      strongSelf.incomingImages[@(imageId)] = nil;
    }
  }];

}

@end
