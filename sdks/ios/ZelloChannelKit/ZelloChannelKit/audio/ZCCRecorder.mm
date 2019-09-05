//
//  ZCCRecorder.m
//  Zello
//
//  Created by Alexey Gavrilov on 1/11/12.
//  Copyright © 2018 Zello. All rights reserved.
//
#import <AudioToolbox/AudioToolbox.h>
#import <AVFoundation/AVFoundation.h>
#import "ZCCRecorder.h"
#import "ZCCAudioUtils.h"
#import "ZCCQueueRunner.h"
#import "ZCCWeakReference.h"

#define kNumberBuffers 3

@interface ZCCRecorder ()
@property (atomic) BOOL prepared;
@property (atomic) BOOL stopped;
@property (atomic) BOOL started;
@property (atomic) BOOL shouldStop;
@property (atomic) NSInteger countDown;
@property (atomic) NSUInteger bufferSize;
@property (atomic) NSUInteger queueBufferSize;
@property (atomic) NSUInteger volatile offset;
@property (atomic) NSUInteger nChannels;
@property (atomic) NSUInteger totalRecorded;
@property (atomic) NSUInteger totalSent;

/// Weak self reference, used in the audio queue callbacks
@property (atomic, strong) ZCCWeakReference<id<ZCCInterruptableAudioEndpoint>> *selfRef;

@property (atomic, strong) ZCCQueueRunner *runner;

- (void)handleInputBuffer:(AudioQueueRef)inAQ buffer:(AudioQueueBufferRef)inBuffer;
- (void)handleQueueStopped:(AudioQueueRef)inAQ;
- (void)handleQueueStarted:(AudioQueueRef)inAQ;
- (void)flush;
@end

static void AQInputBufferHandler(void *inUserData, AudioQueueRef inAQ, AudioQueueBufferRef inBuffer, const AudioTimeStamp *inStartTime, UInt32 inNumPackets, const AudioStreamPacketDescription *inPacketDesc) {
  inUserData = (void *)CFRetain(inUserData);
  id r = (__bridge id)inUserData;
  if ([r isKindOfClass:[ZCCWeakReference class]]) {
    ZCCRecorder *recorder = ((ZCCWeakReference *)r).obj;
    [recorder handleInputBuffer:inAQ buffer:inBuffer];
  }
  CFRelease(inUserData);
}

static void AQInputPropertyChangedHandler(void *inUserData, AudioQueueRef inAQ, AudioQueuePropertyID inID) {
  NSLog(@"[ZCC] AQInputPropertyChangedHandler changed: [inAQ %zd] ", (NSInteger)inAQ);
  inUserData = (void *)CFRetain(inUserData);
  id r = (__bridge id)inUserData;
  if (inID == kAudioQueueProperty_IsRunning) {
    UInt32 isRunning;
    UInt32 size = sizeof(isRunning);
    OSStatus error = AudioQueueGetProperty(inAQ, kAudioQueueProperty_IsRunning, &isRunning, &size);
    if (!error) {
      ZCCRecorder *recorder = nil;
      if ([r isKindOfClass:[ZCCWeakReference class]]) {
        recorder = ((ZCCWeakReference *)r).obj;
      }
      if (isRunning) {
        [recorder handleQueueStarted:inAQ];
      } else {
        AudioQueueRemovePropertyListener(inAQ, kAudioQueueProperty_IsRunning, AQInputPropertyChangedHandler, inUserData);
        [recorder handleQueueStopped:inAQ];
      }
    }
  }
  CFRelease(inUserData);
}

@implementation ZCCRecorder {
  AudioQueueRef _queue;
  AudioQueueBufferRef _buffers[kNumberBuffers];
  AudioStreamBasicDescription _streamDescription;
  AudioQueueLevelMeterState *_levels;
  unsigned char *_buffer;
}

- (instancetype)init {
  self = [super init];
  if (self) {
    _prepared = NO;
    _stopped = NO;
    _runner = [[ZCCQueueRunner alloc] initWithName:@"Recorder"];
    _selfRef = [[ZCCAudioHelper instance] registerAudioEndpoint:self];
  }
  return self;
}

- (void)dealloc {
  [_runner runSync:^{
    if (self->_started && !self->_stopped) {
      AudioQueueRemovePropertyListener(self->_queue, kAudioQueueProperty_IsRunning, AQInputPropertyChangedHandler, (__bridge void *)self->_selfRef);
      self->_stopped = YES;
      [self->_delegate audioSourceDidStop:self];
    }
    if (self->_queue) {
      AudioQueueReset(self->_queue);
      AudioQueueDispose(self->_queue, true);
      self->_queue = NULL;
    }
    if (self->_buffer != NULL) {
      free(self->_buffer);
      self->_buffer = NULL;
    }
    if (self->_levels != NULL) {
      free(self->_levels);
      self->_levels = NULL;
    }
  }];
}

- (void)handleInputBuffer:(AudioQueueRef)inAQ buffer:(AudioQueueBufferRef)inBuffer {
  [self.runner runAsync:^{
    if (!self.prepared || self.stopped) {
      return;
    }

    /// Means we were already deallocated
    if (self->_buffer == NULL) {
      return;
    }

    if (inBuffer->mAudioDataByteSize > 0) {
      self.totalRecorded += inBuffer->mAudioDataByteSize;

      memcpy(self->_buffer + self.offset, inBuffer->mAudioData, inBuffer->mAudioDataByteSize);
      self.offset += inBuffer->mAudioDataByteSize;

      if (self.offset >= self.bufferSize) {
        [self.delegate audioSource:self didProduceData:[NSData dataWithBytes:self->_buffer length:(NSUInteger)self.bufferSize]];
        self.totalSent += self.bufferSize;
        self.offset -= self.bufferSize;
        if (self.offset > 0) {
          memcpy(self->_buffer, self->_buffer + self.bufferSize, (size_t)self.offset);
        }
      }
    }
    // Re-use buffer
    if (!self.shouldStop) {
      AudioQueueEnqueueBuffer(inAQ, inBuffer, 0, NULL);
    }
  }];
}

- (void)handleQueueStopped:(AudioQueueRef)inAQ {
  [self.runner runAsync:^{
    if (!self.stopped) {
      self.stopped = YES;
      self.started = NO;
      [self flush];
      [self.delegate audioSourceDidStop:self];
      if ([ZCCAudioHelper instance].smartAudioSession) {
        [[ZCCAudioHelper instance] activateAudio:NO];
      }
    }
  }];
}

- (void)handleQueueStarted:(AudioQueueRef)inAQ {
  [self.runner runAsync:^{
    if (!self.stopped && !self.started) {
      self.countDown = kNumberBuffers + 1;
      [self.delegate audioSourceDidStart:self];
      self.started = YES;
    }
  }];
}

- (void)onAudioInterruption {
  if (self.started) {
    [self handleQueueStopped:_queue];
  }
}

- (void)onAudioInterruptionEnded {
}

- (void)prepareWithChannels:(NSUInteger)channels sampleRate:(NSUInteger)sampleRate bufferSampleCount:(NSUInteger)count {
  [self.runner runAsync:^{
    if (self.prepared) {
      return;
    }
    self->_streamDescription = [ZCCAudioUtils audioStreamBasicDescriptionWithChannels:(NSInteger)channels sampleRate:(NSInteger)sampleRate];

    self.nChannels = channels;
    self->_levels = (AudioQueueLevelMeterState *)malloc(channels * sizeof(AudioQueueLevelMeterState));
    self.bufferSize = self->_streamDescription.mBytesPerFrame * count;
    self.queueBufferSize = MAX(80u, self.bufferSize / 4);

    self->_buffer = (unsigned char *)malloc(2 * self.bufferSize);
    self.offset = 0;
    self.totalSent = 0;
    self.totalRecorded = 0;

    NSRunLoop *rl = [ZCCAudioHelper instance].audioRunLoop;
    OSStatus error = AudioQueueNewInput(&self->_streamDescription, AQInputBufferHandler, (__bridge void *)self.selfRef,
                                        rl.getCFRunLoop, kCFRunLoopCommonModes, 0, &self->_queue);

    id<ZCCAudioSourceDelegate> delegate = self.delegate;
    if (error) {
      [delegate audioSourceDidEncounterInitializationError:self];
      return;
    }

    UInt32 set = 1;
    AudioQueueSetProperty(self->_queue, kAudioQueueProperty_EnableLevelMetering, &set, sizeof(set));

    error = AudioQueueAddPropertyListener(self->_queue, kAudioQueueProperty_IsRunning, AQInputPropertyChangedHandler, (__bridge void *)self.selfRef);
    if (error != noErr) {
      [delegate audioSourceDidEncounterInitializationError:self];
      return;
    }

    for (NSInteger i = 0; i < kNumberBuffers; ++i) {
      AudioQueueAllocateBuffer(self->_queue, (UInt32)self.queueBufferSize, &self->_buffers[i]);
      AudioQueueEnqueueBuffer(self->_queue, self->_buffers[i], 0, NULL);
    }
    self.prepared = YES;

    [delegate audioSourceDidBecomeReady:self];
  }];
}

- (void)record {
  [self.runner runAsync:^{
    if (!self.prepared) {
      return;
    }

    [[ZCCAudioHelper instance] activateAudio:YES];

    self.started = NO;
    self.stopped = NO;
    self.shouldStop = NO;
    OSStatus error = AudioQueueStart(self->_queue, NULL);
    if (error) {
      NSString *category = [[ZCCAudioHelper instance] getAudioCategory];
       if ([category compare:AVAudioSessionCategoryPlayAndRecord] != NSOrderedSame) {
        [[ZCCAudioHelper instance] setAudioCategoryPlayAndRecord];
      }
      error = AudioQueueStart(self->_queue, NULL);
      if (error) {
        self.stopped = YES;
        [self.delegate audioSourceDidEncounterError:self];
      }
    }
  }];
}

- (void)stop {
  [self.runner runAsync:^{
    if (!self.prepared) {
      return;
    }

    if (self.stopped) {
      return;
    }

    self.shouldStop = YES;
    AudioQueueFlush(self->_queue);
    AudioQueueStop(self->_queue, false);
    // Handle the case when we stop before we started
    if (!self.started) {
      self.stopped = YES;
      [self.delegate audioSourceDidStop:self];
    }
  }];
}

// Must be called on self.runner queue
- (void)flush {
  if (self.offset > 0) {
    // zero ending bytes
    if (_buffer != NULL) {
      memset(_buffer + self.offset, 0, self.bufferSize - self.offset);
      [self.delegate audioSource:self didProduceData:[NSData dataWithBytes:_buffer length:self.bufferSize]];
      self.totalSent += self.bufferSize;
      self.offset = 0;
    }
  }
}

- (float)level {
  __block NSNumber *res = @ - 100.0;

  [self.runner runSync:^{
    if (self->_queue == NULL || self.stopped) {
      return;
    }
    UInt32 data_sz = (UInt32)self.nChannels * sizeof(AudioQueueLevelMeterState);
    OSStatus status = AudioQueueGetProperty(self->_queue, kAudioQueueProperty_CurrentLevelMeterDB, self->_levels, &data_sz);
    if (status) {
      return;
    }
    float maxPower = -100.0;
    for (NSUInteger i = 0; i < self.nChannels; ++i) {
      maxPower = MAX(maxPower, (float)self->_levels[i].mAveragePower);
    }
    res = [NSNumber numberWithFloat:maxPower];
  }];
  return [res floatValue];
}

@end
