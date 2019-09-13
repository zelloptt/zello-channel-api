//
//  ZCCCoreLocationService.m
//  ZelloChannelKit
//
//  Created by Greg Cooksey on 9/12/19.
//  Copyright © 2019 Zello. All rights reserved.
//

#import "ZCCCoreLocationService.h"

@interface ZCCCoreLocationService () <CLLocationManagerDelegate>
@property (nonatomic, strong, nullable) CLLocationManager *locationManager;
/// The last time the user requested an update
@property (nonatomic, strong, nullable) NSDate *lastRequestedTimestamp;
@property (nonatomic, strong, nullable) ZCCLocationRequestCallback requestCallback;
@end

@implementation ZCCCoreLocationService

- (CLAuthorizationStatus)authorizationStatus {
  return [CLLocationManager authorizationStatus];
}

- (BOOL)locationServicesEnabled {
  return [CLLocationManager locationServicesEnabled];
}

- (void)requestLocation:(ZCCLocationRequestCallback)callback {
  if (!self.locationManager) {
    self.locationManager = [[CLLocationManager alloc] init];
    self.locationManager.delegate = self;
  }
  self.requestCallback = callback;
  self.lastRequestedTimestamp = [NSDate date];
  [self.locationManager requestLocation];
}

#pragma mark - CLLocationManagerDelegate

- (void)locationManager:(CLLocationManager *)manager didFailWithError:(NSError *)error {
  if (manager != self.locationManager) {
    return;
  }

  NSLog(@"[ZCC] Location manager error: %@", error);
  if (self.requestCallback) {
    self.requestCallback(nil, error);
    self.requestCallback = nil;
  }
}

- (void)locationManager:(CLLocationManager *)manager didUpdateLocations:(nonnull NSArray<CLLocation *> *)locations {
  if (manager != self.locationManager) {
    return;
  }
  CLLocation *recent = [locations lastObject];
  if ([self.lastRequestedTimestamp timeIntervalSinceDate:recent.timestamp] > 5.0) {
    // Last request came before this location was determined
    return;
  }

  if (self.requestCallback) {
    self.requestCallback(recent, nil);
    self.requestCallback = nil;
  }
}

@end
