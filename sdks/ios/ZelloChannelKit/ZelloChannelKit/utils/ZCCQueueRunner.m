//
//  ZCCQueueRunner.m
//  Zello
//
//  Created by Alexey Gavrilov on 9/9/16.
//  Copyright © 2018 Zello. All rights reserved.
//

#import "ZCCQueueRunner.h"

@implementation ZCCQueueRunner {
  void *_dqMarker;
}

- (instancetype)init {
  return [self initWithName:NSStringFromClass([self class])];
}

- (instancetype)initWithName:(NSString *)name {
  dispatch_queue_t queue = dispatch_queue_create([name cStringUsingEncoding:NSUTF8StringEncoding], NULL);
  return [self initWithQueue:queue];
}

- (instancetype)initWithQueue:(dispatch_queue_t)queue {
  self = [super init];
  if (self) {
    _queue = queue;
    _dqMarker = &_dqMarker;
    dispatch_queue_set_specific(_queue, _dqMarker, _dqMarker, NULL);
  }
  return self;
}

- (void)runSync:(dispatch_block_t)block {
  // Running dispatch_sync from the same queue will deadlock it so we need to check
  // for that condition first
  if (dispatch_get_specific(_dqMarker)) {
    block();
  } else {
    dispatch_sync(self.queue, block);
  }
}

- (void)runAsync:(dispatch_block_t)block {
  dispatch_async(self.queue, block);
}

- (void)run:(nonnull dispatch_block_t)block after:(NSTimeInterval)delay {
  dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(delay * NSEC_PER_SEC)), self.queue, block);
}

@end
