//
//  Zello.m
//  ZelloChannelDemo
//
//  Created by Greg Cooksey on 2/23/18.
//  Copyright © 2018 Zello. All rights reserved.
//

#import "Zello.h"

static ZCCSession *_session;

@implementation Zello

+ (ZCCSession *)session {
  return _session;
}

+ (void)setupSessionWithURL:(NSURL *)url channel:(NSString *)channel username:(NSString *)username password:(NSString *)password {
  // authToken is required for connecting to Friends & Family Zello, but should be nil for Zello Work
  _session = [[ZCCSession alloc] initWithURL:url authToken:nil username:username password:password channel:channel callbackQueue:nil];
}

+ (void)closeSession {
  [_session disconnect];
  _session = nil;
}

@end
