//
//  Zello.m
//  ZelloChannelDemo
//
//  Created by Greg Cooksey on 2/23/18.
//  Copyright © 2018 Zello. All rights reserved.
//

#import "Zello.h"

static NSString * const developmentToken = @"[YOUR TOKEN HERE]";

static ZCCSession *_session;

@implementation Zello

+ (ZCCSession *)session {
  return _session;
}

+ (void)setupSessionWithURL:(NSURL *)url channel:(NSString *)channel username:(NSString *)username password:(NSString *)password {
  _session = [[ZCCSession alloc] initWithURL:url authToken:developmentToken username:username password:password channel:channel callbackQueue:nil];
}

+ (void)closeSession {
  [_session disconnect];
  _session = nil;
}

@end
