//
//  ZCCPermissionsManager.h
//  ZelloChannelKit
//
//  Created by Greg Cooksey on 3/23/18.
//  Copyright © 2018 Zello. All rights reserved.
//

#import <AVFoundation/AVFoundation.h>
#import <Foundation/Foundation.h>

/**
 * This class provides a facade for checking device permissions. Improves testability.
 */
@interface ZCCPermissionsManager : NSObject

/// Returns the current microphone recording permission value
- (AVAudioSessionRecordPermission)recordPermission;

@end
