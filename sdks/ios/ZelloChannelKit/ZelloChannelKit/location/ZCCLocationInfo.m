//
//  ZCCLocationInfo.m
//  ZelloChannelKit
//
//  Created by Greg Cooksey on 9/12/19.
//  Copyright © 2019 Zello. All rights reserved.
//

#import <CoreLocation/CoreLocation.h>
#import "ZCCLocationInfo.h"

@interface ZCCLocationInfo ()
@property (nonatomic) double latitude;
@property (nonatomic) double longitude;
@property (nonatomic) double accuracy;
@property (nonatomic, copy, nullable) NSString *address;
@end

static double epsilon = 0.00001; // ~1 meter for latitude, less for longitude

@implementation ZCCLocationInfo

- (instancetype)initWithLocation:(CLLocation *)location {
  self = [super init];
  if (self) {
    _latitude = location.coordinate.latitude;
    _longitude = location.coordinate.longitude;
    _accuracy = location.horizontalAccuracy;
  }
  return self;
}

- (NSUInteger)hash {
  return (NSUInteger)self.latitude * 17 + (NSUInteger)self.longitude;
}

- (BOOL)isEqual:(id)object {
  if (![object isKindOfClass:[ZCCLocationInfo class]]) {
    return NO;
  }

  ZCCLocationInfo *other = object;
  if (fabs(self.latitude - other.latitude) >= epsilon) {
    return NO;
  }
  if (fabs(self.longitude - other.longitude) >= epsilon) {
    return NO;
  }
  if (fabs(self.accuracy - other.accuracy) >= 0.5) { // Treat half-meter accuracy or better as equivalent
    return NO;
  }
  if ((self.address && ![other.address isEqualToString:self.address])
      || (!self.address && other.address)) {
    return NO;
  }

  return YES;
}

@end
