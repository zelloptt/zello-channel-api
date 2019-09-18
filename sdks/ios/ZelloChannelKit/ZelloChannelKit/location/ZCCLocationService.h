//
//  ZCCLocationService.h
//  ZelloChannelKit
//
//  Created by Greg Cooksey on 9/12/19.
//  Copyright © 2019 Zello. All rights reserved.
//

#import <CoreLocation/CoreLocation.h>
#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

typedef void (^ZCCLocationRequestCallback)(CLLocation * _Nullable location, NSError * _Nullable error);

@protocol ZCCLocationService <NSObject>

- (CLAuthorizationStatus)authorizationStatus;
- (BOOL)locationServicesEnabled;
- (void)requestLocation:(ZCCLocationRequestCallback)callback;

@end

NS_ASSUME_NONNULL_END
