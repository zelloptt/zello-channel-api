//
//  ZCCStreamParams.h
//  sdk
//
//  Created by Greg Cooksey on 1/31/18.
//  Copyright © 2018 Zello. All rights reserved.
//

#import <Foundation/Foundation.h>

@class ZCCEncoder;

@interface ZCCStreamParams : NSObject

@property (nonatomic, copy, nonnull) NSString *codecName;
@property (nonatomic, copy, nonnull) NSString *type;
@property (nonatomic, copy, nonnull) NSData *codecHeader;
@property (nonatomic) NSUInteger packetDuration;

- (nonnull instancetype)initWithType:(nonnull NSString *)type encoder:(nonnull ZCCEncoder *)encoder;

@end
