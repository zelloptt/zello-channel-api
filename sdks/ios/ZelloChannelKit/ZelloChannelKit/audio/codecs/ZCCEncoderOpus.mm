//
//  ZCCEncoderOpus.m
//  Zello
//
//  Created by Jim Pickering on 5/1/13.
//  Copyright © 2018 Zello. All rights reserved.
//

#import "libopus.h"
#import "ZCCEncoderOpus.h"
#import "ZCCAudioSource.h"
#import "ZCCCodec.h"

@interface ZCCEncoderOpus ()
@property (atomic) NSInteger gainInternal;
@property (atomic) NSInteger encoderId;
@property (atomic, strong) NSObject *encoderSync;
@end

@implementation ZCCEncoderOpus
@synthesize sampleRate;

+ (NSUInteger)defaultFramesPerPacket {
  return 1;
}

+ (NSInteger)defaultBitRate {
  return -1;
}

+ (NSUInteger)defaultSampleRate {
  return 8000;
}

+ (NSUInteger)defaultChannels {
  return 1;
}

+ (NSUInteger)defaultFrameSize {
  return 60;
}

- (instancetype)initWithRecorder:(id<ZCCAudioSource>)recorder {
  self = [super init];
  if (self) {
    self.recorder = recorder;
    self.recorder.delegate = self;
    self.sampleRate = ZCCEncoderOpus.defaultSampleRate;
    self.framesPerPacket = ZCCEncoderOpus.defaultFramesPerPacket;
    self.bitrate = ZCCEncoderOpus.defaultBitRate;
    self.gainInternal = 0;
    self.frameSize = ZCCEncoderOpus.defaultFrameSize;
    self.encoderId = 0;
    self.encoderSync = [[NSObject alloc] init];
  }
  return self;
}

- (NSString *)getName {
  return ZCCCodecNameOpus;
}

- (ZCCCodecType)getId {
  return ZCCCodecTypeOpus;
}

- (void)setSampleRate:(NSUInteger)sr {
  if (sr == 8000 || sr == 16000 || sr == 24000 || sr == 32000) {
    sampleRate = sr;
  }
}

- (NSData *)getHeader {
  int len = 0;
  unsigned char *header = (unsigned char *)malloc(20);

  @synchronized(self.encoderSync) {
    len = encoder_opus_nativeGetHeader((int32_t)self.sampleRate, (int32_t)self.framesPerPacket, (int32_t)self.frameSize, header);
  }
  if (len > 0) {
    return [NSData dataWithBytesNoCopy:header length:(NSUInteger)len freeWhenDone:YES];
  } else {
    free(header);
    return nil;
  }
}

- (void)prepareAsync:(NSInteger)ampGain {
  [self setGain:ampGain];
  // Opus repacketizer only allows packets of up to 120 ms duration
  NSUInteger maxFramesInPacket = MAX(1u, 120 / self.frameSize);
  if (self.framesPerPacket > maxFramesInPacket) {
    self.framesPerPacket = maxFramesInPacket;
  }

  @synchronized(self.encoderSync) {
    self.encoderId = encoder_opus_nativeStart((int32_t)self.sampleRate, (int32_t)self.framesPerPacket, (int32_t)self.frameSize, (int32_t)self.bitrate, (int32_t)self.gainInternal);
    if (self.encoderId <= 0) {
      [self.delegate encoderDidEncounterError:self];
      return;
    }
  }

  [self.recorder prepareWithChannels:ZCCEncoderOpus.defaultChannels sampleRate:self.sampleRate bufferSampleCount:[self getBufferSampleCount]];
}

- (void)start {
  [super start];
  [self.recorder record];
}

- (void)stop {
  [self.recorder stop];
  [super stop];
}

- (float)getLevel {
  return self.recorder.level + self.gainInternal;
}

- (void)setGain:(NSInteger)gainIn {
  if (gainIn > 40) {
    gainIn = 40;
  }
  if (gainIn < -40) {
    gainIn = -40;
  }
  self.gainInternal = gainIn;
}

- (NSUInteger)getBufferSampleCount {
  return (self.sampleRate * self.framesPerPacket * [self getFrameDuration]) / 1000;
}

- (NSUInteger)getFrameDuration {
  return self.frameSize; // Doesn't work for 2.5 ms frames, but we intentionally don't support 2.5 ms frames
}

#pragma mark - ZCCRecorderDelegate

- (void)audioSource:(id<ZCCAudioSource>)source didProduceData:(NSData *)data {
  NSInteger outlen = 0;
  unsigned char *temp = (unsigned char *)malloc(OPUS_MAX_ENCODED_PACKET);
  @synchronized(self.encoderSync) {
    if (self.encoderId <= 0) {
      if (temp) {
        free(temp);
      }
      return;
    }
    outlen = encoder_opus_nativeEncode((int32_t)self.encoderId, (short *)[data bytes], (int32_t)data.length / 2, temp, (int32_t)self.gainInternal);
  }
  id<ZCCEncoderDelegate> delegate = self.delegate;
  if (outlen > 0) {
    [delegate encoder:self didProduceData:[NSData dataWithBytes:temp length:(NSUInteger)outlen]];
  } else {
    [delegate encoderDidEncounterError:self];
  }
  if (temp) {
    free(temp);
  }
}

- (void)audioSourceDidStop:(id<ZCCAudioSource>)source {
  unsigned char *temp = (unsigned char *)malloc(OPUS_MAX_ENCODED_PACKET);
  NSInteger tail = 0;

  @synchronized(self.encoderSync) {
    if (self.encoderId > 0) {
      tail = encoder_opus_nativeStop((int32_t)self.encoderId, temp);
      self.encoderId = 0;
    }
  }
  if (tail > 0) {
    [self.delegate encoder:self didProduceData:[NSData dataWithBytes:temp length:(NSUInteger)tail]];
  }
  if (temp) {
    free(temp);
  }
  [super audioSourceDidStop:source];
}

@end
