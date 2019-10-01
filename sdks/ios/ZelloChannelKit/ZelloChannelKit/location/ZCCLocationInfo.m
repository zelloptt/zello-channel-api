//
//  ZCCLocationInfo.m
//  ZelloChannelKit
//
//  Created by Greg Cooksey on 9/12/19.
//  Copyright © 2019 Zello. All rights reserved.
//

#import <CoreLocation/CoreLocation.h>
#import "ZCCLocationInfo+Internal.h"

@interface ZCCLocationInfo ()
@property (nonatomic) double latitude;
@property (nonatomic) double longitude;
@property (nonatomic) double accuracy;
@property (nonatomic, copy, nullable) NSString *address;
@end

static double epsilon = 0.00001; // ~1 meter for latitude, less for longitude

@implementation ZCCLocationInfo

- (instancetype)initWithLocation:(CLLocation *)location {
  return [self initWithLatitude:location.coordinate.latitude longitude:location.coordinate.longitude accuracy:location.horizontalAccuracy];
}

- (instancetype)initWithLatitude:(double)latitude longitude:(CLLocationDegrees)longitude accuracy:(double)accuracy {
  self = [super init];
  if (self) {
    _latitude = latitude;
    _longitude = longitude;
    _accuracy = accuracy;
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
