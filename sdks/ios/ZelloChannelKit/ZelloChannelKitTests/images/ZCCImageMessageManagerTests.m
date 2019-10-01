//
//  ZCCImageMessageManagerTests.m
//  ZelloChannelKitTests
//
//  Created by Greg Cooksey on 9/6/19.
//  Copyright © 2019 Zello. All rights reserved.
//

#import <OCMock/OCMock.h>
#import <XCTest/XCTest.h>
#import "ImageUtilities.h"
#import "ZCCImageHeader.h"
#import "ZCCImageMessage.h"
#import "ZCCImageMessageManager.h"
#import "ZCCImageUtils.h"
#import "ZCCIncomingImageInfo.h"
#import "ZCCQueueRunner.h"
#import "ZCCSocket.h"

@interface ZCCImageMessageManager (Testing)
// Exposing private properties for testing
@property (nonatomic, readonly, nonnull) ZCCQueueRunner *queueRunner;
@property (nonatomic, readonly, nonnull) NSMutableDictionary<NSNumber *, ZCCIncomingImageInfo *> *incomingImages;
@property (nonatomic) NSTimeInterval cleanupOlderThan;
@property (nonatomic) NSTimeInterval minimumCleanupInterval;
@end

@interface ZCCImageMessageManagerTests : XCTestCase
@property (nonatomic, strong) ZCCImageMessageManager *imageMessageManager;

/// Mocked ZCCSocket
@property (nonatomic, strong) id socket;
@end

@implementation ZCCImageMessageManagerTests

- (void)setUp {
  self.imageMessageManager = [[ZCCImageMessageManager alloc] init];

  self.socket = OCMClassMock([ZCCSocket class]);
}

- (void)tearDown {
  self.imageMessageManager = nil;

  self.socket = nil;
}

// Verify that we send images
- (void)testSendImage_sendsImage {
  UIImage *testImage = solidImage(UIColor.redColor, CGSizeMake(400.0f, 400.0f), 1.0);
  ZCCImageMessage *expected = [[ZCCImageMessageBuilder builderWithImage:testImage] message];
  OCMExpect([self.socket sendImage:expected callback:OCMOCK_ANY timeoutAfter:30.0]).andDo(^(NSInvocation *invocation) {
    __unsafe_unretained ZCCSendImageCallback callback;
    [invocation getArgument:&callback atIndex:3];
    XCTAssertNotNil(callback);
    callback(YES, 32, nil);
  });
  OCMExpect([self.socket sendImageData:expected imageId:32]);

  [self.imageMessageManager sendImage:testImage recipient:nil socket:self.socket];

  OCMVerifyAll(self.socket);
}

// Verify that we resize large images
- (void)testSendImage_resizesImage {
  UIImage *largeImage = [UIImage imageNamed:@"largeImage" inBundle:[NSBundle bundleForClass:[ZCCImageMessageManagerTests class]] compatibleWithTraitCollection:nil];
  XCTAssertNotNil(largeImage);

  BOOL (^verifyImageMessage)(ZCCImageMessage *) = ^(ZCCImageMessage *message) {
    XCTAssertEqual(message.imageType, ZCCImageTypeJPEG);
    if (message.imageType != ZCCImageTypeJPEG) {
      return NO;
    }
    XCTAssertTrue(message.contentLength <= 524288);
    if (message.contentLength > 524288) { // 512k
      return NO;
    }
    XCTAssertEqual(message.width, 1280);
    if (message.width != 1280) {
      return NO;
    }
    XCTAssertEqual(message.height, 800);
    if (message.height != 800) {
      return NO;
    }
    XCTAssertNil(message.recipient);
    if (message.recipient) {
      return NO;
    }
    return YES;
  };

  OCMExpect([self.socket sendImage:[OCMArg checkWithBlock:verifyImageMessage] callback:OCMOCK_ANY timeoutAfter:30.0]).andDo(^(NSInvocation *invocation) {
    __unsafe_unretained ZCCSendImageCallback callback;
    [invocation getArgument:&callback atIndex:3];
    XCTAssertNotNil(callback);
    callback(YES, 55, nil);
  });
  OCMExpect([self.socket sendImageData:[OCMArg checkWithBlock:verifyImageMessage] imageId:55]);

  [self.imageMessageManager sendImage:largeImage recipient:nil socket:self.socket];

  OCMVerifyAll(self.socket);
}

// TODO: Verify that we properly handle errors

// Verify that we manage cache cleanup
- (void)testIncomingImageCleanup {
  self.imageMessageManager.cleanupOlderThan = 0.5;
  self.imageMessageManager.minimumCleanupInterval = 0.0;

  ZCCImageHeader *header = [[ZCCImageHeader alloc] init];
  header.imageId = 123;
  [self.imageMessageManager handleImageHeader:header];
  usleep(100);
  XCTAssertEqual(self.imageMessageManager.incomingImages.count, 1);

  // Wait for timeout
  usleep((useconds_t)(0.6 * (double)USEC_PER_SEC));
  XCTAssertEqual(self.imageMessageManager.incomingImages.count, 0);
}

// Verify that we clean up the cache after receiving an image
- (void)testHandleImageData_fullSizeImage_cleansUpIncomingImages {
  ZCCImageHeader *header = [[ZCCImageHeader alloc] init];
  header.imageId = 123;
  [self.imageMessageManager handleImageHeader:header];
  usleep(100);
  XCTAssertEqual(self.imageMessageManager.incomingImages.count, 1);

  UIImage *image = solidImage(UIColor.redColor, CGSizeMake(100.0f, 100.0f), 1.0f);
  NSData *imageData = UIImageJPEGRepresentation(image, 0.75f);
  [self.imageMessageManager handleImageData:imageData imageId:123 isThumbnail:NO];
  usleep(100);
  XCTAssertEqual(self.imageMessageManager.incomingImages.count, 0);
}

// Verify that we throw out thumbnails after we receive a low memory warning
- (void)testLowMemoryImageCleanup {
  ZCCImageHeader *header = [[ZCCImageHeader alloc] init];
  header.imageId = 123;
  [self.imageMessageManager handleImageHeader:header];
  usleep(100);
  XCTAssertEqual(self.imageMessageManager.incomingImages.count, 1);

  UIImage *thumbmnail = solidImage(UIColor.redColor, CGSizeMake(90.0f, 90.0f), 1.0f);
  NSData *thumbnailData = UIImageJPEGRepresentation(thumbmnail, 0.75f);
  [self.imageMessageManager handleImageData:thumbnailData imageId:123 isThumbnail:YES];
  usleep(100);
  XCTAssertNotNil(self.imageMessageManager.incomingImages[@(123)].thumbnail);

  [NSNotificationCenter.defaultCenter postNotificationName:UIApplicationDidReceiveMemoryWarningNotification object:nil];
  usleep(100);
  XCTAssertNotNil(self.imageMessageManager.incomingImages[@(123)]);
  XCTAssertNil(self.imageMessageManager.incomingImages[@(123)].thumbnail);
}

@end
