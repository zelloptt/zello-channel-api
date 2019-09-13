//
//  ZCCAddressFormattingService.m
//  ZelloChannelKit
//
//  Created by Greg Cooksey on 9/13/19.
//  Copyright © 2019 Zello. All rights reserved.
//

#import <Contacts/Contacts.h>
#import "ZCCAddressFormattingService.h"

@implementation ZCCContactsAddressFormattingService

- (NSString *)stringFromPlacemark:(CLPlacemark *)placemark {
  CNPostalAddress *postalAddress = nil;
  if (@available(iOS 11, *)) {
    postalAddress = placemark.postalAddress;
  } else {
    CNMutablePostalAddress *addy = [[CNMutablePostalAddress alloc] init];
    addy.street = placemark.name;
    addy.city = placemark.locality;
    addy.state = placemark.administrativeArea;
    if (@available(iOS 10.3, *)) {
      addy.subLocality = placemark.subLocality;
      addy.subAdministrativeArea = placemark.subAdministrativeArea;
    }
    addy.country = placemark.country;
    addy.postalCode = placemark.postalCode;
    postalAddress = addy;
  }

  if (postalAddress) {
    return [CNPostalAddressFormatter stringFromPostalAddress:postalAddress style:CNPostalAddressFormatterStyleMailingAddress];
  } else {
    return nil;
  }
}

@end
