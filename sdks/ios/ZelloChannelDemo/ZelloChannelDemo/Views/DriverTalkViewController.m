//
//  DriverTalkViewController.m
//  demo
//
//  Created by Jim Pickering on 12/7/17.
//  Copyright © 2018 Zello. All rights reserved.
//

@import AudioToolbox;
@import CoreLocation;
@import ZelloChannelKit;

#import "DriverTalkViewController.h"
#import "FileAudioSource.h"
#import "common.h"
#import "Zello.h"

// Car honk sound (honk.wav) recorded by Mike Koenig, used under Creative Commons Attribution 3.0 license
// https://creativecommons.org/licenses/by/3.0/legalcode
// Sourced from http://soundbible.com/583-Horn-Honk.html

@interface DriverTalkViewController () <CLLocationManagerDelegate, ZCCSessionDelegate>
@property (nonatomic, strong) IBOutlet UIButton *buttonNavigate;
@property (nonatomic, strong) IBOutlet UIButton *buttonDetail;
@property (nonatomic, strong) IBOutlet UILabel *labelTitle;
@property (nonatomic, strong) IBOutlet UILabel *labelDetail;
@property (nonatomic, strong) IBOutlet UILabel *labelHeaderTitle;
@property (nonatomic, strong) IBOutlet UILabel *labelHeaderDetail;
@property (nonatomic, strong) IBOutlet UIImageView *imageViewAvatar;
@property (atomic, strong) NSTimer *safetyTimer;

@property (nonatomic, weak) IBOutlet UIButton *honkButton;

@property (nonatomic, strong) CLLocationManager *locationManager;
/// Whether the user is waiting on us to send their location when we finish getting authorization
@property (nonatomic) BOOL pendingSendLocation;
@end

@implementation DriverTalkViewController

- (void)viewDidLoad {
  [super viewDidLoad];
  
  self.buttonDetail.layer.borderWidth = 1.0;
  self.buttonDetail.layer.borderColor = RGBA(0, 0, 0, 0.05f).CGColor;
  self.buttonDetail.layer.cornerRadius = 4.0f;
  [self.buttonDetail setTitleColor:RGB(53.0f, 60.0f, 69.0f) forState:UIControlStateNormal];
  
  [self.navigationController.navigationBar setBarStyle:UIBarStyleDefault];

  self.honkButton.layer.cornerRadius = 8.0f;
  self.honkButton.layer.masksToBounds = YES;
  self.honkButton.backgroundColor = kDefaultWhiteBackground;

}

- (void)viewWillDisappear:(BOOL)animated {
  [super viewWillDisappear:animated];
  [self.navigationController.navigationBar setBarStyle:UIBarStyleBlack];
}

#pragma mark - Actions

- (IBAction)honkTapped:(id)sender {
  ZCCOutgoingVoiceConfiguration *config = [[ZCCOutgoingVoiceConfiguration alloc] init];
  NSURL *honkURL = [[NSBundle mainBundle] URLForResource:@"honk" withExtension:@"wav"];
  config.source = [[FileAudioSource alloc] initWithURL:honkURL];
  [Zello.session startVoiceMessageWithSource:config];
}

- (IBAction)sendLocation {
  CLAuthorizationStatus authorization = [CLLocationManager authorizationStatus];
  if (authorization == kCLAuthorizationStatusNotDetermined) {
    // Request location permission
    if (!self.locationManager) {
      self.locationManager = [[CLLocationManager alloc] init];
      self.locationManager.delegate = self;
    }
    self.pendingSendLocation = YES;
    [self.locationManager requestWhenInUseAuthorization];
  } else if (authorization == kCLAuthorizationStatusAuthorizedAlways || authorization == kCLAuthorizationStatusAuthorizedWhenInUse) {
    [Zello.session sendLocationWithContinuation:nil];
  }
}

#pragma mark - CLLocationManagerDelegate

- (void)locationManager:(CLLocationManager *)manager didChangeAuthorizationStatus:(CLAuthorizationStatus)status {
  if (status == kCLAuthorizationStatusAuthorizedWhenInUse || status == kCLAuthorizationStatusAuthorizedAlways) {
    if (self.pendingSendLocation) {
      [Zello.session sendLocationWithContinuation:nil];
      self.pendingSendLocation = NO;
    }
  }
}

#pragma mark - ZCCSessionDelegate

- (void)sessionDidDisconnect:(ZCCSession *)session {
  [self setButtonNormal];
  [self.navigationController.navigationBar setBarStyle:UIBarStyleBlack];
  [self.navigationController popViewControllerAnimated:YES];
}

- (void)session:(ZCCSession *)session outgoingVoice:(ZCCOutgoingVoiceStream *)stream didEncounterError:(NSError *)error {
  [self onButtonTalkUp:self];
}

- (void)session:(ZCCSession *)session outgoingVoice:(nonnull ZCCOutgoingVoiceStream *)stream didUpdateProgress:(NSTimeInterval)position {
  NSLog(@"Voice played for %f seconds", position);
}

- (void)session:(ZCCSession *)session incomingVoiceDidStart:(ZCCIncomingVoiceStream *)stream {
  [self setButtonReceiving];
}

- (void)session:(ZCCSession *)session incomingVoiceDidStop:(ZCCIncomingVoiceStream *)stream {
  [self setButtonNormal];
}

@end
