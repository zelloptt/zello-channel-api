//
//  TalkViewController.m
//  demo
//
//  Created by Jim Pickering on 12/8/17.
//  Copyright © 2018 Zello. All rights reserved.
//

@import AVFoundation;
@import ZelloChannelKit;
#import "TalkViewController.h"
#import "common.h"
#import "Zello.h"

@interface TalkViewController () <MKMapViewDelegate, CLLocationManagerDelegate>
@property (nonatomic, strong) CLLocationManager *locationManager;
@property (nonatomic, weak) ZCCOutgoingVoiceStream *outgoingStream;
@end

@implementation TalkViewController

- (void)viewDidLoad {
  [super viewDidLoad];
  
  self.buttonTalk.layer.cornerRadius = 8.0f;
  self.buttonTalk.layer.masksToBounds = YES;
  
  self.viewDetails.layer.cornerRadius = 8.0f;
  self.viewDetails.layer.masksToBounds = YES;
  self.viewDetails.backgroundColor = kDefaultWhiteBackground;
  
  self.viewHeader.layer.cornerRadius = 8.0f;
  self.viewHeader.layer.masksToBounds = YES;
  self.viewHeader.backgroundColor = kDefaultWhiteBackground;
  
  [self setButtonNormal];
  
  [self.mapView setMapType:MKMapTypeStandard];
  [self.mapView setZoomEnabled:YES];
  [self.mapView setScrollEnabled:YES];
  self.mapView.showsUserLocation = YES;
  self.mapView.delegate = self;
  [self startLocation];
}

- (void)viewDidAppear:(BOOL)animated {
  [super viewDidAppear:animated];

  [[AVAudioSession sharedInstance] requestRecordPermission:^(BOOL granted) {
    // You can tell the user they won't be able to speak without granting microphone access
  }];
}

- (IBAction)onButtonTalkDown:(id)sender {
  [self setButtonSending];
  self.outgoingStream = [Zello.session startVoiceMessage];
  if (!self.outgoingStream) {
    [self setButtonNormal];
  }
}

- (IBAction)onButtonTalkUp:(id)sender {
  [self setButtonNormal];
  [self.outgoingStream stop];
}

- (void)setButtonReceiving {
  self.buttonTalk.backgroundColor = RGB(180, 230, 168);
  [self.buttonTalk setImage:[UIImage imageNamed:@"iconMicReceiving"] forState:UIControlStateNormal];
  [self.buttonTalk setImage:[UIImage imageNamed:@"iconMicReceiving"] forState:UIControlStateHighlighted];
}

- (void)setButtonSending {
  self.buttonTalk.backgroundColor = RGB(230, 218, 225);
  [self.buttonTalk setImage:[UIImage imageNamed:@"iconMicRecording"] forState:UIControlStateNormal];
  [self.buttonTalk setImage:[UIImage imageNamed:@"iconMicRecording"] forState:UIControlStateHighlighted];
}

- (void)setButtonNormal {
  self.buttonTalk.backgroundColor = kDefaultWhiteBackground;
  [self.buttonTalk setImage:[UIImage imageNamed:@"iconMicEnabled"] forState:UIControlStateNormal];
}

- (void)startLocation {
  CLAuthorizationStatus status = [CLLocationManager authorizationStatus];
  if (status == kCLAuthorizationStatusDenied || status == kCLAuthorizationStatusNotDetermined) {
    return NSLog(@"No authorization");;
  } else {
    self.locationManager = [[CLLocationManager alloc] init];
    self.locationManager.delegate = self;
    self.locationManager.desiredAccuracy = kCLLocationAccuracyThreeKilometers;
    if ([[[UIDevice currentDevice] systemVersion] floatValue] >= 8.0) {
      [self.locationManager requestWhenInUseAuthorization];
    }
    [self.locationManager startUpdatingLocation];
  }
}

- (void)mapView:(MKMapView *)mapView didUpdateUserLocation:(MKUserLocation *)userLocation {
  MKCoordinateRegion mapRegion;
  mapRegion.center = mapView.userLocation.coordinate;
  mapRegion.span.latitudeDelta = 0.01;
  mapRegion.span.longitudeDelta = 0.01;
  [self.mapView setRegion:mapRegion animated: NO];
  
  // Just get the location once then stop
  [self.locationManager stopUpdatingLocation];
  self.locationManager = nil;
  
}
@end
