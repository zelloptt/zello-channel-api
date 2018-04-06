//
//  ZCCQueueRunner.h
//  Zello
//
//  Created by Alexey Gavrilov on 9/9/16.
//  Copyright © 2018 Zello. All rights reserved.
//

#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@interface ZCCQueueRunner : NSObject
@property (atomic, readonly, nonnull) dispatch_queue_t queue;

/**
 * Creates a ZCCQueueRunner with an internally-generated queue
 */
- (instancetype)init;

/**
 * Creates a ZCCQueueRunner with an internally-generated queue with the specified name
 */
- (instancetype)initWithName:(NSString *)name;

/**
 * Creates a ZCCQueueRunner with a specified queue
 */
- (instancetype)initWithQueue:(dispatch_queue_t)queue;

- (void)runSync:(dispatch_block_t)block;
- (void)runAsync:(dispatch_block_t)block;

/**
 * Schedules block to be run on this ZCCQueueRunner's queue after delay seconds.
 *
 * You can prevent the block from being run by calling dispatch_block_cancel().
 */
- (void)run:(dispatch_block_t)block after:(NSTimeInterval)delay;

@end

NS_ASSUME_NONNULL_END
