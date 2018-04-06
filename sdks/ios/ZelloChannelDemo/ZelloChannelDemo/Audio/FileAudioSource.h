//
//  FileAudioSource.h
//  ZelloChannelDemo
//
//  Created by Greg Cooksey on 3/8/18.
//  Copyright © 2018 Zello. All rights reserved.
//

@import Foundation;
@import ZelloChannelKit;

@interface FileAudioSource : NSObject <ZCCVoiceSource>

@property (nonatomic, strong, readonly, nonnull) NSURL *audioFileURL;

- (nonnull instancetype)init NS_UNAVAILABLE;

- (nonnull instancetype)initWithURL:(nonnull NSURL *)audioFileURL;

@end
