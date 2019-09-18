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

@property (nonatomic, strong) XCTestExpectation *logonCallbackCalled;

@property (nonatomic, strong) ZCCImageMessage *imageMessage;

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
