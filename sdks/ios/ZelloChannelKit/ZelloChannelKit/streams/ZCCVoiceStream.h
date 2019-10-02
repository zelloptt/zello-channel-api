//
//  ZCCVoiceStream.h
//  sdk
//
//  Created by Alexey Gavrilov on 12/7/17.
//  Copyright © 2018 Zello. All rights reserved.
//

#import <Foundation/Foundation.h>
#import "ZCCStreamState.h"

NS_ASSUME_NONNULL_BEGIN

/**
 * Base class for voice streams between the Zello Channel SDK and the Zello Channel server.
 */
@interface ZCCVoiceStream : NSObject

/**
 * @abstract No public initializer is available
 *
 * @discussion Create outgoing voice streams with <code>-[ZCCSession startVoiceMessage]</code>
 * and get incoming voice streams from <code>-[ZCCSessionDelegate session:incomingVoiceDidStart:]</code>.
 */
- (instancetype)init NS_UNAVAILABLE;

/**
 * @abstract The name of the channel this stream is connected to
 */
@property (nonatomic, copy, readonly) NSString *channel;

/**
 * @abstract The stream's current state
 */
@property (atomic, readonly) ZCCStreamState state;

/**
 * @abstract Approximately the number of seconds of audio that have been sent or received via this stream
 */
@property (nonatomic, readonly) NSTimeInterval position;

@end

NS_ASSUME_NONNULL_END
