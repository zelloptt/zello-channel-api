//
//  ZCCAudioHelper.h
//  sdk
//
//  Created by Alexey Gavrilov on 12/7/17.
//  Copyright © 2018 Zello. All rights reserved.
//

#import <Foundation/Foundation.h>
#import "ZCCWeakReference.h"

@protocol ZCCInterruptableAudioEndpoint <NSObject>
- (void)onAudioInterruption;
- (void)onAudioInterruptionEnded;
@end

@interface ZCCAudioHelper : NSObject

+ (ZCCAudioHelper *)instance;
- (BOOL)activateAudio:(BOOL)activate;
- (NSString *)getAudioCategory;
- (BOOL)micAvailable;
- (void)setAudioCategoryPlay;
- (void)setAudioCategoryPlayAndRecord;
- (ZCCWeakReference<id<ZCCInterruptableAudioEndpoint>> *)registerAudioEndpoint:(id<ZCCInterruptableAudioEndpoint>)endpoint;

@property (atomic) BOOL smartAudioSession;
@property (atomic) BOOL enableBluetooth;
@property (atomic, readonly) BOOL canRecord;
@property (atomic, readonly) BOOL speakerActive;
@property (atomic) BOOL playbackWasInterrupted;
@property (atomic) NSRunLoop *audioRunLoop;

@end
