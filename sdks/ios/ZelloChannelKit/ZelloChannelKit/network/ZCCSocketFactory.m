//
//  ZCCSocketFactory.m
//  ZelloChannelKit
//
//  Created by Greg Cooksey on 3/22/18.
//  Copyright © 2018 Zello. All rights reserved.
//

#import "ZCCSocketFactory.h"
#import "ZCCSocket.h"

@implementation ZCCSocketFactory

- (instancetype)init {
  self = [super init];
  if (self) {
    _createSocketWithURL = ^(NSURL *url) {
      return [[ZCCSocket alloc] initWithURL:url];
    };
  }
  return self;
}

- (ZCCSocket *)socketWithURL:(NSURL *)url {
  return self.createSocketWithURL(url);
}

@end
