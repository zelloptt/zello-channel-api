//
//  ZCCAudioUtils.h
//  ZelloChannelKit
//
//  Created by Greg Cooksey on 3/12/18.
//  Copyright © 2018 Zello. All rights reserved.
//

#import <CoreAudio/CoreAudioTypes.h>
#import <Foundation/Foundation.h>

@interface ZCCAudioUtils : NSObject

+ (AudioStreamBasicDescription)audioStreamBasicDescriptionWithChannels:(NSInteger)numChannels sampleRate:(NSInteger)sampleRate;

@end
