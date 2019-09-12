//
//  ZCCImageHeader.h
//  ZelloChannelKit
//
//  Created by Greg Cooksey on 9/6/19.
//  Copyright © 2019 Zello. All rights reserved.
//

#import <Foundation/Foundation.h>
#import "ZCCImageMessage.h"

NS_ASSUME_NONNULL_BEGIN

@interface ZCCImageHeader : NSObject
@property (nonatomic, copy, nullable) NSString *channel;
@property (nonatomic, copy, nullable) NSString *sender;
@property (nonatomic) NSUInteger imageId;
@property (nonatomic) ZCCImageType imageType;
@property (nonatomic) NSInteger height;
@property (nonatomic) NSInteger width;
@property (nonatomic, copy, nullable) NSString *source;
@end

NS_ASSUME_NONNULL_END
