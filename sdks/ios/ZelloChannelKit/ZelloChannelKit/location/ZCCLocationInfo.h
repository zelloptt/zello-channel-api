//
//  ZCCLocationInfo.h
//  ZelloChannelKit
//
//  Created by Greg Cooksey on 9/12/19.
//  Copyright © 2019 Zello. All rights reserved.
//

#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@interface ZCCLocationInfo: NSObject
@property (nonatomic, readonly) double latitude;
@property (nonatomic, readonly) double longitude;
/// Sender's reported accuracy in meters
@property (nonatomic, readonly) double accuracy;
/// Reverse geocoded location from the sender
@property (nonatomic, readonly, nullable) NSString *address;
@end

NS_ASSUME_NONNULL_END
