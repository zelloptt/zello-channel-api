//
//  ZCCAudioHelper.m
//  sdk
//
//  Created by Alexey Gavrilov on 12/7/17.
//  Copyright © 2018 Zello. All rights reserved.
//

#import <AVFoundation/AVFoundation.h>
#import "ZCCAudioHelper.h"
#import "ZCCQueueRunner.h"

#define AUDIO_ENDPOINT_TIMEOUT 60 /*seconds*/

@interface ZCCAudioHelper ()
@property (atomic, strong) NSString *currentCategory;
@property (atomic) BOOL audioSessionIsActive;
@property (atomic) BOOL configurationChange;
@property (atomic) BOOL letAllowedAudioOverrideSpeaker;
@property ZCCQueueRunner *runner;
@property (nonatomic, readonly) NSMutableArray<ZCCWeakReference<id<ZCCInterruptableAudioEndpoint>> *> *audioEndpoints;
@property (atomic) BOOL initializing;
@property (nonatomic) NSThread *audioThread;
@end

@implementation ZCCAudioHelper

+ (ZCCAudioHelper *)instance {
  static ZCCAudioHelper *helper = nil;
  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{
    helper = [[ZCCAudioHelper alloc] init];
  });
  return helper;
}

- (id)init {
  if (self = [super init]) {
    _canRecord = YES;
    _speakerActive = NO;
    _smartAudioSession = NO;
    _audioEndpoints = [NSMutableArray array];
    self.initializing = YES;
    self.runner = [[ZCCQueueRunner alloc] init];
    self.currentCategory = @"";
    self.audioSessionIsActive = NO;
    self.configurationChange = NO;
    self.letAllowedAudioOverrideSpeaker = YES;
    [self initAudioSession];

    [[NSNotificationCenter defaultCenter] addObserver:self
                                             selector:@selector(audioSessionInterrupted:)
                                                 name:AVAudioSessionInterruptionNotification
                                               object:nil];
    self.initializing = NO;
    [self startAudioThread];
  }
  return self;
}

- (void)audioSessionInterrupted:(NSNotification *)notification {
  NSDictionary *interruptionDictionary = [notification userInfo];
  NSNumber *interruptionType = (NSNumber *)[interruptionDictionary valueForKey:AVAudioSessionInterruptionTypeKey];
  if ([interruptionType intValue] == AVAudioSessionInterruptionTypeBegan) {
    [self suspendAudio];
  } else if ([interruptionType intValue] == AVAudioSessionInterruptionTypeEnded) {
    [self restoreAudio];
  }
}

- (void)suspendAudio {
  [self.runner runAsync: ^{
    self.playbackWasInterrupted = YES;
    [self notifyAudioEndpointsAboutAudioInterruption];
    if (self.smartAudioSession) {
      [self activateAudio:NO];
    }
  }];
}

- (void)restoreAudio {
  [self.runner runAsync: ^{
    if (!self.playbackWasInterrupted) {
      return;
    }

    self.playbackWasInterrupted = NO;

    [self notifyAudioEndpointsAboutAudioInterruptionEnded];
  }];
}

- (void)returnFromBackground {
  [self restoreAudio];
}

- (void)initAudioSession {
  [self setAudioCategoryWithRecord:YES checkOptions:YES];
}

- (BOOL)activateAudio:(BOOL)activate {
  NSError *nsError = nil;
  if (activate) {
    if (![[AVAudioSession sharedInstance] setPreferredIOBufferDuration:0.010 error:&nsError]) {
      // TODO: Should we inform the user of this error?
      NSLog(@"[ZCC]-> setPreferredIOBufferDuration Failed: %@ <-", nsError);
    }
  }

  self.audioSessionIsActive = activate;
  return [[AVAudioSession sharedInstance] setActive:activate error:&nsError];;
}

- (NSString *)getAudioCategory {
  return [AVAudioSession sharedInstance].category;
}

- (void)setAudioCategoryPlay {
  [self setAudioCategoryWithRecord:NO checkOptions:NO];
}

- (void)setAudioCategoryPlayAndRecord {
  [self setAudioCategoryWithRecord:YES checkOptions:NO];
}

- (void)setAudioCategoryWithRecord:(BOOL)enableRecord checkOptions:(BOOL)checkOptions {
  NSString *category = AVAudioSessionCategoryPlayback;
  NSError *nsError = nil;

  self.currentCategory = [AVAudioSession sharedInstance].category;
  _canRecord = [self micAvailable];

  if (_canRecord && enableRecord) {
    category = AVAudioSessionCategoryPlayAndRecord;
  }

  if ([category compare:self.currentCategory] == NSOrderedSame && !checkOptions) {
    return;
  }

  self.currentCategory = category;

  if (![[AVAudioSession sharedInstance] setCategory:category
                                        withOptions:[self getSessionCategoryOptions]
                                              error:&nsError]) {

    // TODO: Should we inform the user of this error?
    NSLog(@"[ZCC]-> Failed to set audio category %@", nsError);
  }
}

- (AVAudioSessionCategoryOptions)getSessionCategoryOptions {
  AVAudioSessionCategoryOptions sessionCategoryOptions = AVAudioSessionCategoryOptionDefaultToSpeaker;

  if (self.enableBluetooth) {
    sessionCategoryOptions |= AVAudioSessionCategoryOptionAllowBluetooth;
  }

  sessionCategoryOptions |= AVAudioSessionCategoryOptionMixWithOthers;
  sessionCategoryOptions |= AVAudioSessionCategoryOptionDuckOthers;

  return sessionCategoryOptions;
}

- (BOOL)micAvailable {
  return [AVAudioSession  sharedInstance].inputAvailable;
}

#pragma mark - Audio endpoints

// AudioQueue callback sometimes come seconds after the queue wass stopped and object deallocated
// NotificationCenter notifications also sometimes come after we unsubscribed from them and deallocated
// In both cases, which are very rare, the app crashes.
// To get around it we keep an array of weak references to player/recorder for at least AUDIO_ENDPOINT_TIMEOUT
// (currently 60 seconds) after it the objects were deallocated.

- (ZCCWeakReference<id<ZCCInterruptableAudioEndpoint>> *)registerAudioEndpoint:(id<ZCCInterruptableAudioEndpoint>)endpoint {
  ZCCWeakReference *endpointRef = [ZCCWeakReference weakReferenceToObject:endpoint];
  [self.runner runAsync:^{
    if (![self.audioEndpoints containsObject:endpointRef]) {
      [self.audioEndpoints addObject:endpointRef];
    }
    [self purgeReleasedAudioEndpoints];
  }];
  return endpointRef;
}

// Must be called from self.runner queue
- (void)purgeReleasedAudioEndpoints {
  NSMutableArray *toRemove = [NSMutableArray array];
  NSTimeInterval now = [NSDate timeIntervalSinceReferenceDate];
  for (ZCCWeakReference *ref in self.audioEndpoints) {
    if (!ref.obj && (now - ref.timestamp > AUDIO_ENDPOINT_TIMEOUT)) {
      [toRemove addObject:ref];
    }
  }

  if (toRemove.count > 0) {
    [self.audioEndpoints removeObjectsInArray:toRemove];
  }
}

- (void)notifyAudioEndpointsAboutAudioInterruption {
  [self.runner runAsync:^{
    for (ZCCWeakReference<id<ZCCInterruptableAudioEndpoint>> *ref in self.audioEndpoints) {
      id<ZCCInterruptableAudioEndpoint> object = ref.obj;
      if (object && [object conformsToProtocol:@protocol(ZCCInterruptableAudioEndpoint)]) {
        [object onAudioInterruption];
      }
    }
  }];
}

- (void)notifyAudioEndpointsAboutAudioInterruptionEnded {
  [self.runner runAsync:^{
    for (ZCCWeakReference<id<ZCCInterruptableAudioEndpoint>> *ref in self.audioEndpoints) {
      id<ZCCInterruptableAudioEndpoint> object = ref.obj;
      if (object && [object conformsToProtocol:@protocol(ZCCInterruptableAudioEndpoint)]) {
        [object onAudioInterruptionEnded];
      }
    }
  }];
}

#pragma mark - Audio run loop

- (void)startAudioThread {
  if (self.audioThread) {
    return;
  }
  self.audioThread = [[NSThread alloc] initWithTarget:self
                                             selector:@selector(audioThreadRunloop)
                                               object:nil];
  [self.audioThread start];
}

- (void)audioThreadRunloop {
  @autoreleasepool {
    self.audioRunLoop = [NSRunLoop currentRunLoop];
    // We can't run the run loop unless it has an associated input source or a timer.
    // So we'll just create a timer that will never fire - unless the server runs for a decades.
    [NSTimer scheduledTimerWithTimeInterval:[[NSDate distantFuture] timeIntervalSinceNow]
                                     target:self
                                   selector:@selector(startAudioThread)
                                   userInfo:nil
                                    repeats:YES];

    [[NSRunLoop currentRunLoop] run];
  }
}


@end
