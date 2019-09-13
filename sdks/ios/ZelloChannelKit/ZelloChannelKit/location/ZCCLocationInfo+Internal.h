//
//  ZCCLocationInfo+Internal.h
//  ZelloChannelKit
//
//  Created by Greg Cooksey on 9/12/19.
//  Copyright © 2019 Zello. All rights reserved.
//

#import <CoreLocation/CoreLocation.h>
#import "ZCCLocationInfo.h"

NS_ASSUME_NONNULL_BEGIN

@interface ZCCLocationInfo (Internal)
- (instancetype)initWithLocation:(CLLocation *)location;
- (void)setAddress:(nullable NSString *)address;
@end

NS_ASSUME_NONNULL_END
