//
//  ZCCCommands.m
//  sdk
//
//  Created by Greg Cooksey on 1/31/18.
//  Copyright © 2018 Zello. All rights reserved.
//

#import "ZCCCommands.h"
#import "ZCCProtocol.h"
#import "ZCCStreamParams.h"

@implementation ZCCCommands

+ (NSString *)logonWithSequenceNumber:(NSInteger)sequenceNumber authToken:(NSString *)authToken refreshToken:(NSString *)refreshToken channel:(NSString *)channel username:(NSString *)username password:(NSString *)password {
  NSMutableDictionary *logon = [@{ZCCCommandKey:ZCCCommandLogon,
                                  ZCCSeqKey:@(sequenceNumber),
                                  ZCCChannelNameKey:channel,
                                  ZCCUsernameKey:username,
                                  ZCCPasswordKey:password} mutableCopy];
  if (authToken) {
    logon[ZCCAuthTokenKey] = authToken;
  }
  if (refreshToken) {
    logon[ZCCRefreshTokenKey] = refreshToken;
  }
  NSError *serializationError = nil;
  NSString *logonCommand = [[NSString alloc] initWithData:[NSJSONSerialization dataWithJSONObject:logon options:0 error:&serializationError] encoding:NSUTF8StringEncoding];
  if (!logonCommand) {
    NSLog(@"[ZCC] Error serializing logon: %@", serializationError);
  }
  return logonCommand;
}

+ (NSString *)sendText:(NSString *)message sequenceNumber:(NSInteger)sequenceNumber recipient:(NSString *)username {
  NSMutableDictionary *text = [@{ZCCCommandKey:ZCCCommandSendTextMessage,
                                 ZCCSeqKey:@(sequenceNumber),
                                 ZCCTextContentKey:message} mutableCopy];
  if (username.length > 0) {
    text[ZCCToUserKey] = username;
  }
  NSError *serializationError = nil;
  NSString *textCommand = [[NSString alloc] initWithData:[NSJSONSerialization dataWithJSONObject:text options:0 error:&serializationError] encoding:NSUTF8StringEncoding];
  if (!textCommand) {
    NSLog(@"[ZCC] Error serializing text: %@", serializationError);
  }
  return textCommand;
}

+ (NSString *)startStreamWithSequenceNumber:(NSInteger)sequenceNumber params:(ZCCStreamParams *)params recipient:(NSString *)username {
  NSString *base64Header = [params.codecHeader base64EncodedStringWithOptions:0];
  NSMutableDictionary *startStream = [@{ZCCCommandKey:ZCCCommandStartStream,
                                        ZCCSeqKey:@(sequenceNumber),
                                        ZCCStreamTypeKey:params.type,
                                        ZCCStreamCodecKey:params.codecName,
                                        ZCCStreamCodecHeaderKey:base64Header,
                                        ZCCStreamPacketDurationKey:@(params.packetDuration)} mutableCopy];
  if (username.length > 0) {
    startStream[ZCCToUserKey] = username;
  }
  NSError *error = nil;
  NSString *command = [[NSString alloc] initWithData:[NSJSONSerialization dataWithJSONObject:startStream options:0 error:&error] encoding:NSUTF8StringEncoding];
  if (!command) {
    NSLog(@"[ZCC] Error serializing start stream: %@", error);
  }
  return command;
}

+ (NSString *)stopStreamWithSequenceNumber:(NSInteger)sequenceNumber streamId:(NSUInteger)streamId {
  NSDictionary *stop = @{ZCCCommandKey:ZCCCommandStopStream,
                         ZCCSeqKey:@(sequenceNumber),
                         ZCCStreamIDKey:@(streamId)
                         };
  NSError *serializationError = nil;
  NSString *stopCommand = [[NSString alloc] initWithData:[NSJSONSerialization dataWithJSONObject:stop options:0 error:&serializationError] encoding:NSUTF8StringEncoding];
  if (!stopCommand) {
    NSLog(@"[ZCC] Error serializing stop: %@", serializationError);
  }
  return stopCommand;
}

+ (NSData *)messageForAudioData:(NSData *)audioData stream:(NSUInteger)streamId {
  NSAssert(streamId > 0 && streamId <= UINT32_MAX, @"streamId out of range (0 < streamId <= UINT32_MAX)");

  // { type(8) = 0x01, stream_id(32), packet_id(32) = 0, data[] }
  NSMutableData *msg = [NSMutableData data];
  char type = 0x01; // audio
  [msg appendBytes:&type length:sizeof(type)];
  uint32_t stream_id = htonl((uint32_t)streamId);
  [msg appendBytes:&stream_id length:sizeof(stream_id)];
  uint32_t packet_id = 0;
  [msg appendBytes:&packet_id length:sizeof(packet_id)];
  [msg appendData:audioData];
  return msg;
}

@end
