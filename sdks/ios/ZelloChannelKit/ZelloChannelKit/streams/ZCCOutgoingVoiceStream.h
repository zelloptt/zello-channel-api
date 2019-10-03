//
//  ZCCOutgoingVoiceStream.h
//  sdk
//
//  Created by Alexey Gavrilov on 12/7/17.
//  Copyright © 2018 Zello. All rights reserved.
//

#import <AudioToolbox/AudioToolbox.h>
#import "ZCCVoiceStream.h"

/**
 * Stream sending voice audio to the Zello Channels server. Create an outgoing voice stream by
 * calling <code>-[ZCCSession startVoiceMessage]</code> and stop it by calling <code>stop</code>.
 * After stopping an outgoing voice stream, the object is defunct. To send more voice audio to the
 * server, you will need to create a new stream.
 */
@interface ZCCOutgoingVoiceStream : ZCCVoiceStream

/**
 * @abstract Gets an <code>AudioStreamBasicDescription</code> structure describing the format that
 * this voice stream expects.
 *
 * @param sampleRate sample rate in Hz
 *
 * @return <code>AudioStreamBasicDescription</code> describing the stream's data format at the
 * specified sample rate
 */
- (AudioStreamBasicDescription)audioStreamDescriptionWithSampleRate:(NSUInteger)sampleRate;

/**
 * @abstract Stops transmitting audio to the Zello server and closes the stream.
 *
 * @discussion After calling <code>stop</code> on a stream, the stream is no longer valid. Do not
 * call any further methods on the stream.
 */
- (void)stop;

@end
