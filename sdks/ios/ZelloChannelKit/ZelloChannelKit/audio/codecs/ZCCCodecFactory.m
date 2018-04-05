//
//  ZCCCodecFactory.m
//  LoudtalksLite
//
//  Created by JAMES PICKERING on 12/2/11.
//  Copyright © 2018 Zello. All rights reserved.
//

#import "ZCCCodecFactory.h"
#import "ZCCCustomAudioReceiver.h"
#import "ZCCCustomAudioSource.h"
#import "ZCCDecoderOpus.h"
#import "ZCCEncoderOpus.h"
#import "ZCCIncomingVoiceConfiguration.h"
#import "ZCCOutgoingVoiceConfiguration.h"
#import "ZCCOutgoingVoiceStream.h"
#import "ZCCPlayer.h"
#import "ZCCRecorder.h"

@implementation ZCCCodecFactory

+ (instancetype)instance {
  static ZCCCodecFactory *factory = nil;
  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{
    factory = [[ZCCCodecFactory alloc] init];
  });
  return factory;
}

- (ZCCEncoder *)createEncoderWithConfiguration:(ZCCOutgoingVoiceConfiguration *)configuration stream:(ZCCOutgoingVoiceStream *)stream {
  return [self createEncoderWithRank:ZCCConnectionRank3G configuration:configuration stream:stream];
}

- (ZCCEncoder *)createEncoderWithRank:(ZCCConnectionRank)rank configuration:(ZCCOutgoingVoiceConfiguration *)configuration stream:(ZCCOutgoingVoiceStream *)stream {
  id<ZCCAudioSource> recorder;
  if (configuration) {
    recorder = [[ZCCCustomAudioSource alloc] initWithConfiguration:configuration stream:stream];
  } else {
    recorder = [[ZCCRecorder alloc] init];
  }
  ZCCEncoderOpus *encoder = [[ZCCEncoderOpus alloc] initWithRecorder:recorder];
  encoder.framesPerPacket = [ZCCCodecFactory opusFramesPerPacketForConnection:rank];
  encoder.frameSize = [ZCCCodecFactory opusFrameSizeForConnection:rank];
  if (configuration) {
    encoder.sampleRate = configuration.sampleRate;
  } else {
    encoder.sampleRate = [ZCCCodecFactory opusSampleRateForConnection:rank];
  }
  encoder.bitrate = [ZCCCodecFactory opusBitrateForConnection:rank];
  return encoder;
}

- (ZCCDecoder *)createDecoderWithConfiguration:(ZCCIncomingVoiceConfiguration *)configuration stream:(ZCCIncomingVoiceStream *)stream {
  id<ZCCAudioReceiver> player;
  if (configuration) {
    player = [[ZCCCustomAudioReceiver alloc] initWithConfiguration:configuration stream:stream];
  } else {
    player = [[ZCCPlayer alloc] init];
  }
  ZCCDecoderOpus *decoder = [[ZCCDecoderOpus alloc] initWithPlayer:player];
  decoder.volume = [ZCCCodecFactory getAudioVolume];
  return decoder;
}

+ (NSUInteger)opusFramesPerPacketForConnection:(ZCCConnectionRank)rank {
  return ZCCEncoderOpus.defaultFramesPerPacket;
}

+ (NSUInteger)opusFrameSizeForConnection:(ZCCConnectionRank)rank {
  return ZCCEncoderOpus.defaultFrameSize;
}

+ (NSUInteger)opusSampleRateForConnection:(ZCCConnectionRank)rank {
  switch (rank) {
    case ZCCConnectionRankLAN:
      return 24000;

    case ZCCConnectionRankWiFi:
    case ZCCConnectionRank4G:
    case ZCCConnectionRank3G:
      return 16000;

    case ZCCConnectionRankGPRS:
      return 8000;
  }
}

+ (NSInteger)opusBitrateForConnection:(ZCCConnectionRank)rank {
  return ZCCEncoderOpus.defaultBitRate;
}

+ (NSInteger)getAudioVolume {
  return 100;
}

@end
