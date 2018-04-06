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
#import "ZCCSocket.h"
#import "ZCCWebSocketFactory.h"

@interface ZCCSocket (Testing) <ZCCSRWebSocketDelegate>
@end

@interface ZCCSocketTests : XCTestCase
@property (nonatomic, strong) ZCCSocket *socket;

/// Mocked underlying ZCCSRWebSocket
@property (nonatomic, strong) id webSocket;

@property (nonatomic, strong) XCTestExpectation *logonCallbackCalled;
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

  self.logonCallbackCalled = [[XCTestExpectation alloc] initWithDescription:@"Logon callback called"];
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
    NSData *messageData = [message dataUsingEncoding:NSUTF8StringEncoding];
    NSDictionary *actual = [NSJSONSerialization JSONObjectWithData:messageData options:0 error:NULL];
    return [expected isEqualToDictionary:actual];
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

@end
