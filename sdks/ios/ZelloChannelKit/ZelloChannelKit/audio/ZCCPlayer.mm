//
//  ZCCPlayer.mm
//  Zello
//
//  Created by Alexey Gavrilov on 1/9/12.
//  Copyright © 2018 Zello. All rights reserved.
//
#import <AudioToolbox/AudioToolbox.h>
#import "ZCCPlayer.h"
#import "ZCCAudioUtils.h"
#import "ZCCErrors.h"
#import "ZCCAudioHelper.h"
#import "ZCCQueueRunner.h"
#import "ZCCWeakReference.h"

#define kNumberBuffers 3
#define OVERLOAD_THRESHOLD 30
#define MAX_BUFFER_DURATION 60 /*ms*/
#define MIN_BUFFER_DURATION 20 /*ms*/

static NSData *stopCookie = [NSData dataWithBytesNoCopy:(char[]){0x1, 0x2, 0x3, 0x4} length:4];

@interface ZCCPlayer ()

@property (atomic) NSUInteger samplesPerPacket;
@property (atomic) NSUInteger bufferSize;
@property (atomic) NSUInteger queueBufferSize;
@property (atomic) NSInteger nChannels;
@property (atomic) NSUInteger totalPlayed;
@property (atomic) NSUInteger missedBuffers;
@property (atomic) NSInteger totalBuffers;
@property (atomic) NSInteger overloadedBuffers;
@property (atomic) NSTimeInterval packetDuration;
@property (atomic) BOOL stopping;
@property (atomic) BOOL prepared;
@property (atomic) BOOL stopped;
@property (atomic) BOOL started;
@property (atomic) BOOL interrupted;
@property (atomic) BOOL forceProcessing;
@property (atomic, strong) ZCCWeakReference<id<ZCCInterruptableAudioEndpoint>> *selfRef;
@property (atomic, strong) ZCCQueueRunner *runner;
@property (atomic) float levelInternal;

- (void)handleBufferCompleteForQueue:(AudioQueueRef)inAQ buffer:(AudioQueueBufferRef)inCompleteAQBuffer;
- (void)handleQueueStopped:(AudioQueueRef)inAQ;
- (void)handleQueueStarted:(AudioQueueRef)inAQ;
@end

static void AQBufferCallback(void *inUserData, AudioQueueRef inAQ, AudioQueueBufferRef inCompleteAQBuffer) {
  UInt32 isRunning;
  UInt32 size = sizeof(isRunning);
  OSStatus error = AudioQueueGetProperty(inAQ, kAudioQueueProperty_IsRunning, &isRunning, &size);

  if (!error && isRunning) {
    inUserData = (void *)CFRetain(inUserData);
    id p = (__bridge id)inUserData;
    if (p && [p isKindOfClass:[ZCCWeakReference class]]) {
      ZCCPlayer *player = ((ZCCWeakReference *)p).obj;
      [player handleBufferCompleteForQueue:inAQ buffer:inCompleteAQBuffer];
    }
    CFRelease(inUserData);
  }
}

static void AQPropertyChangedHandler(void *inUserData, AudioQueueRef inAQ, AudioQueuePropertyID inID) {
  if (inID == kAudioQueueProperty_IsRunning) {
    UInt32 isRunning;
    UInt32 size = sizeof(isRunning);
    OSStatus error = AudioQueueGetProperty(inAQ, kAudioQueueProperty_IsRunning, &isRunning, &size);
    if (!error) {
      inUserData = (void *)CFRetain(inUserData);
      id p = (__bridge id)inUserData;
      if ([p isKindOfClass:[ZCCWeakReference class]]) {
        ZCCPlayer *player = ((ZCCWeakReference *)p).obj;
        if (isRunning) {
          [player handleQueueStarted:inAQ];
        } else {
          AudioQueueRemovePropertyListener(inAQ, kAudioQueueProperty_IsRunning, AQPropertyChangedHandler, inUserData);
          [player handleQueueStopped:inAQ];
        }
      }
      CFRelease(inUserData);
    }
  }
}

@implementation ZCCPlayer {
  AudioQueueBufferRef _buffers[kNumberBuffers];
  AudioQueueLevelMeterState *_levels;
  AudioStreamBasicDescription _streamDescription;
  AudioQueueRef _queue;
  unsigned char *_tailBuffer;
  volatile NSUInteger _tailSize;
  NSInteger _volume;
}

- (id)init {
  self = [super init];
  if (self) {
    // Init all stuff here
    _prepared = NO;
    _stopped = NO;
    _started = NO;
    _stopping = NO;
    _interrupted = NO;
    _volume = 100;
    _runner = [[ZCCQueueRunner alloc] initWithName:@"Player"];
    _selfRef = [[ZCCAudioHelper instance] registerAudioEndpoint:self];
    _levelInternal = -100;
  }
  return self;
}

- (void)dealloc {
  [_runner runSync:^{
    if (_started && !_stopped) {
      AudioQueueRemovePropertyListener(_queue, kAudioQueueProperty_IsRunning, AQPropertyChangedHandler, (__bridge void *)_selfRef);
      [_delegate receiverDidEndPlayback:self];
      _stopped = YES;
    }
    if (_queue) {
      AudioQueueDispose(_queue, true);
      _queue = NULL;
    }
    if (_tailBuffer != NULL) {
      free(_tailBuffer);
      _tailBuffer = NULL;
    }
    if (_levels != NULL) {
      free(_levels);
      _levels = NULL;
    }
  }];
}

- (void)handleBufferCompleteForQueue:(AudioQueueRef)inAQ buffer:(AudioQueueBufferRef)inCompleteAQBuffer {
  [self.runner runAsync:^{
    if (!self.prepared) {
      return;
    }

    id<ZCCAudioReceiverDelegate> delegate = self.delegate;
    if (!delegate) {
      [self stop];
      return;
    }
    
    UInt32 writePos = 0;
    // Use any tail first
    if (_tailSize > 0) {
      NSUInteger actual = MIN(_tailSize, self.queueBufferSize);
      memcpy((unsigned char *)inCompleteAQBuffer->mAudioData, _tailBuffer, (size_t)actual);
      writePos += actual;
      if (actual < _tailSize) {
        _tailSize -= actual;
        // Keep the rest of the tail
        memmove(_tailBuffer, _tailBuffer + actual, (size_t)_tailSize);
      } else {
        _tailSize = 0;
      }
    }
    int retries = 0;
    // Still need more data
    while (writePos < self.queueBufferSize) {
      NSData *data = [delegate dataForReceiver:self];
      // Missing packet
      if (!data || data.length == 0) {
        if (!self.stopping) {
          if (self.totalBuffers > 0) {
            ++self.missedBuffers;
            // Try up to kNumberBuffers - 1 times getting the data
            // Until all audio queue buffers are played the playback won't stutter
            if (retries < kNumberBuffers - 1) {
              ++retries;
              [NSThread sleepForTimeInterval:self.packetDuration / 2];
              continue;
            }
            // Use PLC data if available
            data = [delegate PLCDataForReceiver:self];
          }
          // Play silence
          if (!data || data.length == 0) {
            memset(inCompleteAQBuffer->mAudioData, 0, (size_t)self.queueBufferSize);
            inCompleteAQBuffer->mAudioDataByteSize = (UInt32)self.queueBufferSize;
            AudioQueueEnqueueBuffer(inAQ, inCompleteAQBuffer, 0, NULL);
            return;
          }
        } else {
          return;
        }
      }

      if (data == [ZCCPlayer stopCookie]) {
        if (self.stopping) {
          return;
        }
        [self stop];
        break;
      }

      NSUInteger actual = MIN([data length], (NSUInteger)(self.queueBufferSize - writePos));
      
      // Save the tail
      if (actual < [data length]) {
        _tailSize = [data length] - actual;
        memcpy(_tailBuffer, (unsigned char *)[data bytes] + actual, (size_t)_tailSize);
      }

      memcpy((unsigned char *)inCompleteAQBuffer->mAudioData + writePos, [data bytes], actual);
      writePos += actual;
    }
    if (writePos == 0) {
      return;
    }
    inCompleteAQBuffer->mAudioDataByteSize = writePos;
    AudioQueueEnqueueBuffer(inAQ, inCompleteAQBuffer, 0, NULL);
    
    self.totalBuffers++;
    self.totalPlayed += writePos;
    [self saveLevel];
    if (self.level > -1) {
      self.overloadedBuffers++;
    }
  }];
}

- (void)handleQueueStopped:(AudioQueueRef)inAQ {
  [self.runner runAsync:^{
 #ifdef DEBUG
    if (self.missedBuffers > 0) {
      NSUInteger missedBytes = self.missedBuffers * self.queueBufferSize;
      NSLog(@"[ZCC] Missed %lu buffers (%lu bytes) during playback. It's %f%%",
                 (unsigned long)self.missedBuffers, (unsigned long)missedBytes, 100.0 * ((double)missedBytes) / ((double)(self.totalPlayed + missedBytes)));
    }
#endif
    self.levelInternal = -100;
    if (!self.stopped) {
      [self.delegate receiverDidEndPlayback:self];
      self.stopped = YES;

      if ([ZCCAudioHelper instance].smartAudioSession) {
        [[ZCCAudioHelper instance] activateAudio:NO];
      }
    }
  }];
}

- (void)saveLevel {
  float maxPower = -100.0;
  if (_queue == NULL || self.stopped) {
    return;
  }
  UInt32 data_sz = (UInt32)self.nChannels * sizeof(AudioQueueLevelMeterState);
  OSStatus status = AudioQueueGetProperty(_queue, kAudioQueueProperty_CurrentLevelMeterDB, _levels, &data_sz);
  if (status != noErr) {
    return;
  }
  
  for (NSInteger i = 0; i < self.nChannels; ++i) {
    maxPower = MAX(maxPower, (float)_levels[i].mAveragePower);
  }
  self.levelInternal = maxPower;
}

- (void)handleQueueStarted:(AudioQueueRef)inAQ {
  [self.runner runAsync:^{
    self.started = YES;
    self.stopped = NO;
    [self.delegate receiverDidStartPlayback:self];
  }];
}

- (void)onAudioInterruption {
  if (self.started) {
    [self pause];
    self.interrupted = YES;
  }
}

- (void)onAudioInterruptionEnded {
  if (self.interrupted) {
    [self resume];
    self.interrupted = NO;
  }
}

- (void)prepareWith:(NSInteger)channels sampleRate:(NSInteger)sampleRate bitsPerSample:(NSInteger)bps packetDuration:(NSInteger)duration {
  if ([ZCCAudioHelper instance].smartAudioSession) {
    [[ZCCAudioHelper instance] activateAudio:YES];
  }

  [self.runner runAsync:^{
    if (self.prepared) {
      return;
    }
    self.packetDuration = (double)duration/1000.0;
    _streamDescription = [ZCCAudioUtils audioStreamBasicDescriptionWithChannels:channels sampleRate:sampleRate];

    self.nChannels = channels;
    _levels = (AudioQueueLevelMeterState *)malloc((NSUInteger)channels * sizeof(AudioQueueLevelMeterState));

    NSRunLoop *rl = [ZCCAudioHelper instance].audioRunLoop;
    OSStatus error  = AudioQueueNewOutput(&_streamDescription, AQBufferCallback, (__bridge void *)self.selfRef,
                                          rl.getCFRunLoop, kCFRunLoopCommonModes, 0, &_queue);
    id<ZCCAudioReceiverDelegate> delegate = self.delegate;
    if (error) {
      NSDictionary *info = @{ZCCOSStatusKey:@(error)};
      NSError *playerError = [NSError errorWithDomain:ZCCErrorDomain code:ZCCErrorCodeAudioQueueServices userInfo:info];
      [delegate receiver:self didEncounterError:playerError];
      return;
    }

    UInt32 set = 1;
    AudioQueueSetProperty(_queue, kAudioQueueProperty_EnableLevelMetering, &set, sizeof(set));

    AudioQueueAddPropertyListener(_queue, kAudioQueueProperty_IsRunning, AQPropertyChangedHandler, (__bridge void *)self.selfRef);

    self.samplesPerPacket = (NSUInteger)(sampleRate * self.packetDuration);
    self.bufferSize = 2 * self.samplesPerPacket * _streamDescription.mBytesPerFrame;
    _tailBuffer = (unsigned char *)malloc((size_t)self.bufferSize);
    _tailSize = 0;
    self.totalPlayed = 0;
    self.missedBuffers = 0;
    self.totalBuffers = 0;
    self.overloadedBuffers = 0;
    
    //kAudioQueueProperty_DecodeBufferSizeFrames
    UInt32 decodeBufferInFrames = 0;
    UInt32 outSize = sizeof(decodeBufferInFrames);
    AudioQueueGetProperty(_queue, kAudioQueueProperty_DecodeBufferSizeFrames, &decodeBufferInFrames, &outSize);

    NSInteger bufferDuration = MIN(MAX_BUFFER_DURATION, duration / 2);
    bufferDuration = MAX(MIN_BUFFER_DURATION, bufferDuration);
    
    self.queueBufferSize = (NSUInteger)(sampleRate * (NSInteger)_streamDescription.mBytesPerFrame * bufferDuration / 1000);

    for (NSInteger i = 0; i < kNumberBuffers; ++i) {
      error = AudioQueueAllocateBuffer(_queue, (UInt32)self.queueBufferSize, &_buffers[i]);
      if (error) {
        NSDictionary *info = @{ZCCOSStatusKey:@(error)};
        NSError *playerError = [NSError errorWithDomain:ZCCErrorDomain code:ZCCErrorCodeAudioQueueServices userInfo:info];
        [delegate receiver:self didEncounterError:playerError];
        return;
      }
    }
    self.stopping = NO;
    self.prepared = YES;
    // This may block
    for (NSInteger i = 0; i < kNumberBuffers; ++i) {
      [self handleBufferCompleteForQueue:_queue buffer:_buffers[i]];
    }
    [delegate receiverDidBecomeReady:self];
  }];
}

- (void)play {
  [self.runner runAsync:^{
    id<ZCCAudioReceiverDelegate> delegate = self.delegate;
    if (!self.prepared || self.stopping) {
      if (self.stopping) {
        [delegate receiverDidEndPlayback:self];
      }
      return;
    }
    if ([ZCCAudioHelper instance].smartAudioSession) {
      [[ZCCAudioHelper instance] activateAudio:YES];
    }
    self.stopped = NO;

    OSStatus error = AudioQueueStart(_queue, NULL);
    if (error) {
      if ([[ZCCAudioHelper instance] activateAudio:YES]) {
        error = AudioQueueStart(_queue, NULL);
      }
      if (error) {
        self.stopped = YES;
        NSDictionary *info = @{ZCCOSStatusKey:@(error)};
        NSError *playerError = [NSError errorWithDomain:ZCCErrorDomain code:ZCCErrorCodeAudioQueueServices userInfo:info];
        [delegate receiver:self didEncounterError:playerError];
      }
    }
  }];
}

- (void)stop {
  [self.runner runAsync:^{
    if (!self.prepared || _queue == NULL) {
      return;
    }
    if (self.stopping) {
      return;
    }
    self.stopping = YES;
    AudioQueueStop(_queue, false);
  }];
}

- (void)pause {
  [self.runner runAsync:^{
    if (!self.prepared || _queue == NULL) {
      return;
    }
    _paused = YES;
    AudioQueuePause(_queue);

    if ([ZCCAudioHelper instance].smartAudioSession) {
      [[ZCCAudioHelper instance] activateAudio:NO];
    }
  }];
}

- (void)resume {
  [self.runner runAsync:^{
    if (!self.prepared || _queue == NULL) {
      return;
    }

    if ([ZCCAudioHelper instance].smartAudioSession) {
      [[ZCCAudioHelper instance] activateAudio:YES];
    }
    self.stopped = NO;
    OSStatus error = AudioQueueStart(_queue, NULL);
    if (error) {

      if ([[ZCCAudioHelper instance] activateAudio:YES]) {
        error = AudioQueueStart(_queue, NULL);
      }
      if (error) {
        self.stopped = YES;
        NSDictionary *info = @{ZCCOSStatusKey:@(error)};
        NSError *playerError = [NSError errorWithDomain:ZCCErrorDomain code:ZCCErrorCodeAudioQueueServices userInfo:info];
        [self.delegate receiver:self didEncounterError:playerError];
      }
    }
  }];
}

- (void)setVolume:(NSInteger)vol {
  [self.runner runAsync:^{
    _volume = vol;
    if (!self.prepared || _queue == NULL) {
      return;
    }
    AudioQueueSetParameter(_queue, kAudioQueueParam_Volume, (float)_volume / 100.0f);
  }];
}

- (NSInteger)volume {
  [self.runner runSync:^{
    if (_queue == NULL) {
      return;
    }
    AudioQueueParameterValue res = 0;
    AudioQueueGetParameter(_queue, kAudioQueueParam_Volume, &res);
    _volume = (NSInteger)roundf(100 * res);
  }];
  return _volume;
}



- (NSTimeInterval)currentTime {
  __block double res = 0;
  [self.runner runSync:^{
    if (_queue == NULL || self.stopped) {
      return;
    }
    AudioTimeStamp ts;
    OSStatus error = AudioQueueGetCurrentTime(_queue, NULL, &ts, NULL);
    if (error || _streamDescription.mSampleRate == 0) {
      return;
    }
    res = ts.mSampleTime / _streamDescription.mSampleRate;
  }];
  return res;
}

- (float)level {
  return self.levelInternal;
}

- (BOOL)overloaded {
  return self.totalBuffers > 10 && self.totalBuffers * OVERLOAD_THRESHOLD < self.overloadedBuffers * 100;
}

+ (NSData *)stopCookie {
  return stopCookie;
}

@end
