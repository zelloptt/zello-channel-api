//
//  ZCCEncoderOpus.h
//  Zello
//
//  Created by Jim Pickering on 5/1/13.
//  Copyright © 2018 Zello. All rights reserved.
//

#import <Foundation/Foundation.h>
#import "ZCCEncoder.h"

@protocol ZCCAudioSource;

NS_ASSUME_NONNULL_BEGIN

@interface ZCCEncoderOpus : ZCCEncoder

@property (nonatomic, readonly, class) NSUInteger defaultFramesPerPacket;
@property (nonatomic, readonly, class) NSInteger defaultBitRate;
@property (nonatomic, readonly, class) NSUInteger defaultSampleRate;
@property (nonatomic, readonly, class) NSUInteger defaultChannels;
@property (nonatomic, readonly, class) NSUInteger defaultFrameSize;

- (instancetype)initWithRecorder:(id<ZCCAudioSource>)recorder;

@end

NS_ASSUME_NONNULL_END
