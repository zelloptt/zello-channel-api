//
//  ZCCCommands.h
//  sdk
//
//  Created by Greg Cooksey on 1/31/18.
//  Copyright © 2018 Zello. All rights reserved.
//

@import Foundation;

NS_ASSUME_NONNULL_BEGIN

@class ZCCStreamParams;

@interface ZCCCommands : NSObject

+ (nullable NSString *)logonWithSequenceNumber:(NSInteger)sequenceNumber authToken:(nullable NSString *)authToken refreshToken:(nullable NSString *)refreshToken channel:(NSString *)channel username:(NSString *)username password:(NSString *)password;

+ (nullable NSString *)startStreamWithSequenceNumber:(NSInteger)sequenceNumber params:(ZCCStreamParams *)params;

+ (nullable NSString *)stopStreamWithSequenceNumber:(NSInteger)sequenceNumber streamId:(NSUInteger)streamId;

/**
 * Builds a binary message for sending audioData to the stream identified by streamId.
 * @param streamId must be representable as a 16-bit value
 */
+ (NSData *)messageForAudioData:(NSData *)audioData stream:(NSUInteger)streamId;

@end

NS_ASSUME_NONNULL_END
