//
//  ZCCPermissionsManager.m
//  ZelloChannelKit
//
//  Created by Greg Cooksey on 3/23/18.
//  Copyright © 2018 Zello. All rights reserved.
//

#import "ZCCPermissionsManager.h"

@implementation ZCCPermissionsManager

- (AVAudioSessionRecordPermission)recordPermission {
  return [[AVAudioSession sharedInstance] recordPermission];
}

@end
