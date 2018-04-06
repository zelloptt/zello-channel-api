//
//  ZCCCustomAudioSource.m
//  ZelloChannelKit
//
//  Created by Greg Cooksey on 3/1/18.
//  Copyright © 2018 Zello. All rights reserved.
//

#import "ZCCCustomAudioSource.h"
#import "ZCCCustomAudioSourceReceiver.h"
#import "ZCCOutgoingVoiceConfiguration.h"

@interface ZCCCustomAudioSource ()

@property (nonatomic, strong, nonnull) id<ZCCVoiceSource> source;
@property (nonatomic, strong, nullable) ZCCCustomAudioSourceReceiver *receiver;
// Stream owns this object
@property (nonatomic, weak, nullable) ZCCOutgoingVoiceStream *stream;

@property (nonatomic) NSUInteger sampleRate;

/// The number of bytes of audio data the encoder expects to get at a time
@property (nonatomic) NSUInteger delegateBufferLength;

@property (nonatomic, strong) NSMutableData *buffer;

@end

@implementation ZCCCustomAudioSource

@synthesize delegate;
@synthesize level;

- (instancetype)initWithConfiguration:(ZCCOutgoingVoiceConfiguration *)configuration stream:(ZCCOutgoingVoiceStream *)stream {
  self = [super initWithName:@"ZCCCustomAudioSource"];
  if (self) {
    _source = configuration.source;
    _stream = stream;
    _buffer = [[NSMutableData alloc] init];
  }
  return self;
}

- (void)voiceSourceDidProvideAudio:(NSData *)audioData {
  NSData *audio = [audioData copy]; // Defensive copy
  [self runAsync:^{
    [self.buffer appendData:audio];
    while (self.buffer.length >= self.delegateBufferLength) {
      NSRange bufferRange = NSMakeRange(0, self.delegateBufferLength);
      NSData *toSend = [self.buffer subdataWithRange:bufferRange];
      [self.buffer replaceBytesInRange:bufferRange withBytes:nil length:0];
      [self.delegate audioSource:self didProduceData:toSend];
    }
  }];
}

- (void)voiceSourceDidStop {
  [self runAsync:^{
    if (self.buffer.length > 0) {
      [self.delegate audioSource:self didProduceData:self.buffer];
      self.buffer.length = 0;
    }
  }];
}

#pragma mark - ZCCAudioSource

- (void)prepareWithChannels:(NSUInteger)channels sampleRate:(NSUInteger)sampleRate bufferSampleCount:(NSUInteger)count {
  [self runAsync:^{
    const NSUInteger bytesPerSample = 2;
    self.sampleRate = sampleRate;
    self.delegateBufferLength = count * channels * bytesPerSample;
    [self.delegate audioSourceDidBecomeReady:self];
  }];
}

- (void)record {
  [self runAsync:^{
    ZCCOutgoingVoiceStream *stream = self.stream;
    if (!stream) {
      // If the stream has gone away, this object is stale
      return;
    }

    self.receiver = [[ZCCCustomAudioSourceReceiver alloc] initWithSource:self];
    [self.source startProvidingAudio:self.receiver sampleRate:self.sampleRate stream:stream];
    [self.delegate audioSourceDidStart:self];
  }];
}

- (void)stop {
  [self runAsync:^{
    [self.source stopProvidingAudio:self.receiver];
    [self.delegate audioSourceDidStop:self];
  }];
}

@end
