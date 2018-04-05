//
//  ZCCAudioUtils.m
//  ZelloChannelKit
//
//  Created by Greg Cooksey on 3/12/18.
//  Copyright © 2018 Zello. All rights reserved.
//

#import "ZCCAudioUtils.h"

@implementation ZCCAudioUtils

+ (AudioStreamBasicDescription)audioStreamBasicDescriptionWithChannels:(NSInteger)channels sampleRate:(NSInteger)sampleRate {
  AudioStreamBasicDescription ASBD;
  memset(&ASBD, 0, sizeof(ASBD));
  ASBD.mSampleRate = sampleRate;
  ASBD.mFormatID = kAudioFormatLinearPCM;
  ASBD.mFramesPerPacket = 1; // 1 for uncompressed formats
  ASBD.mChannelsPerFrame = (UInt32)channels;
  ASBD.mBitsPerChannel = 16;
  ASBD.mBytesPerFrame = (UInt32)channels * ASBD.mBitsPerChannel / 8;
  ASBD.mBytesPerPacket = ASBD.mBytesPerFrame;
  ASBD.mFormatFlags = kLinearPCMFormatFlagIsSignedInteger | kAudioFormatFlagIsPacked;
  return ASBD;
}

@end
