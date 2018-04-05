//
//  ZCCRecorder.h
//  Zello
//
//  Created by Alexey Gavrilov on 1/11/12.
//  Copyright © 2018 Zello. All rights reserved.
//

#import <Foundation/Foundation.h>
#import "ZCCAudioHelper.h"
#import "ZCCAudioSource.h"

@interface ZCCRecorder : NSObject<ZCCAudioSource, ZCCInterruptableAudioEndpoint>

@property (atomic, weak) id<ZCCAudioSourceDelegate> delegate;
@property (atomic, readonly) float level;

- (void)prepareWithChannels:(NSUInteger)channels sampleRate:(NSUInteger)sampleRate bufferSampleCount:(NSUInteger)count;
- (void)record;
- (void)stop;

@end
