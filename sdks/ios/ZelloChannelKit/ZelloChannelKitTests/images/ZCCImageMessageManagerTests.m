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
#import "ZCCImageMessage.h"
#import "ZCCImageMessageManager.h"
#import "ZCCImageUtils.h"
#import "ZCCSocket.h"

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

@end
