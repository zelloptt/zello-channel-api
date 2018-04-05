//
//  DriverNext.h
//  demo
//
//  Created by Jim Pickering on 12/6/17.
//  Copyright © 2018 Zello. All rights reserved.
//

#import <Foundation/Foundation.h>

@interface DriverNext : NSObject
+ (instancetype)driverItemWithDictionary:(NSDictionary *)dictionary;
@property (nonatomic, strong) NSString *topText;
@property (nonatomic, strong) NSString *bottomText;
@property (nonatomic, strong) NSString *imageName;
@end
