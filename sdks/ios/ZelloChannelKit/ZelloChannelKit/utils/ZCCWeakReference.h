//
//  ZCCWeakReference.h
//  Zello
//
//  Created by Alexey Gavrilov on 9/26/16.
//  Copyright © 2018 Zello. All rights reserved.
//

#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

/**
 * Weak reference wrapper class, so we can store weak references in collections, etc.
 */
@interface ZCCWeakReference<Referent> : NSObject
@property (atomic, weak, nullable, readonly) Referent obj;

/**
 * Seconds since the system reference date when this weak reference was created
 */
@property (atomic, readonly) NSTimeInterval timestamp;

/**
 * Creates a weak reference to obj
 */
+ (ZCCWeakReference<Referent> *)weakReferenceToObject:(Referent)obj;

/**
 * Call +weakReferenceToObject: instead
 */
- (instancetype)init NS_UNAVAILABLE;

@end

NS_ASSUME_NONNULL_END
