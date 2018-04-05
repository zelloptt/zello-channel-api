//
//  DriverNext.m
//  demo
//
//  Created by Jim Pickering on 12/6/17.
//  Copyright © 2018 Zello. All rights reserved.
//

#import "DriverNext.h"

@implementation DriverNext
+ (instancetype)driverItemWithDictionary:(NSDictionary *)dictionary {
  DriverNext *driverTask = [[DriverNext alloc] init];
  driverTask.topText = dictionary[@"topString"];
  driverTask.bottomText = dictionary[@"bottomString"];
  driverTask.imageName = dictionary[@"imageAvatar"];
  return driverTask;
}
@end
