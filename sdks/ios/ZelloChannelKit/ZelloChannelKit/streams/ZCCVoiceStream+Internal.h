//
//  ZCCVoiceStream+Internal.h
//  ZelloChannelKit
//
//  Created by Greg Cooksey on 2/23/18.
//  Copyright © 2018 Zello. All rights reserved.
//

#import "ZCCVoiceStream.h"

@protocol ZCCVoiceStreamDelegate
- (void)voiceStreamDidStart:(nonnull ZCCVoiceStream *)stream;
- (void)voiceStreamDidStop:(nonnull ZCCVoiceStream *)stream;
- (void)voiceStream:(nonnull ZCCVoiceStream *)stream didStopWithError:(nonnull NSError *)error;
- (void)voiceStream:(nonnull ZCCVoiceStream *)stream didChangeStateFrom:(ZCCStreamState)oldState to:(ZCCStreamState)newState;

/**
 * Called when the stream position is updated
 *
 * @param position the number of seconds of audio played or recorded since the stream started
 */
- (void)voiceStream:(nonnull ZCCVoiceStream *)stream didUpdatePosition:(NSTimeInterval)position;
@end

@interface ZCCVoiceStream (Internal)

@property (atomic) ZCCStreamState state;

// Internal
@property (nonatomic) NSUInteger streamId;
@property (nonatomic, readonly, getter = isIncoming) BOOL incoming;
@property (nonatomic, weak, nullable) id<ZCCVoiceStreamDelegate> delegate;
@property (nonatomic, readonly) BOOL timedOut;

- (nonnull instancetype)initWithStreamId:(NSUInteger)streamId channel:(nonnull NSString *)channel isIncoming:(BOOL)isIncoming;

- (void)start;
- (void)stop;
- (void)touch;

+ (nonnull NSString *)describeState:(ZCCStreamState)state;

@end
