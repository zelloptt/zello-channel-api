//
//  ZWSProtocol.m
//  sdk
//
//  Created by Greg Cooksey on 2/2/18.
//  Copyright © 2018 Zello. All rights reserved.
//

#import "ZCCProtocol.h"

NSString * const ZCCCommandKey = @"command";
NSString * const ZCCCommandLogon = @"logon";
NSString * const ZCCCommandStartStream = @"start_stream";
NSString * const ZCCCommandStopStream = @"stop_stream";
NSString * const ZCCCommandSendTextMessage = @"send_text_message";
NSString * const ZCCCommandSendImage = @"send_image";

NSString * const ZCCSeqKey = @"seq";
NSString * const ZCCAuthTokenKey = @"auth_token";
NSString * const ZCCUsernameKey = @"username";
NSString * const ZCCPasswordKey = @"password";
NSString * const ZCCChannelNameKey = @"channel";
NSString * const ZCCRefreshTokenKey = @"refresh_token";

NSString * const ZCCStreamTypeKey = @"type";
NSString * const ZCCStreamCodecKey = @"codec";
NSString * const ZCCStreamCodecHeaderKey = @"codec_header";
NSString * const ZCCStreamPacketDurationKey = @"packet_duration";
NSString * const ZCCStreamIDKey = @"stream_id";

NSString * const ZCCStreamTypeAudio = @"audio";

NSString * const ZCCTextContentKey = @"text";
NSString * const ZCCToUserKey = @"for";
NSString * const ZCCFromUserKey = @"from";

NSString * const ZCCMessageIDKey = @"message_id";

NSString * const ZCCImageIDKey = @"image_id";
NSString * const ZCCImageContentLengthKey = @"content_length";
NSString * const ZCCThumbnailContentLengthKey = @"thumbnail_content_length";
NSString * const ZCCImageWidthKey = @"width";
NSString * const ZCCImageHeightKey = @"height";
NSString * const ZCCImageSourceKey = @"source";

NSString * const ZCCEventOnChannelStatus = @"on_channel_status";
NSString * const ZCCEventOnStreamStart = @"on_stream_start";
NSString * const ZCCEventOnStreamStop = @"on_stream_stop";
NSString * const ZCCEventOnError = @"on_error";
NSString * const ZCCEventOnTextMessage = @"on_text_message";
NSString * const ZCCEventOnImage = @"on_image";

NSString * const ZCCChannelStatusStatusKey = @"status";
NSString * const ZCCChannelStatusNumberOfUsersKey = @"users_online";

NSString * const ZCCOnStreamStartSenderKey = @"from";

NSString * const ZCCErrorKey = @"error";
NSString * const ZCCSuccessKey = @"success";
