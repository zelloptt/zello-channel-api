//
//  ZCCWebSocketFactory.m
//  ZelloChannelKit
//
//  Created by Greg Cooksey on 3/26/18.
//  Copyright © 2018 Zello. All rights reserved.
//

#import "ZCCWebSocketFactory.h"
#import "ZCCSRWebSocket.h"

@implementation ZCCWebSocketFactory

- (instancetype)init {
  self = [super init];
  if (self) {
    _createWebSocket = ^(NSURL *url) {
      return [[ZCCSRWebSocket alloc] initWithURL:url];
    };
  }
  return self;
}

- (ZCCSRWebSocket *)socketWithURL:(NSURL *)url {
  return self.createWebSocket(url);
}

@end
