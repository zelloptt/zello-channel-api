//
//  AppDelegate.m
//  demo
//
//  Created by Jim Pickering on 12/4/17.
//  Copyright © 2020 Zello. All rights reserved.
//

@import AVFoundation;
#import "AppDelegate.h"

@interface AppDelegate () <AVAudioPlayerDelegate>

// We use an audio player playing silence to keep the system from suspending the app while we're
// in the background, waiting for incoming messages
@property (nonatomic, strong) AVAudioPlayer *silencePlayer;

@end

@implementation AppDelegate


- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions {
  // Override point for customization after application launch.

  // Create and start the silence player. We'll just leave it running; it doesn't interfere with
  // playing or sending messages.
  NSError *error = nil;
  self.silencePlayer = [[AVAudioPlayer alloc] initWithContentsOfURL:[NSBundle.mainBundle URLForResource:@"silence1s" withExtension:@"mp3"] error:&error];
  if (!self.silencePlayer) {
    NSLog(@"Error initializing audio player: %@", error);
  }
  self.silencePlayer.volume = 0.0;
  self.silencePlayer.numberOfLoops = -1; // Loop indefinitely
  [self.silencePlayer play];
  return YES;
}

- (void)applicationWillResignActive:(UIApplication *)application {
  // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
  // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
}


- (void)applicationDidEnterBackground:(UIApplication *)application {
  // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
  // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.

  // The SDK sets the audio session category to PlayAndRecord. It needs to just be Playback to play
  // audio in the background. When the app returns to the foreground, the SDK will set it to
  // PlayAndRecord again the next time we send a message.
  NSError *error = nil;
  if (![AVAudioSession.sharedInstance setCategory:AVAudioSessionCategoryPlayback error:&error]) {
    NSLog(@"%s error setting audio category: %@", __PRETTY_FUNCTION__, error);
  }

}


- (void)applicationWillEnterForeground:(UIApplication *)application {
  // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
}


- (void)applicationDidBecomeActive:(UIApplication *)application {
  // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
}


- (void)applicationWillTerminate:(UIApplication *)application {
  // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
}

@end
