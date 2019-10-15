//
//  ZCCCoreGeocodingService.m
//  ZelloChannelKit
//
//  Created by Greg Cooksey on 9/13/19.
//  Copyright © 2019 Zello. All rights reserved.
//

#import "ZCCCoreGeocodingService.h"

@interface ZCCCoreGeocodingService ()
@property (nonatomic, strong) CLGeocoder *geocoder;
@end

@implementation ZCCCoreGeocodingService

- (void)reverseGeocodeLocation:(CLLocation *)location completionHandler:(CLGeocodeCompletionHandler)completion {
  if (self.geocoder) {
    // Already an outstanding request
    completion(nil, [NSError errorWithDomain:kCLErrorDomain code:kCLErrorNetwork userInfo:nil]);
    return;
  }

  self.geocoder = [[CLGeocoder alloc] init];
  __weak typeof(self) weakSelf = self;
  [self.geocoder reverseGeocodeLocation:location completionHandler:^(NSArray<CLPlacemark *> * _Nullable placemarks, NSError * _Nullable error) {
    typeof(self) strongSelf = weakSelf;
    if (!strongSelf) {
      return;
    }

    strongSelf.geocoder = nil;
    completion(placemarks, error);
  }];
}

@end
