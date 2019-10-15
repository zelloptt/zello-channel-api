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
#import "ZCCErrors.h"
#import "ZCCEncoder.h"
#import "ZCCEncoderOpus.h"
#import "ZCCImageHeader.h"
#import "ZCCImageMessage.h"
#import "ZCCLocationInfo.h"
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

@interface ZCCLocationInfo (Testing)
@property (nonatomic) double latitude;
@property (nonatomic) double longitude;
@property (nonatomic) double accuracy;
@property (nonatomic, copy, nullable) NSString *address;
@end

@interface ZCCSocketTests : XCTestCase
@property (nonatomic, strong) ZCCSocket *socket;
/// Mocked ZCCSocketDelegate
@property (nonatomic, strong) id socketDelegate;

/// Mocked underlying ZCCSRWebSocket
@property (nonatomic, strong) id webSocket;
/// Mocked ZCCAudioSource
@property (nonatomic, strong) id audioSource;
/// Encoder wrapping the mocked audio source
@property (nonatomic, strong) ZCCEncoder *encoder;
/// Stream params specifying the encoder
@property (nonatomic, strong) ZCCStreamParams *streamParams;

@property (nonatomic, strong) XCTestExpectation *logonCallbackCalled;

@property (nonatomic, strong) ZCCImageMessage *imageMessage;
@property (nonatomic, readonly) NSDictionary *onStreamStartEvent;
@property (nonatomic, readonly) NSDictionary *onLocationEvent;
@property (nonatomic, readonly) NSDictionary *onImageEvent;

@property (nonatomic, readonly) NSDictionary *simpleExpectedLocationCommand;
@property (nonatomic, readonly) ZCCLocationInfo *simpleLocationInfo;
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
  self.audioSource = OCMProtocolMock(@protocol(ZCCAudioSource));
  self.encoder = [[ZCCEncoderOpus alloc] initWithRecorder:self.audioSource];
  self.streamParams = [[ZCCStreamParams alloc] initWithType:@"audio" encoder:self.encoder];

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

#pragma mark - Properties

- (NSDictionary *)onImageEvent {
  return @{@"command":@"on_image",
           @"channel":@"testChannel",
           @"from":@"bogusSender",
           @"message_id":@(3209),
           @"type":@"jpeg",
           @"height":@(640),
           @"width":@(480)};
}


- (NSDictionary *)onLocationEvent {
  return @{@"command":@"on_location",
           @"channel":@"test",
           @"from":@"bogusSender",
           @"message_id":@(123),
           @"latitude":@(45.0),
           @"longitude":@(32.0),
           @"formatted_address":@"Margaritaville",
           @"accuracy":@(25.0)};
}

- (NSDictionary *)onStreamStartEvent {
  return @{@"command":@"on_stream_start",
           @"type":@"audio",
           @"codec":@"opus",
           @"codec_header":@"Ym9ndXNoZWFkZXIK",
           @"packet_duration":@(5),
           @"stream_id":@(12345),
           @"channel":@"test",
           @"from":@"bogusSender"};
}

- (NSDictionary *)simpleExpectedLocationCommand {
  return @{@"command":@"send_location",
           @"seq":@(1),
           @"latitude":@(23.0),
           @"longitude":@(14.0),
           @"accuracy":@(100.0)};
}

- (ZCCLocationInfo *)simpleLocationInfo {
  ZCCLocationInfo *location = [[ZCCLocationInfo alloc] init];
  location.latitude = 23.0;
  location.longitude = 14.0;
  location.accuracy = 100.0;
  return location;
}

#pragma mark - Tests

#pragma mark Error reporting

// Verify that we report a malformed JSON object
- (void)testMalformedJSON_reportsError {
  XCTestExpectation *reportedError = [[XCTestExpectation alloc] initWithDescription:@"reported error"];
  OCMExpect([self.socketDelegate socket:self.socket didEncounterErrorParsingMessage:OCMOCK_ANY]).andDo(^(NSInvocation *invocation) {
    __unsafe_unretained NSError *error;
    [invocation getArgument:&error atIndex:3];
    XCTAssertEqualObjects(error.domain, ZCCErrorDomain);
    XCTAssertEqual(error.code, ZCCErrorCodeBadResponse);
    NSDictionary *userInfo = error.userInfo;
    XCTAssertEqualObjects(userInfo[ZCCServerInvalidMessageKey], @"{\"start a message and then...");
    [reportedError fulfill];
  });
  [self.socket webSocket:self.webSocket didReceiveMessageWithString:@"{\"start a message and then..."];

  XCTAssertEqual([XCTWaiter waitForExpectations:@[reportedError] timeout:3.0], XCTWaiterResultCompleted);
  OCMVerifyAll(self.socketDelegate);
}

// Verify that we report a JSON object with a missing or unrecognized command
- (void)testMalformedJSON_missingCommand_reportsError {
  NSString *command = @"{\"someKey\":\"someValue\"}";
  [self verifyInvalidCommand:nil message:command reportsErrorForKey:@"command" description:@"command missing or not string"];
}

- (void)testMalformedJSON_unrecognizedCommand_reportsError {
  NSString *command = @"{\"command\":\"unused\"}";
  [self verifyInvalidCommand:@"unused" message:command reportsErrorForKey:@"command" description:@"unrecognized command"];
}

// Verify that we report an error parsing the error message from a server error event
- (void)testOnError_missingErrorMessage_reportsError {
  NSString *event = @"{\"command\":\"on_error\"}";
  [self verifyInvalidCommand:@"on_error" message:event reportsErrorForKey:@"error" description:@"error missing or not string"];
}

#pragma mark Websocket

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

#pragma mark Logon

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
    XCTAssertTrue(succeeded);
    XCTAssertEqual(imageId, expectedImageId);
    [callbackCalled fulfill];
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
    XCTAssertFalse(succeeded);
    XCTAssertEqual(imageId, 0);
    XCTAssertEqualObjects(errorMessage, @"test error message");
    [callbackCalled fulfill];
  } timeoutAfter:30.0];
  XCTAssertEqual([XCTWaiter waitForExpectations:@[commandSent] timeout:3.0], XCTWaiterResultCompleted);

  [self.socket webSocket:self.webSocket didReceiveMessageWithString:@"{\"seq\":1,\"success\":false,\"error\":\"test error message\"}"];

  XCTAssertEqual([XCTWaiter waitForExpectations:@[callbackCalled] timeout:3.0], XCTWaiterResultCompleted);
  OCMVerifyAll(self.webSocket);
}

// Verify that we report an error on send_image timeout
- (void)testSendImage_timesOut_propagatesFailure {
  XCTestExpectation *commandSent = [[XCTestExpectation alloc] initWithDescription:@"send_image sent"];
  OCMExpect([self.webSocket sendString:OCMOCK_ANY error:(NSError * __autoreleasing *)[OCMArg anyPointer]]).andDo(^(NSInvocation *invocation) {
    [commandSent fulfill];
  }).andReturn(YES);

  XCTestExpectation *callbackCalled = [[XCTestExpectation alloc] initWithDescription:@"callback called"];
  [self.socket sendImage:self.imageMessage callback:^(BOOL succeeded, UInt32 imageId, NSString * _Nullable errorMessage) {
    XCTAssertFalse(succeeded);
    XCTAssertEqual(imageId, 0);
    XCTAssertEqualObjects(errorMessage, @"Send image timed out");
    [callbackCalled fulfill];
  } timeoutAfter:1.0];

  XCTWaiterResult waitResult = [XCTWaiter waitForExpectations:@[commandSent, callbackCalled] timeout:3.0];
  XCTAssertEqual(waitResult, XCTWaiterResultCompleted);
  OCMVerifyAll(self.webSocket);
}

// Verify that we report an error if the websocket returns false
- (void)testSendImage_synchronousWebsocketError_propagatesFailure {
  OCMExpect([self.webSocket sendString:OCMOCK_ANY error:(NSError * __autoreleasing *)[OCMArg anyPointer]]).andReturn(NO);

  XCTestExpectation *callbackCalled = [[XCTestExpectation alloc] initWithDescription:@"callback called"];
  [self.socket sendImage:self.imageMessage callback:^(BOOL succeeded, UInt32 imageId, NSString * _Nullable errorMessage) {
    XCTAssertFalse(succeeded);
    XCTAssertEqualObjects(errorMessage, @"Failed to send");
    [callbackCalled fulfill];
  } timeoutAfter:30.0];

  XCTAssertEqual([XCTWaiter waitForExpectations:@[callbackCalled] timeout:3.0], XCTWaiterResultCompleted);
  OCMVerifyAll(self.webSocket);
}

// Verify error for missing image id in send_image response
- (void)testSendImage_responseMissingImageId_reportsError {
  XCTestExpectation *commandSent = [[XCTestExpectation alloc] initWithDescription:@"send_image sent"];
  OCMExpect([self.webSocket sendString:OCMOCK_ANY error:(NSError * __autoreleasing *)[OCMArg anyPointer]]).andDo(^(NSInvocation *invocation) {
    [commandSent fulfill];
  }).andReturn(YES);

  XCTestExpectation *callbackCalled = [[XCTestExpectation alloc] initWithDescription:@"callback called"];
  [self.socket sendImage:self.imageMessage callback:^(BOOL succeeded, UInt32 imageId, NSString * _Nullable errorMessage) {
    XCTAssertFalse(succeeded);
    XCTAssertEqual(imageId, 0);
    XCTAssertEqualObjects(errorMessage, @"image_id missing or invalid");
    [callbackCalled fulfill];
  } timeoutAfter:30.0];
  XCTAssertEqual([XCTWaiter waitForExpectations:@[commandSent] timeout:3.0], XCTWaiterResultCompleted);

  [self.socket webSocket:self.webSocket didReceiveMessageWithString:@"{\"seq\":1,\"success\":true}"];

  XCTAssertEqual([XCTWaiter waitForExpectations:@[callbackCalled] timeout:3.0], XCTWaiterResultCompleted);
  OCMVerifyAll(self.webSocket);
}

// Verify error for image id underflow in send_image response
- (void)testSendImage_responseImageIdUnderflow_reportsError {
  XCTestExpectation *commandSent = [[XCTestExpectation alloc] initWithDescription:@"send_image sent"];
  OCMExpect([self.webSocket sendString:OCMOCK_ANY error:(NSError * __autoreleasing *)[OCMArg anyPointer]]).andDo(^(NSInvocation *invocation) {
    [commandSent fulfill];
  }).andReturn(YES);

  XCTestExpectation *callbackCalled = [[XCTestExpectation alloc] initWithDescription:@"callback called"];
  [self.socket sendImage:self.imageMessage callback:^(BOOL succeeded, UInt32 imageId, NSString * _Nullable errorMessage) {
    XCTAssertFalse(succeeded);
    XCTAssertEqual(imageId, 0);
    XCTAssertEqualObjects(errorMessage, @"image_id (-1) out of range");
    [callbackCalled fulfill];
  } timeoutAfter:30.0];
  XCTAssertEqual([XCTWaiter waitForExpectations:@[commandSent] timeout:3.0], XCTWaiterResultCompleted);

  [self.socket webSocket:self.webSocket didReceiveMessageWithString:@"{\"seq\":1,\"success\":true,\"image_id\":-1}"];

  XCTAssertEqual([XCTWaiter waitForExpectations:@[callbackCalled] timeout:3.0], XCTWaiterResultCompleted);
  OCMVerifyAll(self.webSocket);
}

// Verify error for image id overflow in send_image response
- (void)testSendImage_responseImageIdOverflow_reportsError {
  XCTestExpectation *commandSent = [[XCTestExpectation alloc] initWithDescription:@"send_image sent"];
  OCMExpect([self.webSocket sendString:OCMOCK_ANY error:(NSError * __autoreleasing *)[OCMArg anyPointer]]).andDo(^(NSInvocation *invocation) {
    [commandSent fulfill];
  }).andReturn(YES);

  XCTestExpectation *callbackCalled = [[XCTestExpectation alloc] initWithDescription:@"callback called"];
  [self.socket sendImage:self.imageMessage callback:^(BOOL succeeded, UInt32 imageId, NSString * _Nullable errorMessage) {
    XCTAssertFalse(succeeded);
    XCTAssertEqual(imageId, 0);
    XCTAssertEqualObjects(errorMessage, @"image_id (17179869184) out of range");
    [callbackCalled fulfill];
  } timeoutAfter:30.0];
  XCTAssertEqual([XCTWaiter waitForExpectations:@[commandSent] timeout:3.0], XCTWaiterResultCompleted);

  [self.socket webSocket:self.webSocket didReceiveMessageWithString:@"{\"seq\":1,\"success\":true,\"image_id\":17179869184}"];

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

  [self.socket sendImageData:self.imageMessage imageId:32];

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

// Verify that we propagate errors for invalid image header messages
// Verify error for missing sender
- (void)testOnImage_missingSender_reportsError {
  OCMReject([self.socketDelegate socket:OCMOCK_ANY didReceiveImageHeader:OCMOCK_ANY]);
  NSString *event = [self onImageEventWithoutKey:@"from"];
  [self verifyInvalidCommand:@"on_image" message:event reportsErrorForKey:@"from" description:@"from missing or invalid"];
}

// Verify error for missing image id
- (void)testOnImage_missingImageId_reportsError {
  OCMReject([self.socketDelegate socket:OCMOCK_ANY didReceiveImageHeader:OCMOCK_ANY]);
  NSString *event = [self onImageEventWithoutKey:@"message_id"];
  [self verifyInvalidCommand:@"on_image" message:event reportsErrorForKey:@"message_id" description:@"message_id missing or invalid"];
}

// Verify error for image id underflow
- (void)testOnImage_imageIdUnderflow_reportsError {
  OCMReject([self.socketDelegate socket:OCMOCK_ANY didReceiveImageHeader:OCMOCK_ANY]);
  NSMutableDictionary *oob = [self.onImageEvent mutableCopy];
  oob[@"message_id"] = @(-1);
  NSString *event = [[NSString alloc] initWithData:[NSJSONSerialization dataWithJSONObject:oob options:0 error:NULL] encoding:NSUTF8StringEncoding];
  [self verifyInvalidCommand:@"on_image" message:event reportsErrorForKey:@"message_id" description:@"message_id out of range"];
}

// Verify error for image id overflow
- (void)testOnImage_imageIdOverflow_reportsError {
  OCMReject([self.socketDelegate socket:OCMOCK_ANY didReceiveImageHeader:OCMOCK_ANY]);
  NSMutableDictionary *oob = [self.onImageEvent mutableCopy];
  oob[@"message_id"] = @(1ll << 34);
  NSString *event = [[NSString alloc] initWithData:[NSJSONSerialization dataWithJSONObject:oob options:0 error:NULL] encoding:NSUTF8StringEncoding];
  [self verifyInvalidCommand:@"on_image" message:event reportsErrorForKey:@"message_id" description:@"message_id out of range"];
}

// Verify error for missing type
- (void)testOnImage_missingType_reportsError {
  OCMReject([self.socketDelegate socket:OCMOCK_ANY didReceiveImageHeader:OCMOCK_ANY]);
  NSString *event = [self onImageEventWithoutKey:@"type"];
  [self verifyInvalidCommand:@"on_image" message:event reportsErrorForKey:@"type" description:@"type missing or invalid"];
}

// Verify error for height underflow
- (void)testOnImage_heightUnderflow_reportsError {
  OCMReject([self.socketDelegate socket:OCMOCK_ANY didReceiveImageHeader:OCMOCK_ANY]);
  NSMutableDictionary *oob = [self.onImageEvent mutableCopy];
  oob[@"height"] = @(-1);
  NSString *event = [[NSString alloc] initWithData:[NSJSONSerialization dataWithJSONObject:oob options:0 error:NULL] encoding:NSUTF8StringEncoding];
  [self verifyInvalidCommand:@"on_image" message:event reportsErrorForKey:@"height" description:@"height out of range"];
}

// Verify error for height overflow
- (void)testOnImage_heightOverflow_reportsError {
  OCMReject([self.socketDelegate socket:OCMOCK_ANY didReceiveImageHeader:OCMOCK_ANY]);
  NSMutableDictionary *oob = [self.onImageEvent mutableCopy];
  oob[@"height"] = @(1ll << 34);
  NSString *event = [[NSString alloc] initWithData:[NSJSONSerialization dataWithJSONObject:oob options:0 error:NULL] encoding:NSUTF8StringEncoding];
  [self verifyInvalidCommand:@"on_image" message:event reportsErrorForKey:@"height" description:@"height out of range"];
}

// Verify error for width underflow
- (void)testOnImage_widthUnderflow_reportsError {
  OCMReject([self.socketDelegate socket:OCMOCK_ANY didReceiveImageHeader:OCMOCK_ANY]);
  NSMutableDictionary *oob = [self.onImageEvent mutableCopy];
  oob[@"width"] = @(-1);
  NSString *event = [[NSString alloc] initWithData:[NSJSONSerialization dataWithJSONObject:oob options:0 error:NULL] encoding:NSUTF8StringEncoding];
  [self verifyInvalidCommand:@"on_image" message:event reportsErrorForKey:@"width" description:@"width out of range"];
}

// Verify error for width overflow
- (void)testOnImage_widthOverflow_reportsError {
  OCMReject([self.socketDelegate socket:OCMOCK_ANY didReceiveImageHeader:OCMOCK_ANY]);
  NSMutableDictionary *oob = [self.onImageEvent mutableCopy];
  oob[@"width"] = @(1ll << 34);
  NSString *event = [[NSString alloc] initWithData:[NSJSONSerialization dataWithJSONObject:oob options:0 error:NULL] encoding:NSUTF8StringEncoding];
  [self verifyInvalidCommand:@"on_image" message:event reportsErrorForKey:@"width" description:@"width out of range"];
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

  [self.socket sendStartStreamWithParams:self.streamParams recipient:@"bogusUser" callback:^(BOOL succeeded, NSUInteger streamId, NSString * _Nullable errorMessage) {
  } timeoutAfter:30.0];

  OCMVerifyAll(self.webSocket);
}

// Verify error for missing stream id in start_stream response
- (void)testStartStream_responseMissingStreamId_reportsError {
  NSDictionary *startStream = @{@"command":@"start_stream",
                                @"seq":@(1),
                                @"type":@"audio",
                                @"codec":@"opus",
                                @"codec_header":@"QB8BPA==",
                                @"packet_duration":@(60)};
  XCTestExpectation *sentStart = [[XCTestExpectation alloc] initWithDescription:@"sent stream_start"];
  OCMStub([self.webSocket sendString:[OCMArg checkWithBlock:^BOOL(NSString *message) {
    return messageIsEqualToDictionary(message, startStream);
  }] error:(NSError * __autoreleasing *)[OCMArg anyPointer]]).andDo(^(NSInvocation *invocation) {
    [sentStart fulfill];
  }).andReturn(YES);

  XCTestExpectation *reportedError = [[XCTestExpectation alloc] initWithDescription:@"reported error"];
  [self.socket sendStartStreamWithParams:self.streamParams recipient:nil callback:^(BOOL succeeded, NSUInteger streamId, NSString * _Nullable errorMessage) {
    XCTAssertFalse(succeeded);
    XCTAssertEqual(streamId, 0);
    XCTAssertEqualObjects(errorMessage, @"stream_id missing or invalid");
    [reportedError fulfill];
  } timeoutAfter:30.0];

  XCTAssertEqual([XCTWaiter waitForExpectations:@[sentStart] timeout:3.0], XCTWaiterResultCompleted);
  NSString *response = @"{\"seq\":1,\"success\":true}";
  [self.socket webSocket:self.webSocket didReceiveMessageWithString:response];

  XCTAssertEqual([XCTWaiter waitForExpectations:@[reportedError] timeout:3.0], XCTWaiterResultCompleted);
}

// Verify error for stream id underflow in start_stream response
- (void)testStartStream_streamIdUnderflow_reportsError {
  NSDictionary *startStream = @{@"command":@"start_stream",
                                @"seq":@(1),
                                @"type":@"audio",
                                @"codec":@"opus",
                                @"codec_header":@"QB8BPA==",
                                @"packet_duration":@(60)};
  XCTestExpectation *sentStart = [[XCTestExpectation alloc] initWithDescription:@"sent stream_start"];
  OCMStub([self.webSocket sendString:[OCMArg checkWithBlock:^BOOL(NSString *message) {
    return messageIsEqualToDictionary(message, startStream);
  }] error:(NSError * __autoreleasing *)[OCMArg anyPointer]]).andDo(^(NSInvocation *invocation) {
    [sentStart fulfill];
  }).andReturn(YES);

  XCTestExpectation *reportedError = [[XCTestExpectation alloc] initWithDescription:@"reported error"];
  [self.socket sendStartStreamWithParams:self.streamParams recipient:nil callback:^(BOOL succeeded, NSUInteger streamId, NSString * _Nullable errorMessage) {
    XCTAssertFalse(succeeded);
    XCTAssertEqual(streamId, 0);
    XCTAssertEqualObjects(errorMessage, @"stream_id out of range");
    [reportedError fulfill];
  } timeoutAfter:30.0];

  XCTAssertEqual([XCTWaiter waitForExpectations:@[sentStart] timeout:3.0], XCTWaiterResultCompleted);
  NSString *response = @"{\"seq\":1,\"success\":true,\"stream_id\":-2}";
  [self.socket webSocket:self.webSocket didReceiveMessageWithString:response];

  XCTAssertEqual([XCTWaiter waitForExpectations:@[reportedError] timeout:3.0], XCTWaiterResultCompleted);
}

// Verify error for stream id overflow in start_stream response
- (void)testStartStream_streamIdOverflow_reportsError {
  NSDictionary *startStream = @{@"command":@"start_stream",
                                @"seq":@(1),
                                @"type":@"audio",
                                @"codec":@"opus",
                                @"codec_header":@"QB8BPA==",
                                @"packet_duration":@(60)};
  XCTestExpectation *sentStart = [[XCTestExpectation alloc] initWithDescription:@"sent stream_start"];
  OCMStub([self.webSocket sendString:[OCMArg checkWithBlock:^BOOL(NSString *message) {
    return messageIsEqualToDictionary(message, startStream);
  }] error:(NSError * __autoreleasing *)[OCMArg anyPointer]]).andDo(^(NSInvocation *invocation) {
    [sentStart fulfill];
  }).andReturn(YES);

  XCTestExpectation *reportedError = [[XCTestExpectation alloc] initWithDescription:@"reported error"];
  [self.socket sendStartStreamWithParams:self.streamParams recipient:nil callback:^(BOOL succeeded, NSUInteger streamId, NSString * _Nullable errorMessage) {
    XCTAssertFalse(succeeded);
    XCTAssertEqual(streamId, 0);
    XCTAssertEqualObjects(errorMessage, @"stream_id out of range");
    [reportedError fulfill];
  } timeoutAfter:30.0];

  XCTAssertEqual([XCTWaiter waitForExpectations:@[sentStart] timeout:3.0], XCTWaiterResultCompleted);
  NSString *response = @"{\"seq\":1,\"success\":true,\"stream_id\":17179869184}";
  [self.socket webSocket:self.webSocket didReceiveMessageWithString:response];

  XCTAssertEqual([XCTWaiter waitForExpectations:@[reportedError] timeout:3.0], XCTWaiterResultCompleted);
}

// Verify that we report errors parsing the stream start event
- (void)testOnStreamStart_missingType_reportsError {
  NSString *command = [self onStreamStartEventWithoutKey:@"type"];
  [self verifyInvalidCommand:@"on_stream_start" message:command reportsErrorForKey:@"type" description:@"type is missing or invalid"];
}

- (void)testOnStreamStart_missingCodec_reportsError {
  NSString *command = [self onStreamStartEventWithoutKey:@"codec"];
  [self verifyInvalidCommand:@"on_stream_start" message:command reportsErrorForKey:@"codec" description:@"codec is missing or invalid"];
}

- (void)testOnStreamStart_missingCodecHeader_reportsError {
  NSString *command = [self onStreamStartEventWithoutKey:@"codec_header"];
  [self verifyInvalidCommand:@"on_stream_start" message:command reportsErrorForKey:@"codec_header" description:@"codec_header missing or invalid"];
}

- (void)testOnStreamStart_missingPacketDuration_reportsError {
  NSString *command = [self onStreamStartEventWithoutKey:@"packet_duration"];
  [self verifyInvalidCommand:@"on_stream_start" message:command reportsErrorForKey:@"packet_duration" description:@"packet_duration missing or not a number"];
}

- (void)testOnStreamStart_packetDurationUnderflow_reportsError {
  NSMutableDictionary *outOfBounds = [self.onStreamStartEvent mutableCopy];
  outOfBounds[@"packet_duration"] = @(-1);
  NSString *command = [[NSString alloc] initWithData:[NSJSONSerialization dataWithJSONObject:outOfBounds options:0 error:NULL] encoding:NSUTF8StringEncoding];
  [self verifyInvalidCommand:@"on_stream_start" message:command reportsErrorForKey:@"packet_duration" description:@"packet_duration out of range"];
}

- (void)testOnStreamStart_missingStreamId_reportsError {
  NSString *command = [self onStreamStartEventWithoutKey:@"stream_id"];
  [self verifyInvalidCommand:@"on_stream_start" message:command reportsErrorForKey:@"stream_id" description:@"stream_id missing or invalid"];
}

- (void)testOnStreamStart_streamIdUnderflow_reportsError {
  NSMutableDictionary *oob = [self.onStreamStartEvent mutableCopy];
  oob[@"stream_id"] = @(-1);
  NSString *command = [[NSString alloc] initWithData:[NSJSONSerialization dataWithJSONObject:oob options:0 error:NULL] encoding:NSUTF8StringEncoding];
  [self verifyInvalidCommand:@"on_stream_start" message:command reportsErrorForKey:@"stream_id" description:@"stream_id out of range"];
}

- (void)testOnStreamStart_streamIdOverflow_reportsError {
  NSMutableDictionary *oob = [self.onStreamStartEvent mutableCopy];
  oob[@"stream_id"] = @(1ll << 34);
  NSString *command = [[NSString alloc] initWithData:[NSJSONSerialization dataWithJSONObject:oob options:0 error:NULL] encoding:NSUTF8StringEncoding];
  [self verifyInvalidCommand:@"on_stream_start" message:command reportsErrorForKey:@"stream_id" description:@"stream_id out of range"];
}

- (void)testOnStreamStart_missingChannel_reportsError {
  NSString *command = [self onStreamStartEventWithoutKey:@"channel"];
  [self verifyInvalidCommand:@"on_stream_start" message:command reportsErrorForKey:@"channel" description:@"channel missing or invalid"];
}

- (void)testOnStreamStart_missingSender_reportsError {
  NSString *command = [self onStreamStartEventWithoutKey:@"from"];
  [self verifyInvalidCommand:@"on_stream_start" message:command reportsErrorForKey:@"from" description:@"from missing or invalid"];
}

// Verify that we report errors parsing the stream stop event
- (void)testOnStreamStop_missingStreamId_reportsError {
  NSString *command = @"{\"command\":\"on_stream_stop\"}";
  [self verifyInvalidCommand:@"on_stream_stop" message:command reportsErrorForKey:@"stream_id" description:@"stream_id missing or invalid"];
}

- (void)testOnStreamStop_streamIdUnderflow_reportsError {
  NSString *command = @"{\"command\":\"on_stream_stop\",\"stream_id\":-3}";
  [self verifyInvalidCommand:@"on_stream_stop" message:command reportsErrorForKey:@"stream_id" description:@"stream_id out of range"];
}

- (void)testOnStreamStop_streamIdOverflow_reportsError {
  NSString *command = @"{\"command\":\"on_stream_stop\",\"stream_id\":17179869184}";
  [self verifyInvalidCommand:@"on_stream_stop" message:command reportsErrorForKey:@"stream_id" description:@"stream_id out of range"];
}

#pragma mark Locations

// Verify we send location
- (void)testSendLocation_sendsCorrectCommand {
  OCMExpect([self.webSocket sendString:[OCMArg checkWithBlock:^BOOL(NSString *message) {
    return messageIsEqualToDictionary(message, self.simpleExpectedLocationCommand);
  }] error:(NSError * __autoreleasing *)[OCMArg anyPointer]]).andReturn(YES);

  [self.socket sendLocation:self.simpleLocationInfo recipient:nil timeoutAfter:30.0];

  OCMVerifyAll(self.webSocket);
}

// Verify we send location with "for" parameter when a recipient is specified
- (void)testSendLocation_recipient_sendsCorrectCommand {
  NSDictionary *expected = @{@"command":@"send_location",
                             @"seq":@(1),
                             @"latitude":@(34.0),
                             @"longitude":@(0.5),
                             @"accuracy":@(100.0),
                             @"for":@"bogusUser"};
  OCMExpect([self.webSocket sendString:[OCMArg checkWithBlock:^BOOL(NSString *message) {
    return messageIsEqualToDictionary(message, expected);
  }] error:(NSError * __autoreleasing *)[OCMArg anyPointer]]).andReturn(YES);

  ZCCLocationInfo *location = [[ZCCLocationInfo alloc] init];
  location.latitude = 34.0;
  location.longitude = 0.5;
  location.accuracy = 100.0;
  [self.socket sendLocation:location recipient:@"bogusUser" timeoutAfter:30.0];

  OCMVerifyAll(self.webSocket);
}

// Verify we send formatted address when one is available
- (void)testSendLocation_withAddress_sendsCorrectCommand {
  NSDictionary *expected = @{@"command":@"send_location",
                             @"seq":@(1),
                             @"latitude":@(23.0),
                             @"longitude":@(14.0),
                             @"accuracy":@(100.0),
                             @"formatted_address":@"My fancy address, Zello Inc."};
  OCMExpect([self.webSocket sendString:[OCMArg checkWithBlock:^BOOL(NSString *message) {
    return messageIsEqualToDictionary(message, expected);
  }] error:(NSError * __autoreleasing *)[OCMArg anyPointer]]).andReturn(YES);

  ZCCLocationInfo *location = [[ZCCLocationInfo alloc] init];
  location.latitude = 23.0;
  location.longitude = 14.0;
  location.accuracy = 100.0;
  location.address = @"My fancy address, Zello Inc.";
  [self.socket sendLocation:location recipient:nil timeoutAfter:30.0];

  OCMVerifyAll(self.webSocket);
}

// Verify that we handle failure to send from the underlying web socket
- (void)testSendLocation_errorSending_reportsError {
  OCMExpect([self.webSocket sendString:[OCMArg checkWithBlock:^BOOL(NSString *message) {
    return messageIsEqualToDictionary(message, self.simpleExpectedLocationCommand);
  }] error:(NSError * __autoreleasing *)[OCMArg anyPointer]]).andReturn(NO);
  XCTestExpectation *errorReported = [[XCTestExpectation alloc] initWithDescription:@"Error reported to delegate"];
  OCMExpect([self.socketDelegate socket:self.socket didReportError:@"Failed to send"]).andDo(^(NSInvocation *invocation) {
    [errorReported fulfill];
  });

  [self.socket sendLocation:self.simpleLocationInfo recipient:nil timeoutAfter:30.0];

  XCTAssertEqual([XCTWaiter waitForExpectations:@[errorReported] timeout:3.0], XCTWaiterResultCompleted);
  OCMVerifyAll(self.webSocket);
  OCMVerifyAll(self.socketDelegate);
}

// Verify that we handle an error reported from the server
- (void)testSendLocation_serverError_reportsError {
  OCMExpect([self.webSocket sendString:[OCMArg checkWithBlock:^BOOL(NSString *message) {
    return messageIsEqualToDictionary(message, self.simpleExpectedLocationCommand);
  }] error:(NSError * __autoreleasing *)[OCMArg anyPointer]]).andReturn(YES);
  __block BOOL tooEarly = YES;
  XCTestExpectation *errorReported = [[XCTestExpectation alloc] initWithDescription:@"Error reported to delegate"];
  OCMExpect([self.socketDelegate socket:self.socket didReportError:OCMOCK_ANY]).andDo(^(NSInvocation *invocation) {
    XCTAssertFalse(tooEarly);
    __unsafe_unretained NSString *errorMessage;
    [invocation getArgument:&errorMessage atIndex:3];
    XCTAssertEqualObjects(errorMessage, @"Fancy error message");
    [errorReported fulfill];
  });

  [self.socket sendLocation:self.simpleLocationInfo recipient:nil timeoutAfter:30.0];

  tooEarly = NO;
  NSString *errorResponse = @"{\"seq\":1,\"success\":false,\"error\":\"Fancy error message\"}";
  [self.socket webSocket:self.webSocket didReceiveMessageWithString:errorResponse];
  XCTAssertEqual([XCTWaiter waitForExpectations:@[errorReported] timeout:3.0], XCTWaiterResultCompleted);
}

// Verify that we handle a timed-out request
- (void)testSendLocation_timesOut_reportsError {
  OCMExpect([self.webSocket sendString:[OCMArg checkWithBlock:^BOOL(NSString *message) {
    return messageIsEqualToDictionary(message, self.simpleExpectedLocationCommand);
  }] error:(NSError * __autoreleasing *)[OCMArg anyPointer]]).andReturn(YES);
  XCTestExpectation *timeoutReported = [[XCTestExpectation alloc] initWithDescription:@"Timeout reported to delegate"];
  OCMExpect([self.socketDelegate socket:self.socket didReportError:@"Send location timed out"]).andDo(^(NSInvocation *invocation) {
    [timeoutReported fulfill];
  });

  [self.socket sendLocation:self.simpleLocationInfo recipient:nil timeoutAfter:1.0];

  XCTAssertEqual([XCTWaiter waitForExpectations:@[timeoutReported] timeout:3.0], XCTWaiterResultCompleted);
}

// Verify that we report a location event when one comes in
- (void)testReceivelocation_postsToDelegate {
  NSString *event = @"{\"command\":\"on_location\",\"channel\":\"test channel\",\"from\":\"bogusSender\",\"message_id\":123,\"latitude\":45.0,\"longitude\":31.5,\"formatted_address\":\"Margaritaville\",\"accuracy\":25.0}";
  ZCCLocationInfo *location = [[ZCCLocationInfo alloc] init];
  location.latitude = 45.0;
  location.longitude = 31.5;
  location.accuracy = 25.0;
  location.address = @"Margaritaville";
  XCTestExpectation *receivedLocation = [[XCTestExpectation alloc] initWithDescription:@"delegate called"];
  OCMExpect([self.socketDelegate socket:self.socket didReceiveLocationMessage:location sender:@"bogusSender"]).andDo(^(NSInvocation *invocation) {
    [receivedLocation fulfill];
  });

  [self.socket webSocket:self.webSocket didReceiveMessageWithString:event];

  XCTAssertEqual([XCTWaiter waitForExpectations:@[receivedLocation] timeout:3.0], XCTWaiterResultCompleted);
  OCMVerifyAll(self.socketDelegate);
}

// TODO: Verify error reporting for invalid location events
- (void)testReceiveLocation_missingLatitude_reportsError {
  OCMReject([self.socketDelegate socket:OCMOCK_ANY didReceiveLocationMessage:OCMOCK_ANY sender:OCMOCK_ANY]);
  NSString *command = [self onLocationEventWithoutKey:@"latitude"];
  [self verifyInvalidCommand:@"on_location" message:command reportsErrorForKey:@"latitude" description:@"latitude missing or invalid"];
}

- (void)testReceiveLocation_missingLongitude_reportsError {
  OCMReject([self.socketDelegate socket:OCMOCK_ANY didReceiveLocationMessage:OCMOCK_ANY sender:OCMOCK_ANY]);
  NSString *command = [self onLocationEventWithoutKey:@"longitude"];
  [self verifyInvalidCommand:@"on_location" message:command reportsErrorForKey:@"longitude" description:@"longitude missing or invalid"];
}

- (void)testReceiveLocation_missingAccuracy_reportsError {
  OCMReject([self.socketDelegate socket:OCMOCK_ANY didReceiveLocationMessage:OCMOCK_ANY sender:OCMOCK_ANY]);
  NSString *command = [self onLocationEventWithoutKey:@"accuracy"];
  [self verifyInvalidCommand:@"on_location" message:command reportsErrorForKey:@"accuracy" description:@"accuracy missing or invalid"];
}

- (void)testReceiveLocation_missingSender_reportsError {
  OCMReject([self.socketDelegate socket:OCMOCK_ANY didReceiveLocationMessage:OCMOCK_ANY sender:OCMOCK_ANY]);
  NSString *command = [self onLocationEventWithoutKey:@"from"];
  [self verifyInvalidCommand:@"on_location" message:command reportsErrorForKey:@"from" description:@"from missing or invalid"];
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

// Verify that we report an error if the websocket fails to send
- (void)testSendText_errorSending_reportsError {
  NSDictionary *expected = @{@"command":@"send_text_message",
                             @"seq":@(1),
                             @"text":@"test message"};
  OCMExpect([self.webSocket sendString:[OCMArg checkWithBlock:^BOOL(NSString *message) {
    return messageIsEqualToDictionary(message, expected);
  }] error:(NSError * __autoreleasing *)[OCMArg anyPointer]]).andReturn(NO);
  XCTestExpectation *calledDelegate = [[XCTestExpectation alloc] initWithDescription:@"called delegate"];
  OCMExpect([self.socketDelegate socket:self.socket didReportError:@"Failed to send"]).andDo(^(NSInvocation *invocation) {
    [calledDelegate fulfill];
  });

  [self.socket sendTextMessage:@"test message" recipient:nil timeoutAfter:30.0];

  XCTAssertEqual([XCTWaiter waitForExpectations:@[calledDelegate] timeout:3.0], XCTWaiterResultCompleted);
  OCMVerifyAll(self.socketDelegate);
  OCMVerifyAll(self.webSocket);
}

// Verify that we report an error if the server responds with a failure
- (void)testSendText_serverError_reportsError {
  NSDictionary *expected = @{@"command":@"send_text_message",
                             @"seq":@(1),
                             @"text":@"test message"};
  OCMExpect([self.webSocket sendString:[OCMArg checkWithBlock:^BOOL(NSString *message) {
    return messageIsEqualToDictionary(message, expected);
  }] error:(NSError * __autoreleasing *)[OCMArg anyPointer]]).andReturn(YES);
  XCTestExpectation *calledDelegate = [[XCTestExpectation alloc] initWithDescription:@"called delegate"];
  OCMExpect([self.socketDelegate socket:self.socket didReportError:@"Server error message"]).andDo(^(NSInvocation *invocation) {
    [calledDelegate fulfill];
  });

  [self.socket sendTextMessage:@"test message" recipient:nil timeoutAfter:30.0];
  NSString *errorResponse = @"{\"seq\":1,\"success\":false,\"error\":\"Server error message\"}";
  [self.socket webSocket:self.webSocket didReceiveMessageWithString:errorResponse];

  XCTAssertEqual([XCTWaiter waitForExpectations:@[calledDelegate] timeout:3.0], XCTWaiterResultCompleted);
  OCMVerifyAll(self.socketDelegate);
  OCMVerifyAll(self.webSocket);
}

// Verify that we report an error if the server times out
- (void)testSendText_timeout_reportsError {
  NSDictionary *expected = @{@"command":@"send_text_message",
                             @"seq":@(1),
                             @"text":@"test message"};
  OCMExpect([self.webSocket sendString:[OCMArg checkWithBlock:^BOOL(NSString *message) {
    return messageIsEqualToDictionary(message, expected);
  }] error:(NSError * __autoreleasing *)[OCMArg anyPointer]]).andReturn(YES);
  XCTestExpectation *calledDelegate = [[XCTestExpectation alloc] initWithDescription:@"called delegate"];
  OCMExpect([self.socketDelegate socket:self.socket didReportError:@"Send text timed out"]).andDo(^(NSInvocation *invocation) {
    [calledDelegate fulfill];
  });

  [self.socket sendTextMessage:@"test message" recipient:nil timeoutAfter:1.0];

  XCTAssertEqual([XCTWaiter waitForExpectations:@[calledDelegate] timeout:3.0], XCTWaiterResultCompleted);
  OCMVerifyAll(self.socketDelegate);
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

- (void)testReceiveText_missingText_reportsError {
  OCMReject([self.socketDelegate socket:OCMOCK_ANY didReceiveTextMessage:OCMOCK_ANY sender:OCMOCK_ANY]);
  NSString *event = @"{\"command\":\"on_text_message\",\"channel\":\"exampleChannel\",\"from\":\"exampleSender\",\"message_id\":1234}";
  [self verifyInvalidCommand:@"on_text_message" message:event reportsErrorForKey:@"text" description:@"text missing or invalid"];
}

- (void)testReceiveText_missingSender_reportsError {
  OCMReject([self.socketDelegate socket:OCMOCK_ANY didReceiveTextMessage:OCMOCK_ANY sender:OCMOCK_ANY]);
  NSString *event = @"{\"command\":\"on_text_message\",\"channel\":\"exampleChannel\",\"message_id\":1234,\"text\":\"my test message\"}";
  [self verifyInvalidCommand:@"on_text_message" message:event reportsErrorForKey:@"from" description:@"from missing or invalid"];
}

#pragma mark - Utilities

- (NSString *)onImageEventWithoutKey:(NSString *)key {
  NSMutableDictionary *event = [self.onImageEvent mutableCopy];
  event[key] = nil;
  return [[NSString alloc] initWithData:[NSJSONSerialization dataWithJSONObject:event options:0 error:NULL] encoding:NSUTF8StringEncoding];
}

- (NSString *)onStreamStartEventWithoutKey:(NSString *)key {
  NSMutableDictionary *event = [self.onStreamStartEvent mutableCopy];
  event[key] = nil;
  return [[NSString alloc] initWithData:[NSJSONSerialization dataWithJSONObject:event options:0 error:nil] encoding:NSUTF8StringEncoding];
}

- (NSString *)onLocationEventWithoutKey:(NSString *)key {
  NSMutableDictionary *event = [self.onLocationEvent mutableCopy];
  event[key] = nil;
  return [[NSString alloc] initWithData:[NSJSONSerialization dataWithJSONObject:event options:0 error:NULL] encoding:NSUTF8StringEncoding];
}

- (void)verifyInvalidCommand:(NSString *)commandName message:(NSString *)commandMessage reportsErrorForKey:(NSString *)key description:(NSString *)errorDescription {
  XCTestExpectation *reportedError = [[XCTestExpectation alloc] initWithDescription:@"reported error"];
  OCMStub([self.socketDelegate socket:self.socket didEncounterErrorParsingMessage:OCMOCK_ANY]).andDo(^(NSInvocation *invocation) {
    __unsafe_unretained NSError *error;
    [invocation getArgument:&error atIndex:3];
    XCTAssertEqualObjects(error.domain, ZCCErrorDomain);
    XCTAssertEqual(error.code, ZCCErrorCodeInvalidMessage);
    NSDictionary *userInfo = error.userInfo;
    XCTAssertEqualObjects(userInfo[ZCCServerInvalidMessageKey], commandMessage);
    XCTAssertEqualObjects(userInfo[ZCCInvalidJSONMessageKey], commandName);
    XCTAssertEqualObjects(userInfo[ZCCInvalidJSONKeyKey], key);
    XCTAssertEqualObjects(userInfo[ZCCInvalidJSONProblemKey], errorDescription);
    [reportedError fulfill];
  });
  [self.socket webSocket:self.webSocket didReceiveMessageWithString:commandMessage];

  XCTAssertEqual([XCTWaiter waitForExpectations:@[reportedError] timeout:3.0], XCTWaiterResultCompleted);
}

@end
