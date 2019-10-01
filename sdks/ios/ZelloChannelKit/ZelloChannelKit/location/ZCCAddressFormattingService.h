//
//  ZCCAddressFormattingService.h
//  ZelloChannelKit
//
//  Created by Greg Cooksey on 9/13/19.
//  Copyright © 2019 Zello. All rights reserved.
//

#import <CoreLocation/CoreLocation.h>
#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@protocol ZCCAddressFormattingService <NSObject>
- (nullable NSString *)stringFromPlacemark:(CLPlacemark *)placemark;
@end

@interface ZCCContactsAddressFormattingService : NSObject <ZCCAddressFormattingService>
@end

NS_ASSUME_NONNULL_END
