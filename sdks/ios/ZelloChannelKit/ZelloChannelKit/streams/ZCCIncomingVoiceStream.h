//
//  ZCCIncomingVoiceStream.h
//  sdk
//
//  Created by Alexey Gavrilov on 12/7/17.
//  Copyright © 2018 Zello. All rights reserved.
//

#import "ZCCVoiceStream.h"

NS_ASSUME_NONNULL_BEGIN

/**
 * This class implements voice streams from the Zello Channels server to the client device.
 */
@interface ZCCIncomingVoiceStream : ZCCVoiceStream

/// The username of the speaker
@property (nonatomic, copy, readonly) NSString *sender;

@end

NS_ASSUME_NONNULL_END
