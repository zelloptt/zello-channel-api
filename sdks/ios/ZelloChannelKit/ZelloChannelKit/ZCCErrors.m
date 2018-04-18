//
//  ZCCErrors.m
//  sdk
//
//  Created by Greg Cooksey on 2/14/18.
//  Copyright © 2018 Zello. All rights reserved.
//

#import "ZCCErrors.h"

NSString * const ZCCErrorDomain = @"com.zello.ZelloChannelsErrors";

NSString * const ZCCErrorWebSocketReasonKey = @"com.zello.ZCCErrorWebSocketReasonKey";
NSString * const ZCCExceptionKey = @"com.zello.ZCCExceptionKey";
NSString * const ZCCOSStatusKey = @"com.zello.ZCCOSStatusKey";
NSString * const ZCCServerErrorMessageKey = @"com.zello.ZCCServerErrorMessageKey";

ZCCServerErrorMessage const ZCCServerErrorMessageUnknownCommand = @"unknown command";
ZCCServerErrorMessage const ZCCServerErrorMessageInternalServerError = @"internal server error";
ZCCServerErrorMessage const ZCCServerErrorMessageInvalidJSON = @"invalid json";
ZCCServerErrorMessage const ZCCServerErrorMessageInvalidRequest = @"invalid request";
ZCCServerErrorMessage const ZCCServerErrorMessageNotAuthorized = @"not authorized";
ZCCServerErrorMessage const ZCCServerErrorMessageNotLoggedIn = @"not logged in";
ZCCServerErrorMessage const ZCCServerErrorMessageNotEnoughParams = @"not enough params";
ZCCServerErrorMessage const ZCCServerErrorMessageSupernodeClosedConnection = @"supernode closed connection";
ZCCServerErrorMessage const ZCCServerErrorMessageChannelNotReady = @"channel is not ready";
ZCCServerErrorMessage const ZCCServerErrorMessageListenOnlyConnection = @"listen only connection";
ZCCServerErrorMessage const ZCCServerErrorMessageFailedToStartStream = @"failed to start stream";
ZCCServerErrorMessage const ZCCServerErrorMessageFailedToStopStream = @"failed to stop stream";
ZCCServerErrorMessage const ZCCServerErrorMessageFailedToSendData = @"failed to send data";
ZCCServerErrorMessage const ZCCServerErrorMessageInvalidAudioPacket = @"invalid audio packet";
