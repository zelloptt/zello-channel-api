//
//  ZCCSocketTests.m
//  ZelloChannelKitTests
//
//  Created by Greg Cooksey on 3/26/18.
//  Copyright © 2018 Zello. All rights reserved.
//

#import <OCMock/OCMock.h>
#import "ZCCSRWebSocket.h"
#import <XCTest/XCTest.h>
#import "ZCCAudioSource.h"
#import "ZCCEncoder.h"
#import "ZCCEncoderOpus.h"
#import "ZCCImageHeader.h"
#import "ZCCImageMessage.h"
#import "ZCCSocket.h"
#import "ZCCStreamParams.h"
#import "ZCCWebSocketFactory.h"

static BOOL messageIsEqualToDictionary(NSString *message, NSDictionary *expected) {
  NSData *messageData = [message dataUsingEncoding:NSUTF8StringEncoding];
  NSDictionary *actual = [NSJSONSerialization JSONObjectWithData:messageData options:0 error:NULL];
  return [expected isEqualToDictionary:actual];
}

@interface ZCCImageMessage (Testing)
@property (nonatomic) ZCCImageType imageType;
@property (nonatomic) NSUInteger contentLength;
@property (nonatomic) NSUInteger thumbnailLength;
@property (nonatomic) NSInteger width;
@property (nonatomic) NSInteger height;
@property (nonatomic, copy, nullable) NSString *recipient;
@property (nonatomic, copy) NSData *imageData;
@property (nonatomic, copy) NSData *thumbnailData;
@end

@interface ZCCSocket (Testing) <ZCCSRWebSocketDelegate>
@end

@interface ZCCSocketTests : XCTestCase
@property (nonatomic, strong) ZCCSocket *socket;
/// Mocked ZCCSocketDelegate
@property (nonatomic, strong) id socketDelegate;

/// Mocked underlying ZCCSRWebSocket
@property (nonatomic, strong) id webSocket;

@property (nonatomic, strong) XCTestExpectation *logonCallbackCalled;

@property (nonatomic, strong) ZCCImageMessage *imageMessage;
@end

@implementation ZCCSocketTests

- (void)setUp {
  [super setUp];
  self.webSocket = OCMClassMock([ZCCSRWebSocket class]);

  ZCCWebSocketFactory *factory = [[ZCCWebSocketFactory alloc] init];
  factory.createWebSocket = ^(NSURL *url) {
    return self.webSocket;
  };
  self.socket = [[ZCCSocket alloc] initWithURL:[NSURL URLWithString:@"wss://example.com/"] socketFactory:factory];
  self.socketDelegate = OCMProtocolMock(@protocol(ZCCSocketDelegate));
  self.socket.delegate = self.socketDelegate;

  self.logonCallbackCalled = [[XCTestExpectation alloc] initWithDescription:@"Logon callback called"];

  self.imageMessage = [[ZCCImageMessage alloc] init];
  self.imageMessage.imageType = ZCCImageTypeJPEG;
  self.imageMessage.contentLength = 15000;
  self.imageMessage.thumbnailLength = 300;
  self.imageMessage.width = 230;
  self.imageMessage.height = 320;
}

- (void)tearDown {
  self.socket = nil;

  self.webSocket = nil;

  self.logonCallbackCalled = nil;
  [super tearDown];
}

#pragma mark - Tests

// Verify that -open opens the web socket
- (void)testOpen_opensWebSocket {
  [self.socket open];

  OCMVerify([self.webSocket open]);
}

// Verify that -close closes the web socket
- (void)testClose_closesWebSocket {
  [self.socket close];

  OCMVerify([self.webSocket close]);
}

// Verify that -logon... sends the correct values to the server
- (void)testLogon_sendsCorrectCommand {
  void (^logonCallback)(BOOL, NSString *, NSString *) = ^(BOOL succeeded, NSString *refreshToken, NSString *errorMessage) {
  };
  NSDictionary *expected = @{@"command":@"logon",
                             @"seq":@(1),
                             @"auth_token":@"token",
                             @"username":@"user",
                             @"password":@"pass",
                             @"channel":@"channel"};
  OCMExpect([self.webSocket sendString:[OCMArg checkWithBlock:^BOOL(NSString *message) {
    return messageIsEqualToDictionary(message, expected);
  }] error:(NSError * __autoreleasing *)[OCMArg anyPointer]]).andReturn(YES);

  [self.socket sendLogonWithAuthToken:@"token" refreshToken:nil channel:@"channel" username:@"user" password:@"pass" callback:logonCallback timeoutAfter:0.0];

  OCMVerifyAll(self.webSocket);
}

// Verify -logon... callback with success
- (void)testLogon_requestSucceeds_callsLogonCallbackWithSuccess {
  void (^logonCallback)(BOOL, NSString *, NSString *) = ^(BOOL succeeded, NSString *refreshToken, NSString *errorMessage) {
    [self.logonCallbackCalled fulfill];
    XCTAssertTrue(succeeded);
    XCTAssertNil(errorMessage);
  };

  OCMExpect([self.webSocket sendString:OCMOCK_ANY error:(NSError * __autoreleasing *)[OCMArg anyPointer]]).andReturn(YES);

  [self.socket sendLogonWithAuthToken:@"token" refreshToken:nil channel:@"channel" username:@"user" password:@"pass" callback:logonCallback timeoutAfter:0.0];

  // Send response
  NSString *response = @"{\"seq\":1,\"success\":true}";
  [self.socket webSocket:self.webSocket didReceiveMessageWithString:response];
  XCTAssertEqual([XCTWaiter waitForExpectations:@[self.logonCallbackCalled] timeout:3.0], XCTWaiterResultCompleted);
  OCMVerifyAll(self.webSocket);
}

// Verify -logon... callback with failure
- (void)testLogon_requestFails_callsLogonCallbackWithErrorMessage {
  void (^logonCallback)(BOOL, NSString *, NSString *) = ^(BOOL succeeded, NSString *refreshToken, NSString *errorMessage) {
    [self.logonCallbackCalled fulfill];
    XCTAssertFalse(succeeded);
    XCTAssertEqualObjects(errorMessage, @"Uh oh, websocket failed");
  };

  OCMExpect([self.webSocket sendString:OCMOCK_ANY error:(NSError * __autoreleasing *)[OCMArg anyPointer]]).andReturn(YES);

  [self.socket sendLogonWithAuthToken:@"token" refreshToken:nil channel:@"channel" username:@"user" password:@"pass" callback:logonCallback timeoutAfter:0.0];

  NSString *response = @"{\"seq\":1,\"success\":false,\"error\":\"Uh oh, websocket failed\"}";
  [self.socket webSocket:self.webSocket didReceiveMessageWithString:response];
  XCTAssertEqual([XCTWaiter waitForExpectations:@[self.logonCallbackCalled] timeout:3.0], XCTWaiterResultCompleted);
  OCMVerifyAll(self.webSocket);
}

// Verify -logon... behavior when websocket fails to send
- (void)testLogon_sendFails_callsLogonCallbackWithErrorMessage {
  void (^logonCallback)(BOOL, NSString *, NSString *) = ^(BOOL succeeded, NSString *refreshToken, NSString *errorMessage) {
    [self.logonCallbackCalled fulfill];
    XCTAssertFalse(succeeded);
    XCTAssertEqualObjects(errorMessage, @"Uh oh, failed to send");
  };

  OCMExpect([self.webSocket sendString:OCMOCK_ANY error:(NSError * __autoreleasing *)[OCMArg anyPointer]]).andDo(^(NSInvocation *invocation) {
    NSError * __autoreleasing *errorPtr = NULL;
    [invocation getArgument:&errorPtr atIndex:3];
    NSError *socketError = [NSError errorWithDomain:@"test" code:0 userInfo:@{NSLocalizedDescriptionKey:@"Uh oh, failed to send"}];
    *errorPtr = socketError;
    BOOL retval = NO;
    [invocation setReturnValue:&retval];
  });
  [self.socket sendLogonWithAuthToken:@"token" refreshToken:nil channel:@"channel" username:@"user" password:@"pass" callback:logonCallback timeoutAfter:0.0];
  XCTAssert([XCTWaiter waitForExpectations:@[self.logonCallbackCalled] timeout:3.0]);
  OCMVerifyAll(self.webSocket);
}

// Verify request times out
- (void)testLogon_timesOut_callsLogonCallbackWithErrorMessage {
  void (^logonCallback)(BOOL, NSString *, NSString *) = ^(BOOL succeeded, NSString *refreshToken, NSString *errorMessage) {
    [self.logonCallbackCalled fulfill];
    XCTAssertFalse(succeeded);
    XCTAssertEqualObjects(errorMessage, @"Timed out");
  };

  OCMExpect([self.webSocket sendString:OCMOCK_ANY error:(NSError * __autoreleasing *)[OCMArg anyPointer]]).andReturn(YES);
  [self.socket sendLogonWithAuthToken:@"token" refreshToken:nil channel:@"channel" username:@"user" password:@"pass" callback:logonCallback timeoutAfter:1.0];
  XCTAssert([XCTWaiter waitForExpectations:@[self.logonCallbackCalled] timeout:5.0]);
  OCMVerifyAll(self.webSocket);
}

// Verify request doesn't time out if timeout argument is 0
- (void)testLogon_timeoutZero_doesntTimeout {
  self.logonCallbackCalled.inverted = YES;
  void (^logonCallback)(BOOL, NSString *, NSString *) = ^(BOOL succeeded, NSString *refreshToken, NSString *errorMessage) {
    [self.logonCallbackCalled fulfill];
  };

  OCMExpect([self.webSocket sendString:OCMOCK_ANY error:(NSError * __autoreleasing *)[OCMArg anyPointer]]).andReturn(YES);
  [self.socket sendLogonWithAuthToken:@"token" refreshToken:nil channel:@"channel" username:@"user" password:@"pass" callback:logonCallback timeoutAfter:0.0];
  XCTAssertEqual([XCTWaiter waitForExpectations:@[self.logonCallbackCalled] timeout:3.0], XCTWaiterResultCompleted);
  OCMVerifyAll(self.webSocket);
}

#pragma mark Images

// Verify that we send the right command for an image to the channel
- (void)testSendImage_sendsCommand {
  NSDictionary *expected = @{@"command":@"send_image",
                             @"seq":@(1),
                             @"type":@"jpeg",
                             @"thumbnail_content_length":@(300),
                             @"content_length":@(15000),
                             @"width":@(230),
                             @"height":@(320)};
  XCTestExpectation *commandSent = [[XCTestExpectation alloc] initWithDescription:@"send_image sent"];
  OCMExpect([self.webSocket sendString:[OCMArg checkWithBlock:^BOOL(NSString *message) {
    return messageIsEqualToDictionary(message, expected);
  }] error:(NSError * __autoreleasing *)[OCMArg anyPointer]]).andDo(^(NSInvocation *invocation) {
    [commandSent fulfill];
  }).andReturn(YES);

  [self.socket sendImage:self.imageMessage callback:^(BOOL succeeded, UInt32 imageId, NSString * _Nullable errorMessage) {
  } timeoutAfter:30.0];

  XCTAssertEqual([XCTWaiter waitForExpectations:@[commandSent] timeout:3.0], XCTWaiterResultCompleted);
  OCMVerifyAll(self.webSocket);
}

// Verify that we propagate send_image success response
- (void)testSendImage_successfulResponse_propagatesSuccess {
  XCTestExpectation *commandSent = [[XCTestExpectation alloc] initWithDescription:@"send_image sent"];
  OCMExpect([self.webSocket sendString:OCMOCK_ANY error:(NSError * __autoreleasing *)[OCMArg anyPointer]]).andDo(^(NSInvocation *invocation) {
    [commandSent fulfill];
  }).andReturn(YES);
  UInt32 expectedImageId = 4566;

  XCTestExpectation *callbackCalled = [[XCTestExpectation alloc] initWithDescription:@"callback called"];
  [self.socket sendImage:self.imageMessage callback:^(BOOL succeeded, UInt32 imageId, NSString * _Nullable errorMessage) {
    [callbackCalled fulfill];
    XCTAssertTrue(succeeded);
    XCTAssertEqual(imageId, expectedImageId);
  } timeoutAfter:30.0];
  XCTAssertEqual([XCTWaiter waitForExpectations:@[commandSent] timeout:3.0], XCTWaiterResultCompleted);

  [self.socket webSocket:self.webSocket didReceiveMessageWithString:@"{\"seq\":1,\"success\":true,\"image_id\":4566}"];

  XCTAssertEqual([XCTWaiter waitForExpectations:@[callbackCalled] timeout:3.0], XCTWaiterResultCompleted);
  OCMVerifyAll(self.webSocket);
}

// Verify that we propagate send_image failure response
- (void)testSendImage_failureResponse_propagatesFailure {
  XCTestExpectation *commandSent = [[XCTestExpectation alloc] initWithDescription:@"send_image sent"];
  OCMExpect([self.webSocket sendString:OCMOCK_ANY error:(NSError * __autoreleasing *)[OCMArg anyPointer]]).andDo(^(NSInvocation *invocation) {
    [commandSent fulfill];
  }).andReturn(YES);

  XCTestExpectation *callbackCalled = [[XCTestExpectation alloc] initWithDescription:@"callback called"];
  [self.socket sendImage:self.imageMessage callback:^(BOOL succeeded, UInt32 imageId, NSString * _Nullable errorMessage) {
    [callbackCalled fulfill];
    XCTAssertFalse(succeeded);
    XCTAssertEqual(imageId, 0);
    XCTAssertEqualObjects(errorMessage, @"test error message");
  } timeoutAfter:30.0];
  XCTAssertEqual([XCTWaiter waitForExpectations:@[commandSent] timeout:3.0], XCTWaiterResultCompleted);

  // TODO: Send failure response and verify callback
  [self.socket webSocket:self.webSocket didReceiveMessageWithString:@"{\"seq\":1,\"success\":false,\"error\":\"test error message\"}"];

  XCTAssertEqual([XCTWaiter waitForExpectations:@[callbackCalled] timeout:3.0], XCTWaiterResultCompleted);
  OCMVerifyAll(self.webSocket);
}

// Verify that we send image data
- (void)testSendImageData_sendsDataMessages {
  uint8_t idata[] = { 1, 2, 3, 4, 5, 6, 7, 8 };
  self.imageMessage.imageData = [NSData dataWithBytes:idata length:sizeof(idata)];
  uint8_t imessage[] = { 0x02, 0, 0, 0, 32, 0, 0, 0, 1, 1, 2, 3, 4, 5, 6, 7, 8 };
  NSData *expectedImageDataMessage = [NSData dataWithBytes:imessage length:sizeof(imessage)];
  uint8_t tdata[] = { 3, 4, 5, 6, 7, 8, 9, 10 };
  self.imageMessage.thumbnailData = [NSData dataWithBytes:tdata length:sizeof(tdata)];
  uint8_t tmessage[] = { 0x02, 0, 0, 0, 32, 0, 0, 0, 2, 3, 4, 5, 6, 7, 8, 9, 10 };
  NSData *expectedThumbnailDataMessage = [NSData dataWithBytes:tmessage length:sizeof(tmessage)];

  [self.socket sendImageData:self.imageMessage imageId:32 timeoutAfter:30.0];

  OCMVerify([self.webSocket sendData:expectedThumbnailDataMessage error:(NSError * __autoreleasing *)[OCMArg anyPointer]]);
  OCMVerify([self.webSocket sendData:expectedImageDataMessage error:(NSError * __autoreleasing *)[OCMArg anyPointer]]);
}

// Verify that we propagate received image events
- (void)testOnImage_sendsHeaderToDelegate {
  NSString *event = @"{\"command\":\"on_image\",\"channel\":\"testChannel\",\"from\":\"bogusSender\",\"message_id\":3209,\"type\":\"jpeg\",\"height\":640,\"width\":480}";
  XCTestExpectation *calledDelegate = [[XCTestExpectation alloc] initWithDescription:@"called delegate"];
  ZCCImageHeader *expected = [[ZCCImageHeader alloc] init];
  expected.channel = @"testChannel";
  expected.sender = @"bogusSender";
  expected.imageId = 3209;
  expected.imageType = ZCCImageTypeJPEG;
  expected.height = 640;
  expected.width = 480;
  expected.source = nil;
  OCMExpect([self.socketDelegate socket:self.socket didReceiveImageHeader:expected]).andDo(^(NSInvocation *invocation) {
    [calledDelegate fulfill];
  });

  [self.socket webSocket:self.webSocket didReceiveMessageWithString:event];

  XCTAssertEqual([XCTWaiter waitForExpectations:@[calledDelegate] timeout:3.0], XCTWaiterResultCompleted);
  OCMVerifyAll(self.socketDelegate);
}

// Verify that we propagate image data events
- (void)testReceiveImageData_sendsToDelegate {
  uint8_t tmessage[] = { 0x02, 0, 0, 0, 32, 0, 0, 0, 2, 3, 4, 5, 6, 7, 8, 9, 10 };
  NSData *tdata = [NSData dataWithBytes:tmessage length:sizeof(tmessage)];

  XCTestExpectation *receivedThumbnail = [[XCTestExpectation alloc] initWithDescription:@"Called delegate for thumbnail"];
  uint8_t expectedThumbnailBytes[] = { 3, 4, 5, 6, 7, 8, 9, 10 };
  NSData *expectedThumbnailData = [NSData dataWithBytes:expectedThumbnailBytes length:sizeof(expectedThumbnailBytes)];
  OCMExpect([self.socketDelegate socket:self.socket didReceiveImageData:expectedThumbnailData imageId:32 isThumbnail:YES]).andDo(^(NSInvocation *invocation) {
    [receivedThumbnail fulfill];
  });

  uint8_t imessage[] = { 0x02, 0, 0, 0, 32, 0, 0, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9 };
  NSData *idata = [NSData dataWithBytes:imessage length:sizeof(imessage)];
  uint8_t expectedImageBytes[] = { 2, 3, 4, 5, 6, 7, 8, 9 };
  NSData *expectedImageData = [NSData dataWithBytes:expectedImageBytes length:sizeof(expectedImageBytes)];
  XCTestExpectation *receivedImage = [[XCTestExpectation alloc] initWithDescription:@"Called delegate for image"];
  OCMExpect([self.socketDelegate socket:self.socket didReceiveImageData:expectedImageData imageId:32 isThumbnail:NO]).andDo(^(NSInvocation *invocation) {
    [receivedImage fulfill];
  });

  [self.socket webSocket:self.webSocket didReceiveMessageWithData:tdata];
  [self.socket webSocket:self.webSocket didReceiveMessageWithData:idata];

  XCTWaiterResult waiterResult = [XCTWaiter waitForExpectations:@[receivedThumbnail, receivedImage] timeout:3.0];
  XCTAssertEqual(waiterResult, XCTWaiterResultCompleted);
  OCMVerifyAll(self.socketDelegate);
}

#pragma mark Voice messages

// Verify we include recipient's name in start_stream if one is specified
- (void)testStartStream_recipient_sendsCorrectCommand {
  NSDictionary *expected = @{@"command":@"start_stream",
                             @"seq":@(1),
                             @"type":@"audio",
                             @"codec":@"opus",
                             @"codec_header":@"QB8BPA==",
                             @"packet_duration":@(60),
                             @"for":@"bogusUser"};
  OCMExpect([self.webSocket sendString:[OCMArg checkWithBlock:^BOOL(NSString *message) {
    return messageIsEqualToDictionary(message, expected);
  }] error:(NSError * __autoreleasing *)[OCMArg anyPointer]]).andReturn(YES);

  id recorder = OCMProtocolMock(@protocol(ZCCAudioSource));
  ZCCEncoder *encoder = [[ZCCEncoderOpus alloc] initWithRecorder:recorder];
  ZCCStreamParams *params = [[ZCCStreamParams alloc] initWithType:@"audio" encoder:encoder];
  [self.socket sendStartStreamWithParams:params recipient:@"bogusUser" callback:^(BOOL succeeded, NSUInteger streamId, NSString * _Nullable errorMessage) {
  } timeoutAfter:30.0];

  OCMVerifyAll(self.webSocket);
}

#pragma mark Texting

// Verify that we send the right command for a text to the whole channel
- (void)testSendText_noUser_sendsCommand {
  NSDictionary *expected = @{@"command":@"send_text_message",
                             @"seq":@(1),
                             @"text":@"test message"};
  OCMExpect([self.webSocket sendString:[OCMArg checkWithBlock:^BOOL(NSString *message) {
    return messageIsEqualToDictionary(message, expected);
  }] error:(NSError * __autoreleasing *)[OCMArg anyPointer]]).andReturn(YES);

  [self.socket sendTextMessage:@"test message" recipient:nil timeoutAfter:30.0];

  OCMVerifyAll(self.webSocket);
}

// Verify that we send the right command for a text to a specific user
- (void)testSendText_toUser_sendsCommand {
  NSDictionary *expected = @{@"command":@"send_text_message",
                             @"seq":@(1),
                             @"text":@"test message",
                             @"for":@"bogusUser"};
  OCMExpect([self.webSocket sendString:[OCMArg checkWithBlock:^BOOL(NSString *message) {
    return messageIsEqualToDictionary(message, expected);
  }] error:(NSError * __autoreleasing *)[OCMArg anyPointer]]).andReturn(YES);

  [self.socket sendTextMessage:@"test message" recipient:@"bogusUser" timeoutAfter:30.0];

  OCMVerifyAll(self.webSocket);
}

- (void)testReceiveText_postsToDelegate {
  NSString *event = @"{\"command\":\"on_text_message\",\"channel\":\"exampleChannel\",\"from\":\"exampleSender\",\"message_id\":3456,\"text\":\"my test message\"}";
  XCTestExpectation *receivedText = [[XCTestExpectation alloc] initWithDescription:@"delegate called"];
  OCMExpect([self.socketDelegate socket:self.socket didReceiveTextMessage:@"my test message" sender:@"exampleSender"]).andDo(^(NSInvocation *invocation) {
    [receivedText fulfill];
  });

  [self.socket webSocket:self.webSocket didReceiveMessageWithString:event];

  XCTAssertEqual([XCTWaiter waitForExpectations:@[receivedText] timeout:3.0], XCTWaiterResultCompleted);
  OCMVerifyAll(self.socketDelegate);
}

- (void)testReceiveText_invalidMessages {
  // Missing message text
  NSString *event = @"{\"command\":\"on_text_message\",\"channel\":\"exampleChannel\",\"from\":\"exampleSender\",\"message_id\":1234}";
  XCTestExpectation *posted = [[XCTestExpectation alloc] initWithDescription:@"delegate called"];
  OCMExpect([self.socketDelegate socket:self.socket didReceiveUnrecognizedMessage:event]).andDo(^(NSInvocation *invocation) {
    [posted fulfill];
  });

  [self.socket webSocket:self.webSocket didReceiveMessageWithString:event];

  XCTAssertEqual([XCTWaiter waitForExpectations:@[posted] timeout:3.0], XCTWaiterResultCompleted);
  OCMVerifyAll(self.socketDelegate);

  event = @"{\"command\":\"on_text_message\",\"channel\":\"exampleChannel\",\"message_id\":1234,\"text\":\"my test message\"}";
  XCTestExpectation *again = [[XCTestExpectation alloc] initWithDescription:@"delegate called"];
  OCMExpect([self.socketDelegate socket:self.socket didReceiveUnrecognizedMessage:event]).andDo(^(NSInvocation *invocation) {
    [again fulfill];
  });

  [self.socket webSocket:self.webSocket didReceiveMessageWithString:event];

  XCTAssertEqual([XCTWaiter waitForExpectations:@[again] timeout:3.0], XCTWaiterResultCompleted);
  OCMVerifyAll(self.socketDelegate);
}

@end
