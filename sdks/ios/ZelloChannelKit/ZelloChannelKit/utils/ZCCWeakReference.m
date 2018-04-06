//
//  ZCCWeakReference.m
//  Zello
//
//  Created by Alexey Gavrilov on 9/26/16.
//  Copyright © 2018 Zello. All rights reserved.
//

#import "ZCCWeakReference.h"

@implementation ZCCWeakReference

- (ZCCWeakReference *)initWithObject:(id)object {
  self = [super init];
  if (self) {
    _timestamp = [NSDate timeIntervalSinceReferenceDate];
    _obj = object;
  }
  return self;
}

+ (ZCCWeakReference *)weakReferenceToObject:(id)obj {
  return [[ZCCWeakReference alloc] initWithObject:obj];
}

@end
