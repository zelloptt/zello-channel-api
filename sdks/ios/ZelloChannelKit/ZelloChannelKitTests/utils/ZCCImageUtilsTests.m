//
//  ZCCImageUtilsTests.m
//  ZelloChannelKitTests
//
//  Created by Greg Cooksey on 9/5/19.
//  Copyright © 2019 Zello. All rights reserved.
//

#import <XCTest/XCTest.h>

#import "ImageUtilities.h"
#import "ZCCImageUtils.h"

@interface ZCCImageUtilsTests : XCTestCase

@end

@implementation ZCCImageUtilsTests

// Verify that we don't resize an image that's already below max size
- (void)testResizeImage_BelowMaxSize_ReturnsSameImage {
  UIImage *test = solidImage(UIColor.redColor, CGSizeMake(300.0f, 300.0f), 2.0);
  UIImage *resized = [ZCCImageUtils resizeImage:test maxSize:CGSizeMake(1000.0f, 1000.0f) ignoringScreenScale:YES];
  XCTAssertEqualObjects(test, resized);
}

// Verify that we resize an image to fit in the max size and maintain aspect ratio
- (void)testResizeImage_ResizesAndKeepsAspectRatio {
  UIImage *test = solidImage(UIColor.redColor, CGSizeMake(400.0f, 400.0f), 2.0);
  UIImage *resized = [ZCCImageUtils resizeImage:test maxSize:CGSizeMake(200.0f, 200.0f) ignoringScreenScale:YES];
  XCTAssertTrue(CGSizeEqualToSize(resized.size, CGSizeMake(200.0f, 200.0f)));

  test = solidImage(UIColor.redColor, CGSizeMake(400.0f, 200.0f), 2.0);
  resized = [ZCCImageUtils resizeImage:test maxSize:CGSizeMake(200.0f, 200.0f) ignoringScreenScale:YES];
  XCTAssertTrue(CGSizeEqualToSize(resized.size, CGSizeMake(200.0f, 100.0f)));

  test = solidImage(UIColor.redColor, CGSizeMake(100.0f, 400.0f), 2.0);
  resized = [ZCCImageUtils resizeImage:test maxSize:CGSizeMake(200.0f, 200.0f) ignoringScreenScale:YES];
  XCTAssertTrue(CGSizeEqualToSize(resized.size, CGSizeMake(50.0f, 200.0f)));
}

@end
