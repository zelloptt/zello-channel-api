//
//  ZCCGeocodingService.h
//  ZelloChannelKit
//
//  Created by Greg Cooksey on 9/13/19.
//  Copyright © 2019 Zello. All rights reserved.
//

#import <CoreLocation/CoreLocation.h>

@protocol ZCCGeocodingService <NSObject>

- (void)reverseGeocodeLocation:(CLLocation *)location completionHandler:(CLGeocodeCompletionHandler)completion;

@end
