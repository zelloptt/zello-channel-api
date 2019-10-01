//
//  ZCCOutgoingVoiceStream.m
//  sdk
//
//  Created by Alexey Gavrilov on 12/7/17.
//  Copyright © 2018 Zello. All rights reserved.
//

#import "ZCCOutgoingVoiceStream+Internal.h"
#import "ZCCVoiceStream+Internal.h"
#import "ZCCAudioHelper.h"
#import "ZCCAudioUtils.h"
#import "ZCCCodecFactory.h"
#import "ZCCEncoder.h"
#import "ZCCErrors.h"
#import "ZCCOutgoingVoiceConfiguration.h"
#import "ZCCProtocol.h"
#import "ZCCSocket.h"
#import "ZCCStreamParams.h"

@interface ZCCOutgoingVoiceStream () <ZCCEncoderDelegate>

@property (nonatomic, readonly) ZCCEncoder *encoder;
@property (nonatomic, readonly, weak) ZCCSocket *socket; // Owned by ZCCSession
@property (nonatomic, copy, readonly) NSString *recipient;

/// Number of seconds of audio sent to the server
@property (nonatomic) NSTimeInterval position;

@end

@implementation ZCCOutgoingVoiceStream {
  NSTimeInterval _position;
}

- (instancetype)initWithChannel:(NSString *)channel recipient:(NSString *)username socket:(ZCCSocket *)socket configuration:(ZCCOutgoingVoiceConfiguration *)configuration {
  self = [super initWithStreamId:0 channel:channel isIncoming:NO];
  if (self) {
    _recipient = [username copy];
    _socket = socket;
    _encoder = [[ZCCCodecFactory instance] createEncoderWithConfiguration:configuration stream:self];
    _encoder.delegate = self;
  }
  return self;
}

#pragma mark - Properties

- (NSTimeInterval)position {
  return _position;
}

- (void)setPosition:(NSTimeInterval)position {
  _position = position;
}

#pragma mark - Public methods

- (AudioStreamBasicDescription)audioStreamDescriptionWithSampleRate:(NSUInteger)sampleRate {
  return [ZCCAudioUtils audioStreamBasicDescriptionWithChannels:1 sampleRate:(NSInteger)sampleRate];
}

- (void)startWithTimeout:(NSTimeInterval)timeout {
  [super start];
  self.position = 0.0;
  self.state = ZCCStreamStateStarting;
  // We don't own socket, so we don't need to do the weak self dance in this block
  ZCCStartStreamCallback callback = ^(BOOL succeeded, NSUInteger streamId, NSString *errorMessage) {
    id<ZCCVoiceStreamDelegate> delegate = self.delegate;

    if (self.state == ZCCStreamStateStopping) {
      self.state = ZCCStreamStateStopped;
      if (succeeded) {
        [self.socket sendStopStream:streamId];
      }
      [delegate voiceStreamDidStop:self];
      return;
    }

    if (!succeeded || streamId == 0) {
      NSLog(@"[ZCC] ZCCAudioStreamOut error: %@", errorMessage ?: @"unknown");
      self.state = ZCCStreamStateError;
      NSDictionary *errorInfo = nil;
      if (errorMessage) {
        errorInfo = @{ZCCErrorWebSocketReasonKey:errorMessage};
      }
      NSError *error = [NSError errorWithDomain:ZCCErrorDomain code:ZCCErrorCodeWebSocketError userInfo:errorInfo];
      [delegate voiceStream:self didStopWithError:error];
      return;
    }
    self.streamId = streamId;
    [self.encoder prepareAsync:0];
  };
  ZCCStreamParams *params = [[ZCCStreamParams alloc] initWithType:ZCCStreamTypeAudio encoder:self.encoder];
  [self.socket sendStartStreamWithParams:params recipient:self.recipient callback:callback timeoutAfter:timeout];
}

- (void)stop {
  self.state = ZCCStreamStateStopping;
  [super stop];
  [self.encoder stop];
}

#pragma mark - ZCCEncoderDelegate

- (void)encoder:(ZCCEncoder *)encoder didProduceData:(NSData *)audioData {
  [self.socket sendAudioData:audioData stream:self.streamId];
  [self touch];

  self.position += encoder.packetDuration / 1000.0; // packetDuration is ms
  [self.delegate voiceStream:self didUpdatePosition:self.position];

}

- (void)encoderDidEncounterError:(ZCCEncoder *)encoder {
  self.state = ZCCStreamStateError;
  [self.socket sendStopStream:self.streamId];
  [self.delegate voiceStream:self didStopWithError:[NSError errorWithDomain:ZCCErrorDomain code:ZCCErrorCodeEncoder userInfo:nil]];
}

- (void)encoderDidBecomeReady:(ZCCEncoder *)encoder {
  [self.encoder start];
}

- (void)encoderDidStart:(ZCCEncoder *)encoder {
  self.state = ZCCStreamStateActive;
  [self.delegate voiceStreamDidStart:self];
}

- (void)encoderDidStop:(ZCCEncoder *)encoder {
  self.state = ZCCStreamStateStopped;
  [self.socket sendStopStream:self.streamId];
  [self.delegate voiceStreamDidStop:self];
}

@end
