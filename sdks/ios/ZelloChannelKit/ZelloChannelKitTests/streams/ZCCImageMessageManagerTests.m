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
@end

@implementation ZCCImageMessageManagerTests

- (void)setUp {
    // Put setup code here. This method is called before the invocation of each test method in the class.
}

- (void)tearDown {
    // Put teardown code here. This method is called after the invocation of each test method in the class.
}

// Verify that we send images
- (void)testSendImage_sendsImage {
  UIImage *testImage = solidImage(UIColor.redColor, CGSizeMake(400.0f, 400.0f), 1.0);
  ZCCImageMessageManager *manager = [[ZCCImageMessageManager alloc] init];
  ZCCImageMessage *expected = [[ZCCImageMessageBuilder builderWithImage:testImage] message];
  id socket = OCMClassMock([ZCCSocket class]);
  OCMExpect([socket sendImage:expected callback:OCMOCK_ANY timeoutAfter:30.0]).andDo(^(NSInvocation *invocation) {
    __unsafe_unretained ZCCSendImageCallback callback;
    [invocation getArgument:&callback atIndex:3];
    XCTAssertNotNil(callback);
    callback(YES, 32, nil);
  });
  OCMExpect([socket sendImageData:expected imageId:32 timeoutAfter:30.0]);

  [manager sendImage:testImage recipient:nil socket:socket];

  OCMVerifyAll(socket);
}

// TODO: Verify that we properly handle errors

@end
