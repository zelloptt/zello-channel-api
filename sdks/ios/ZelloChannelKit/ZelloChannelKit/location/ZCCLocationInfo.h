//
//  ZCCLocationInfo.h
//  ZelloChannelKit
//
//  Created by Greg Cooksey on 9/12/19.
//  Copyright © 2019 Zello. All rights reserved.
//

#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

/**
 * Encapsulates geographic coordinates and a reverse geocoded user-readable description of the
 * location.
 */
@interface ZCCLocationInfo: NSObject

/// The latitude in degrees
@property (nonatomic, readonly) double latitude;

/// The longitude in degrees
@property (nonatomic, readonly) double longitude;

/// Sender's reported accuracy in meters
@property (nonatomic, readonly) double accuracy;

/// Reverse geocoded location from the sender
@property (nonatomic, readonly, nullable) NSString *address;

@end

NS_ASSUME_NONNULL_END
