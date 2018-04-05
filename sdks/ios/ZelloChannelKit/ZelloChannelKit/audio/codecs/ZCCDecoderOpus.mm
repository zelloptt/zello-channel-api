//
//  ZCCDecoderOpus.mm
//  AudioDemo
//
//  Created by Alexey Gavrilov on 1/8/12.
//  Copyright © 2018 Zello. All rights reserved.
//

#import "libopus.h"
#import "ZCCDecoderOpus.h"
#import "ZCCCodec.h"
#import "ZCCErrors.h"
#import "ZCCPlayer.h"

@interface ZCCDecoderOpus () {
  NSInteger _gain;
  short *_outBuffer;
}
@property (atomic) NSInteger framesPerPacket;
@property (atomic) NSInteger frameSize;
@property (atomic) NSInteger counter;
@property (atomic) NSInteger decoderId;
@property (atomic) BOOL decodedLastPacket;
@property (atomic, strong) NSObject *decoderSync;
@end

@implementation ZCCDecoderOpus

- (instancetype)initWithPlayer:(ZCCPlayer *)player {
  self = [super initWithPlayer:player];
  if (self) {
    self.decodedLastPacket = NO;
    self.decoderId = 0;
    self.decoderSync = [[NSObject alloc] init];
    _gain = 0;
    _outBuffer = (short *)malloc(OPUS_MAX_DECODED_PACKET);
  }
  return self;
}

- (void)dealloc {
  @synchronized(self.decoderSync) {
    if (self.decoderId > 0) {
      decoder_opus_nativeStop((int32_t)self.decoderId);
      self.decoderId = 0;
    }
    if (_outBuffer) {
      free(_outBuffer);
      _outBuffer = NULL;
    }
  }
}

- (NSString *)getName {
  // Not used, but appears to exist for symmetry with ZCCEncoder
  return ZCCCodecNameOpus;
}

- (ZCCCodecType)getId {
  // Not used, but appears to exist for symmetry with ZCCEncoder
  return ZCCCodecTypeOpus;
}

- (void)setPacketDuration:(NSUInteger)count {
  // Do nothing
}

- (void)prepareAsync:(NSData *)header withPlaybackAmplifierGain:(NSInteger)gainIn {
  NSInteger sampleRate = 0;

  @synchronized(self.decoderSync) {
    self.started = YES;
    _gain = gainIn;
    self.decoderId = decoder_opus_nativeStart((unsigned char *)[header bytes], (int32_t)[header length]);
    if (self.decoderId <= 0) {
      NSError *error = [NSError errorWithDomain:ZCCErrorDomain code:ZCCErrorCodeDecoderOpus userInfo:nil];
      [self.delegate decoder:self didEncounterError:error];
      return;
    }
    decoder_opus_nativeSetGain((int32_t)self.decoderId, (int32_t)_gain);
    sampleRate = decoder_opus_nativeGetSampleRate((int32_t)self.decoderId);
    self.framesPerPacket = decoder_opus_nativeGetFramesInPacket((int32_t)self.decoderId);
    self.frameSize = decoder_opus_nativeGetFrameSize((int32_t)self.decoderId);
  }
  [self.player prepareWith:1 sampleRate:sampleRate bitsPerSample:16 packetDuration:self.frameSize * self.framesPerPacket];
}

- (NSData *)dataForReceiver:(ZCCPlayer *)player {
  NSData *data = nil;

  id<ZCCDecoderDelegate> delegate = self.delegate;
  while (self.started && data == nil) {
    data = [delegate dataForDecoder:self];

    if (data == nil || (NSNull *)data == [NSNull null]) {
      return nil;
    }

    if (data == [ZCCPlayer stopCookie]) {
      // Grab the last decoded packet (if any)
      if (!self.decodedLastPacket) {
        self.decodedLastPacket = YES;
        NSInteger decoded = 0;
        @synchronized(self.decoderSync) {
          if (self.decoderId > 0) {
            decoded = decoder_opus_nativeDecode((int32_t)self.decoderId, nil, 0, _outBuffer);
            if (decoded > 0) {
              return [NSData dataWithBytesNoCopy:_outBuffer length:(NSUInteger)decoded * 2 freeWhenDone:NO];
            }
          }
        }
      }
      return data;
    }
    if (data.length == 0) {
      return nil;
    }
    if (data.length == 1 && data == [self getMissingPacket]) {
      // Lost packet
      data = nil;
      if (self.counter == 0) {
        // Don't make use of compensation packets until at least
        // one valid packet is received
        continue;
      }
      // OPUS decoder generates compensation data when it
      // receives null packet
      return [self PLCDataForReceiver:player];
    }
  }
  if (!self.started) {
    return nil;
  }
  ++self.counter;
  @try {
    NSInteger decoded = 0;
    @synchronized(self.decoderSync) {
      if (self.decoderId > 0) {
        decoded = decoder_opus_nativeDecode((int32_t)self.decoderId, (unsigned char *)[data bytes], (int32_t)data.length, _outBuffer);
        if (decoded > 0) {
          return [NSData dataWithBytesNoCopy:_outBuffer length:(NSUInteger)decoded * 2 freeWhenDone:NO];
        }
      }
    }
  } @catch (NSException *e) {
    // What throws exceptions to here? -dataWithBytesNoCopy:length:freeWhenDone: isn't documented to...
    NSDictionary *info = @{ZCCExceptionKey:e};
    NSError *error = [NSError errorWithDomain:ZCCErrorDomain code:ZCCErrorCodeDecoderUnknown userInfo:info];
    [delegate decoder:self didEncounterError:error];
  }

  return nil;
}

- (NSData *)PLCDataForReceiver:(ZCCPlayer *)player {
  @try {
    NSInteger decoded = 0;
    @synchronized(self.decoderSync) {
      if (self.decoderId > 0) {
        decoded = decoder_opus_nativeDecode((int32_t)self.decoderId, NULL, 0, _outBuffer);
        if (decoded > 0) {
          return [NSData dataWithBytesNoCopy:_outBuffer length:(NSUInteger)decoded * 2 freeWhenDone:NO];
        }
      }
    }
  } @catch (NSException *e) {
    // What throws exceptions to here? -dataWithBytesNoCopy:length:freeWhenDone: isn't documented to...
    NSDictionary *info = @{ZCCExceptionKey:e};
    NSError *error = [NSError errorWithDomain:ZCCErrorDomain code:ZCCErrorCodeDecoderUnknown userInfo:info];
    [self.delegate decoder:self didEncounterError:error];
  }
  return nil;
}

- (void)setGain:(NSInteger)gain {
  @synchronized(self.decoderSync) {
    if (gain > 40) {
      gain = 40;
    }
    if (gain < -40) {
      gain = -40;
    }
    if (gain != _gain) {
      _gain = gain;
      if (self.decoderId > 0) {
        decoder_opus_nativeSetGain((int32_t)self.decoderId, (int32_t)_gain);
      }
    }
  }
}

@end
