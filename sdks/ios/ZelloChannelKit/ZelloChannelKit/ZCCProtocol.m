//
//  ZWSProtocol.m
//  sdk
//
//  Created by Greg Cooksey on 2/2/18.
//  Copyright © 2018 Zello. All rights reserved.
//

#import "ZCCProtocol.h"

#pragma mark Commands client -> server
NSString * const ZCCCommandKey = @"command";
NSString * const ZCCCommandLogon = @"logon";
NSString * const ZCCCommandStartStream = @"start_stream";
NSString * const ZCCCommandStopStream = @"stop_stream";
NSString * const ZCCCommandSendLocationMessage = @"send_location";
NSString * const ZCCCommandSendTextMessage = @"send_text_message";
NSString * const ZCCCommandSendImage = @"send_image";

#pragma mark Common message contents
NSString * const ZCCSeqKey = @"seq";
NSString * const ZCCErrorKey = @"error";
NSString * const ZCCSuccessKey = @"success";
NSString * const ZCCToUserKey = @"for";
NSString * const ZCCFromUserKey = @"from";

#pragma mark Logon
NSString * const ZCCAuthTokenKey = @"auth_token";
NSString * const ZCCUsernameKey = @"username";
NSString * const ZCCPasswordKey = @"password";
NSString * const ZCCChannelNameKey = @"channel";
NSString * const ZCCRefreshTokenKey = @"refresh_token";

#pragma mark Stream metadata
NSString * const ZCCStreamTypeKey = @"type";
NSString * const ZCCStreamCodecKey = @"codec";
NSString * const ZCCStreamCodecHeaderKey = @"codec_header";
NSString * const ZCCStreamPacketDurationKey = @"packet_duration";
NSString * const ZCCStreamIDKey = @"stream_id";
NSString * const ZCCStreamTypeAudio = @"audio";

#pragma mark Location
NSString * const ZCCLatitudeKey = @"latitude";
NSString * const ZCCLongitudeKey = @"longitude";
NSString * const ZCCAccuracyKey = @"accuracy";
NSString * const ZCCReverseGeocodedKey = @"formatted_address";

#pragma mark Texting
NSString * const ZCCTextContentKey = @"text";

NSString * const ZCCMessageIDKey = @"message_id";

NSString * const ZCCImageIDKey = @"image_id";
NSString * const ZCCImageContentLengthKey = @"content_length";
NSString * const ZCCThumbnailContentLengthKey = @"thumbnail_content_length";
NSString * const ZCCImageWidthKey = @"width";
NSString * const ZCCImageHeightKey = @"height";
NSString * const ZCCImageSourceKey = @"source";

#pragma mark Events server -> client
NSString * const ZCCEventOnChannelStatus = @"on_channel_status";
NSString * const ZCCEventOnStreamStart = @"on_stream_start";
NSString * const ZCCEventOnStreamStop = @"on_stream_stop";
NSString * const ZCCEventOnError = @"on_error";
NSString * const ZCCEventOnLocation = @"on_location";
NSString * const ZCCEventOnTextMessage = @"on_text_message";
NSString * const ZCCEventOnImage = @"on_image";

#pragma mark Channel status update events
NSString * const ZCCChannelStatusStatusKey = @"status";
NSString * const ZCCChannelStatusNumberOfUsersKey = @"users_online";
