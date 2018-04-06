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
 * No public initializer is available. Create outgoing voice streams with -[ZCCSession startVoiceMessage]
 * and get incoming voice streams from -[ZCCSessionDelegate session:incomingVoiceDidStart:].
 */
- (instancetype)init NS_UNAVAILABLE;

/// The name of the channel this stream is connected to
@property (nonatomic, copy, readonly) NSString *channel;

/// The stream's current state
@property (atomic, readonly) ZCCStreamState state;

/// Approximately the number of seconds of audio that have been sent or received via this stream
@property (nonatomic, readonly) NSTimeInterval position;

@end

NS_ASSUME_NONNULL_END
