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

/**
 * @abstract The latitude in degrees
 */
@property (nonatomic, readonly) double latitude;

/**
 * @abstract The longitude in degrees
 */
@property (nonatomic, readonly) double longitude;

/**
 * @abstract Sender's reported accuracy in meters
 */
@property (nonatomic, readonly) double accuracy;

/**
 * @abstract Reverse geocoded location from the sender
 */
@property (nonatomic, readonly, nullable) NSString *address;

@end

NS_ASSUME_NONNULL_END
