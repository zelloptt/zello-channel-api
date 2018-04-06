//
//  EncoderListener.h
//  LoudtalksLite
//
//  Created by JAMES PICKERING on 11/28/11.
//  Copyright (c) 2011 None. All rights reserved.
//

#import <Foundation/Foundation.h>

@protocol EncoderListener <NSObject>

- (void)onEncoderData:(NSData *)data;
- (void)onEncoderReady;
- (void)onEncoderStart;
- (void)onEncoderStop;
- (void)onEncoderError;

@end
