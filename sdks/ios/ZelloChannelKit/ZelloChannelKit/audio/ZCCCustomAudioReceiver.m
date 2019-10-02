//
//  ZCCCustomAudioReceiver.m
//  ZelloChannelKit
//
//  Created by Greg Cooksey on 3/6/18.
//  Copyright © 2018 Zello. All rights reserved.
//

#import "ZCCCustomAudioReceiver.h"
#import "ZCCAudioUtils.h"
#import "ZCCErrors.h"
#import "ZCCIncomingVoiceConfiguration.h"
#import "ZCCPlayer.h"
#import "ZCCQueueRunner.h"

@interface ZCCCustomAudioReceiver () <ZCCAudioReceiverDelegate>
@property (nonatomic, strong) ZCCQueueRunner *runner;
// Stream owns us, so we only keep a weak reference
@property (nonatomic, weak, readonly) ZCCIncomingVoiceStream *stream;
@property (nonatomic, strong) id<ZCCVoiceReceiver> receiver;
@property (nonatomic) BOOL passThroughToSpeaker;
@property (nonatomic, strong) ZCCPlayer *passThroughPlayer;

@property (nonatomic) BOOL prepared;
@property (nonatomic) BOOL stopped;
@property (atomic) BOOL paused;
@property (nonatomic) BOOL readLoopRunning;
@end

@implementation ZCCCustomAudioReceiver {
  BOOL _paused;
  NSInteger _volume;
  NSTimeInterval _currentTime;
  float _level;
  BOOL _overloaded;
}
@synthesize delegate = _delegate;

- (instancetype)initWithConfiguration:(ZCCIncomingVoiceConfiguration *)configuration stream:(ZCCIncomingVoiceStream *)stream {
  self = [super init];
  if (self) {
    _runner = [[ZCCQueueRunner alloc] initWithName:@"ZCCCustomAudioReceiver"];
    _stream = stream;
    _receiver = configuration.receiver;
    _passThroughToSpeaker = configuration.playThroughSpeaker;
  }
  return self;
}

#pragma mark - Properties
// We can't use synthesized properties
- (NSTimeInterval)currentTime {
  __block NSTimeInterval currentTime;
  [self.runner runSync:^{
    if (self.passThroughPlayer) {
      currentTime = self.passThroughPlayer.currentTime;
    } else {
      currentTime = self->_currentTime;
    }
  }];
  return currentTime;
}

- (float)level {
  __block float level;
  [self.runner runSync:^{
    if (self.passThroughPlayer) {
      level = self.passThroughPlayer.level;
    } else {
      level = self->_level;
    }
  }];
  return level;
}

- (BOOL)overloaded {
  __block BOOL overloaded;
  [self.runner runSync:^{
    if (self.passThroughPlayer) {
      overloaded = self.passThroughPlayer.overloaded;
    } else {
      overloaded = self->_overloaded;
    }
  }];
  return overloaded;
}

- (BOOL)paused {
  __block BOOL paused;
  [self.runner runSync:^{
    if (self.passThroughPlayer) {
      paused = self.passThroughPlayer.paused;
    } else {
      paused = self->_paused;
    }
  }];
  return paused;
}

- (void)setPaused:(BOOL)paused {
  [self.runner runSync:^{
    self->_paused = paused;
  }];
}

- (NSInteger)volume {
  __block NSInteger volume;
  [self.runner runSync:^{
    if (self.passThroughPlayer) {
      volume = self.passThroughPlayer.volume;
    } else {
      volume = self->_volume;
    }
  }];
  return volume;
}

- (void)setVolume:(NSInteger)volume {
  [self.runner runSync:^{
    if (self.passThroughPlayer) {
      self.passThroughPlayer.volume = volume;
    } else {
      self->_volume = volume;
    }
  }];
}

#pragma mark - ZCCPlayer

- (void)prepareWith:(NSInteger)channels sampleRate:(NSInteger)sampleRate bitsPerSample:(NSInteger)bps packetDuration:(NSInteger)duration {
  [self.runner runAsync:^{
    ZCCIncomingVoiceStream *stream = self.stream;
    if (!stream) {
      return;
    }

    AudioStreamBasicDescription description = [ZCCAudioUtils audioStreamBasicDescriptionWithChannels:channels sampleRate:sampleRate];
    [self.receiver prepareWithAudioDescription:description stream:stream];
    self.prepared = YES;

    // If we have a pass-through player, set it up and defer readiness to it
    if (self.passThroughToSpeaker) {
      self.passThroughPlayer = [[ZCCPlayer alloc] init];
      self.passThroughPlayer.delegate = self;
      // Property passthrough crashes in dispatch_sync if we use separate QueueRunners
      self.runner = [self.passThroughPlayer runner];
      [self.passThroughPlayer prepareWith:channels sampleRate:sampleRate bitsPerSample:bps packetDuration:duration];
      return; // Don't report ready; we will report in the ZCCAudioReceiverDelegate callback
    }
    [self.delegate receiverDidBecomeReady:self];
  }];
}

- (void)play {
  [self.runner runAsync:^{
    // If we have a pass-through player, start it and defer readiness to it
    if (self.passThroughPlayer) {
      [self.passThroughPlayer play];
      return; // We'll pass audio as we play it
    }

    self.readLoopRunning = YES;
    [self startReadingAudio];

    [self.delegate receiverDidStartPlayback:self];
  }];
}

- (void)startReadingAudio {
  [self.runner runAsync:^{
    self.readLoopRunning = NO;
    if (self.stopped || self.paused) {
      return;
    }
    ZCCIncomingVoiceStream *stream = self.stream;
    if (!stream) {
      return;
    }

    NSData *audio = [self.delegate dataForReceiver:self];
    if (!audio) {
      // Delay until the next run loop
      // TODO: Wait for a more data ready event
      self.readLoopRunning = YES;
      [self startReadingAudio];
      return;
    }
    if ([audio isEqualToData:ZCCPlayer.stopCookie]) {
      [self stopImpl];
    }

    // Decoder layer reuses the buffer it passes us. We need to copy to make sure we don't overwrite
    // the buffer before the receiver gets the data.
    [self.receiver receiveAudio:[audio copy] stream:stream];
    self.readLoopRunning = YES;
    [self startReadingAudio];
  }];
}

- (void)stop {
  [self.runner runAsync:^{
    if (self.passThroughPlayer) {
      [self.passThroughPlayer stop];
      return;
    }

    [self stopImpl];
  }];
}

/// @warning Only call from QueueRunner
- (void)stopImpl {
  self.stopped = YES;
  ZCCIncomingVoiceStream *stream = self.stream;
  if (stream) {
    [self.receiver stopReceivingAudio:stream];
  }
  [self.delegate receiverDidEndPlayback:self];
}

- (void)pause {
  [self.runner runAsync:^{
    if (self.passThroughPlayer) {
      [self.passThroughPlayer pause];
      return;
    }

    // Just set the paused flag. The decoder read loop will exit when it notices the flag.
    self.paused = YES;
  }];
}

- (void)resume {
  [self.runner runAsync:^{
    if (self.passThroughPlayer) {
      [self.passThroughPlayer resume];
      return;
    }

    self.paused = NO;
    if (!self.readLoopRunning) {
      self.readLoopRunning = YES;
      [self startReadingAudio];
    }
  }];
}

#pragma mark - ZCCPlayerDelegate

- (NSData *)dataForReceiver:(id<ZCCAudioReceiver>)player {
  NSData *audio = [self.delegate dataForReceiver:self];
  if (audio && ![audio isEqualToData:ZCCPlayer.stopCookie]) {
    [self.receiver receiveAudio:[audio copy] stream:self.stream];
  }
  return audio;
}

- (NSData *)PLCDataForReceiver:(id<ZCCAudioReceiver>)player {
  return [self.delegate PLCDataForReceiver:self];
}

- (void)receiverDidBecomeReady:(id<ZCCAudioReceiver>)player {
  [self.delegate receiverDidBecomeReady:self];
}

- (void)receiverDidStartPlayback:(id<ZCCAudioReceiver>)player {
  [self.delegate receiverDidStartPlayback:self];
}

- (void)receiverDidEndPlayback:(id<ZCCAudioReceiver>)player {
  ZCCIncomingVoiceStream *stream = self.stream;
  if (stream) {
    [self.receiver stopReceivingAudio:stream];
  }
  [self.delegate receiverDidEndPlayback:self];
}

- (void)receiver:(id<ZCCAudioReceiver>)player didEncounterError:(NSError *)playerError {
  ZCCIncomingVoiceStream *stream = self.stream;
  if (stream) {
    [self.receiver stopReceivingAudio:stream];
  }

  [self.delegate receiver:self didEncounterError:playerError];
}

@end
