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
 * calling -[ZCCSession startVoiceMessage] and stop it by calling -stop. After stopping an outgoing
 * voice stream, the object is defunct. To send more voice audio to the server, you will need to
 * create a new stream.
 */
@interface ZCCOutgoingVoiceStream : ZCCVoiceStream

/**
 * Gets an AudioStreamBasicDescription structure describing the format that this voice stream
 * expects.
 *
 * @param sampleRate sample rate in Hz
 *
 * @return AudioStreamBasicDescription describing the stream's data format at the specified sample
 * rate
 */
- (AudioStreamBasicDescription)audioStreamDescriptionWithSampleRate:(NSUInteger)sampleRate;

/**
 * Stops transmitting audio to the Zello server and closes the stream.
 */
- (void)stop;

@end
