//
//  RiderViewController.m
//  demo
//
//  Created by Jim Pickering on 12/5/17.
//  Copyright © 2018 Zello. All rights reserved.
//

@import ZelloChannelKit;

#import "RiderTalkViewController.h"
#import "common.h"
#import "Zello.h"

@interface DriverLocationAnnotation : NSObject <MKAnnotation>
@property (nonatomic, readonly, nonnull) NSString *driver;
@property (nonatomic, readonly, nonnull) ZCCLocationInfo *location;
- (instancetype)initWithDriver:(NSString *)driverName locationInfo:(ZCCLocationInfo *)location;
@end

@implementation DriverLocationAnnotation

- (instancetype)initWithDriver:(NSString *)driverName locationInfo:(ZCCLocationInfo *)location {
  self = [super init];
  if (self) {
    _driver = driverName;
    _location = location;
  }
  return self;
}

- (CLLocationCoordinate2D)coordinate {
  return CLLocationCoordinate2DMake(self.location.latitude, self.location.longitude);
}

- (NSString *)title {
  return self.driver;
}

@end

@interface RiderTalkViewController () <ZCCSessionDelegate>
@property (nonatomic, weak) IBOutlet UIButton *buttonCancel;
@property (nonatomic, weak) IBOutlet UIButton *buttonDetail;
@property (nonatomic, weak) IBOutlet UILabel *labelTitle;
@property (nonatomic, weak) IBOutlet UILabel *labelDetail;
@property (nonatomic, weak) IBOutlet UILabel *labelHeaderTitle;
@property (nonatomic, weak) IBOutlet UILabel *labelHeaderDetail;
@property (nonatomic, weak) IBOutlet UIImageView *imageViewAvatar;
@property (nonatomic, weak) IBOutlet UITextField *feedbackTextField;

@property (nonatomic, strong, nullable) DriverLocationAnnotation *driverAnnotation;
@end

@implementation RiderTalkViewController

- (void)viewDidLoad {
  [super viewDidLoad];
  
  self.buttonDetail.layer.borderWidth = 1.0;
  self.buttonDetail.layer.borderColor = RGBA(0, 0, 0, 0.05f).CGColor;
  self.buttonDetail.layer.cornerRadius = 4.0f;
  [self.buttonDetail setTitleColor:RGB(53.0f, 60.0f, 69.0f) forState:UIControlStateNormal];
  
  [self.navigationController.navigationBar setBarStyle:UIBarStyleDefault];
  [self.navigationItem setHidesBackButton:YES animated:YES];
}

- (void)viewWillDisappear:(BOOL)animated {
  [super viewWillDisappear:animated];
  [self.navigationController.navigationBar setBarStyle:UIBarStyleBlack];
}

- (IBAction)onButtonCancel:(id)sender {
  [self.navigationController.navigationBar setBarStyle:UIBarStyleBlack];
  [self.navigationController popViewControllerAnimated:YES];
}

- (IBAction)sendTextMessage {
  if (self.feedbackTextField.text.length > 0) {
    [Zello.session sendText:self.feedbackTextField.text];
    self.feedbackTextField.text = nil;
  }
}

#pragma mark - MKMapViewDelegate

- (MKAnnotationView *)mapView:(MKMapView *)mapView viewForAnnotation:(id<MKAnnotation>)annotation {
  if (@available(iOS 11, *)) {
    MKMarkerAnnotationView *marker = [[MKMarkerAnnotationView alloc] initWithAnnotation:annotation reuseIdentifier:@"Driver"];
    marker.glyphImage = [UIImage imageNamed:@"driver"];
    return marker;
  }

  return [[MKAnnotationView alloc] initWithAnnotation:annotation reuseIdentifier:nil];
}

#pragma mark - ZCCSessionDelegate

- (void)sessionDidDisconnect:(ZCCSession *)session {
  [self.navigationController.navigationBar setBarStyle:UIBarStyleBlack];
  [self.navigationController popViewControllerAnimated:YES];
}

- (void)session:(ZCCSession *)session outgoingVoice:(nonnull ZCCOutgoingVoiceStream *)stream didEncounterError:(nonnull NSError *)error {
  [self onButtonTalkUp:self];
}

- (void)session:(ZCCSession *)session incomingVoiceDidStart:(ZCCIncomingVoiceStream *)stream {
  [self setButtonReceiving];
}

- (void)session:(ZCCSession *)session incomingVoiceDidStop:(ZCCIncomingVoiceStream *)stream {
  [self setButtonNormal];
}

- (void)session:(ZCCSession *)session didReceiveLocation:(ZCCLocationInfo *)location from:(NSString *)sender {
  [self showDriver:sender location:location];
}

- (void)showDriver:(NSString *)driver location:(ZCCLocationInfo *)location {
  // When we receive a location on the channel, we'll show an annotation marker and scroll the map
  // to that location
  [self.mapView removeAnnotations:self.mapView.annotations];
  self.driverAnnotation = [[DriverLocationAnnotation alloc] initWithDriver:driver locationInfo:location];
  [self.mapView addAnnotation:self.driverAnnotation];
  [self.mapView showAnnotations:@[self.driverAnnotation] animated:YES];
}

@end
