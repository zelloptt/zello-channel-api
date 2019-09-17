//
//  ZWSProtocol.h
//  sdk
//
//  Created by Alexey Gavrilov on 12/7/17.
//  Copyright © 2018 Zello. All rights reserved.
//

#import <Foundation/Foundation.h>

FOUNDATION_EXPORT NSString * const ZCCCommandKey;
FOUNDATION_EXPORT NSString * const ZCCCommandLogon;
FOUNDATION_EXPORT NSString * const ZCCCommandStartStream;
FOUNDATION_EXPORT NSString * const ZCCCommandStopStream;
FOUNDATION_EXPORT NSString * const ZCCCommandSendLocationMessage;
FOUNDATION_EXPORT NSString * const ZCCCommandSendTextMessage;

FOUNDATION_EXPORT NSString * const ZCCSeqKey;
FOUNDATION_EXPORT NSString * const ZCCAuthTokenKey;
FOUNDATION_EXPORT NSString * const ZCCUsernameKey;
FOUNDATION_EXPORT NSString * const ZCCPasswordKey;
FOUNDATION_EXPORT NSString * const ZCCChannelNameKey;
FOUNDATION_EXPORT NSString * const ZCCRefreshTokenKey;

FOUNDATION_EXPORT NSString * const ZCCStreamTypeKey;
FOUNDATION_EXPORT NSString * const ZCCStreamCodecKey;
FOUNDATION_EXPORT NSString * const ZCCStreamCodecHeaderKey;
FOUNDATION_EXPORT NSString * const ZCCStreamPacketDurationKey;
FOUNDATION_EXPORT NSString * const ZCCStreamIDKey;

FOUNDATION_EXPORT NSString * const ZCCStreamTypeAudio;

FOUNDATION_EXPORT NSString * const ZCCLatitudeKey;
FOUNDATION_EXPORT NSString * const ZCCLongitudeKey;
FOUNDATION_EXPORT NSString * const ZCCAccuracyKey;
FOUNDATION_EXPORT NSString * const ZCCReverseGeocodedKey;

FOUNDATION_EXPORT NSString * const ZCCTextContentKey;
FOUNDATION_EXPORT NSString * const ZCCToUserKey;
FOUNDATION_EXPORT NSString * const ZCCFromUserKey;

FOUNDATION_EXPORT NSString * const ZCCEventOnChannelStatus;
FOUNDATION_EXPORT NSString * const ZCCEventOnStreamStart;
FOUNDATION_EXPORT NSString * const ZCCEventOnStreamStop;
FOUNDATION_EXPORT NSString * const ZCCEventOnError;
FOUNDATION_EXPORT NSString * const ZCCEventOnLocation;
FOUNDATION_EXPORT NSString * const ZCCEventOnTextMessage;

FOUNDATION_EXPORT NSString * const ZCCChannelStatusStatusKey;
FOUNDATION_EXPORT NSString * const ZCCChannelStatusNumberOfUsersKey;

FOUNDATION_EXPORT NSString * const ZCCOnStreamStartSenderKey;

FOUNDATION_EXPORT NSString * const ZCCErrorKey;
FOUNDATION_EXPORT NSString * const ZCCSuccessKey;
