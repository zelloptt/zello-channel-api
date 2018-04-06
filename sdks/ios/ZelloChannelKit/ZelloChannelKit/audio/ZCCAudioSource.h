//
//  ZCCAudioSource.h
//  ZelloChannelKit
//
//  Created by Greg Cooksey on 3/1/18.
//  Copyright © 2018 Zello. All rights reserved.
//

@protocol ZCCAudioSource;

@protocol ZCCAudioSourceDelegate <NSObject>

/// Called when the recorder has new audio data ready to encode
- (void)audioSource:(id<ZCCAudioSource>)source didProduceData:(NSData *)data;

/// Called after preparing the audio source
- (void)audioSourceDidBecomeReady:(id<ZCCAudioSource>)source;
- (void)audioSourceDidStart:(id<ZCCAudioSource>)source;
- (void)audioSourceDidStop:(id<ZCCAudioSource>)source;
- (void)audioSourceDidEncounterError:(id<ZCCAudioSource>)source;
- (void)audioSourceDidEncounterInitializationError:(id<ZCCAudioSource>)source;

@end

@protocol ZCCAudioSource <NSObject>

@property (atomic, weak) id<ZCCAudioSourceDelegate> delegate;
@property (atomic, readonly) float level;

- (void)prepareWithChannels:(NSUInteger)channels sampleRate:(NSUInteger)sampleRate bufferSampleCount:(NSUInteger)count;
- (void)record;
- (void)stop;

@end
