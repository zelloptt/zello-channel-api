//
//  ZCCSessionTests.m
//  ZelloChannelKitTests
//
//  Created by Greg Cooksey on 3/22/18.
//  Copyright © 2018 Zello. All rights reserved.
//

#import <CoreLocation/CoreLocation.h>
#import <OCMock/OCMock.h>
#import <XCTest/XCTest.h>
#import "ZCCSession.h"
#import "ZCCAddressFormattingService.h"
#import "ZCCEncoderOpus.h"
#import "ZCCErrors.h"
#import "ZCCGeocodingService.h"
#import "ZCCIncomingVoiceConfiguration.h"
#import "ZCCIncomingVoiceStreamInfo+Internal.h"
#import "ZCCLocationInfo.h"
#import "ZCCLocationService.h"
#import "ZCCPermissionsManager.h"
#import "ZCCSocket.h"
#import "ZCCSocketFactory.h"
#import "ZCCStreamParams.h"
#import "ZCCVoiceStreamsManager.h"

@interface ZCCMockLocationService : NSObject <ZCCLocationService>
@property (nonatomic) CLAuthorizationStatus authorizationStatus;
@property (nonatomic) BOOL locationServicesEnabled;
@property (nonatomic, strong, nullable) void (^mockedRequestLocation)(ZCCLocationRequestCallback callback);
@end
@implementation ZCCMockLocationService
- (void)requestLocation:(ZCCLocationRequestCallback)callback {
  if (self.mockedRequestLocation) {
    self.mockedRequestLocation(callback);
  }
}
@end

@interface ZCCLocationInfo (Testing)
@property (nonatomic) double latitude;
@property (nonatomic) double longitude;
@property (nonatomic) double accuracy;
@property (nonatomic, copy) NSString *address;
@end

@interface ZCCSession (Testing) <ZCCSocketDelegate>
@property (nonatomic, strong, nonnull) ZCCPermissionsManager *permissionsManager;
@property (nonatomic, strong, nonnull) ZCCSocketFactory *socketFactory;
@property (nonatomic, strong, nonnull) ZCCVoiceStreamsManager *streamsManager;
@property (nonatomic, strong, nonnull) id<ZCCAddressFormattingService> addressFormattingService;
@property (nonatomic, strong, nonnull) id<ZCCGeocodingService> geocodingService;
@property (nonatomic, strong, nonnull) id<ZCCLocationService> locationService;
@end

@interface ZCCSessionTests : XCTestCase

@property (nonatomic, strong) NSURL *exampleURL;

/// Mocked ZCCPermissionsManager
@property (nonatomic, strong) id permissionsManager;
/// Mocked ZCCLocationService
@property (nonatomic, strong) ZCCMockLocationService *locationService;
/// Mocked ZCCGeocodingService
@property (nonatomic, strong) id geocodingService;
/// Mocked ZCCAddressFormattingService
@property (nonatomic, strong) id addressFormattingService;
/// Mocked id<ZCCSessionDelegate>
@property (nonatomic, strong) id sessionDelegate;
/// Mocked ZCCSocket
@property (nonatomic, strong) id socket;

@property (nonatomic, strong) XCTestExpectation *sessionDidStartConnecting;
@property (nonatomic, strong) XCTestExpectation *socketOpened;
@property (nonatomic, strong) XCTestExpectation *logonSent;
@end

@implementation ZCCSessionTests

- (void)setUp {
  [super setUp];
  self.exampleURL = [NSURL URLWithString:@"wss://example.com/"];

  self.permissionsManager = OCMClassMock([ZCCPermissionsManager class]);

  self.addressFormattingService = OCMProtocolMock(@protocol(ZCCAddressFormattingService));
  self.geocodingService = OCMProtocolMock(@protocol(ZCCGeocodingService));
  self.locationService = [[ZCCMockLocationService alloc] init];
  self.sessionDelegate = OCMProtocolMock(@protocol(ZCCSessionDelegate));
  self.socket = OCMClassMock([ZCCSocket class]);

  self.sessionDidStartConnecting = [[XCTestExpectation alloc] initWithDescription:@"Session delegate informed connect started"];
  self.socketOpened = [[XCTestExpectation alloc] initWithDescription:@"Socket opened"];
  self.logonSent = [[XCTestExpectation alloc] initWithDescription:@"Logon sent"];
}

- (void)tearDown {
  self.permissionsManager = nil;
  self.sessionDelegate = nil;
  self.socket = nil;

  self.sessionDidStartConnecting = nil;
  self.socketOpened = nil;
  self.logonSent = nil;
  [super tearDown];
}

#pragma mark - Setup utilities

- (ZCCSession *)sessionWithUsername:(nullable NSString *)username password:(nullable NSString *)password {
  NSString *claims = [[@"{}" dataUsingEncoding:NSUTF8StringEncoding] base64EncodedStringWithOptions:0];
  NSString *authToken = [NSString stringWithFormat:@".%@.", claims];
  ZCCSession *session = [[ZCCSession alloc] initWithURL:self.exampleURL authToken:authToken username:username password:password channel:@"test" callbackQueue:nil];
  session.delegate = self.sessionDelegate;
  session.permissionsManager = self.permissionsManager;
  session.addressFormattingService = self.addressFormattingService;
  session.geocodingService = self.geocodingService;
  session.locationService = self.locationService;
  session.socketFactory.createSocketWithURL = ^(NSURL *socketURL) {
    XCTAssertEqualObjects(socketURL, self.exampleURL);
    return self.socket;
  };
  return session;
}

- (void)expectSessionDidStartConnecting:(ZCCSession *)session {
  OCMExpect([self.sessionDelegate sessionDidStartConnecting:session]).andDo(^(NSInvocation *invocation) {
    [self.sessionDidStartConnecting fulfill];
  });
}

- (void)expectSocketOpened {
  OCMExpect([self.socket open]).andDo(^(NSInvocation *invocation) {
    [self.socketOpened fulfill];
  });
}

- (void)expectLogonWithUsername:(NSString *)username password:(NSString *)password logonCallbackHandler:(void (^)(ZCCLogonCallback callback))handler {
  OCMExpect([self.socket sendLogonWithAuthToken:OCMOCK_ANY refreshToken:OCMOCK_ANY channel:@"test" username:username password:password callback:OCMOCK_ANY timeoutAfter:30.0]).andDo(^(NSInvocation *invocation) {
    if (handler) {
      __unsafe_unretained ZCCLogonCallback callback = nil;
      [invocation getArgument:&callback atIndex:7];
      handler(callback);
    }
    [self.logonSent fulfill];
  });
}

- (void)connectSession:(ZCCSession *)session {
  [self expectSocketOpened];
  [session connect];
  XCTAssertEqual([XCTWaiter waitForExpectations:@[self.socketOpened] timeout:3], XCTWaiterResultCompleted);
  [self expectLogonWithUsername:@"" password:@"" logonCallbackHandler:^(ZCCLogonCallback callback) {
    callback(YES, nil, nil);
  }];
  [session socketDidOpen:self.socket];
  XCTAssertEqual([XCTWaiter waitForExpectations:@[self.logonSent] timeout:3.0], XCTWaiterResultCompleted);
}

#pragma mark - Tests

#pragma mark -connect

- (void)testConnect_noUsernameOrPassword_opensWebSocketToServer {
  ZCCSession *session = [self sessionWithUsername:nil password:nil];

  [self expectSocketOpened];

  [session connect];

  XCTAssertEqual([XCTWaiter waitForExpectations:@[self.socketOpened] timeout:1], XCTWaiterResultCompleted);

  OCMVerifyAll(self.socket);
}

- (void)testConnect_noUsernameOrPassword_SendsLogonToServer {
  ZCCSession *session = [self sessionWithUsername:nil password:nil];
  [self expectSocketOpened];
  [session connect];
  XCTAssertEqual([XCTWaiter waitForExpectations:@[self.socketOpened] timeout:1], XCTWaiterResultCompleted);
  OCMVerifyAll(self.socket);

  OCMExpect([self.socket sendLogonWithAuthToken:OCMOCK_ANY refreshToken:OCMOCK_ANY channel:@"test" username:@"" password:@"" callback:OCMOCK_ANY timeoutAfter:30.0]).andDo(^(NSInvocation *invocation) {
    [self.logonSent fulfill];
  });
  [session socketDidOpen:self.socket];

  XCTAssertEqual([XCTWaiter waitForExpectations:@[self.logonSent] timeout:1], XCTWaiterResultCompleted);

  OCMVerifyAll(self.socket);
}

// Verify that session behaves correctly when logging in successfully without a username or password
- (void)testConnect_noUsernameOrPasswordLogonSucceeds_CallsDelegate {
  [self expectSocketOpened];
  ZCCSession *session = [self sessionWithUsername:nil password:nil];
  [self expectSessionDidStartConnecting:session];
  XCTestExpectation *delegateCalled = [[XCTestExpectation alloc] initWithDescription:@"Session delegate called"];
  OCMExpect([self.sessionDelegate sessionDidConnect:session]).andDo(^(NSInvocation *invocation) {
    [delegateCalled fulfill];
  });
  [session connect];
  XCTWaiterResult waitResult = [XCTWaiter waitForExpectations:@[self.sessionDidStartConnecting, self.socketOpened] timeout:3];
  XCTAssertEqual(waitResult, XCTWaiterResultCompleted);
  OCMVerifyAll(self.socket);

  [self expectLogonWithUsername:@"" password:@"" logonCallbackHandler:^(ZCCLogonCallback callback) {
    callback(YES, nil, nil);
  }];
  [session socketDidOpen:self.socket];

  waitResult = [XCTWaiter waitForExpectations:@[self.logonSent, delegateCalled] timeout:1];
  XCTAssertEqual(waitResult, XCTWaiterResultCompleted);

  OCMVerifyAll(self.socket);
  OCMVerifyAll(self.sessionDelegate);
  XCTAssertEqual(session.state, ZCCSessionStateConnected);
}

// Verify that session behaves correctly with logging in successfully with a username and password
- (void)testConnect_usernameAndPasswordLogonSucceeds_CallsDelegate {
  [self expectSocketOpened];
  ZCCSession *session = [self sessionWithUsername:@"bogusUser" password:@"bogusPassword"];
  XCTestExpectation *delegateCalled = [[XCTestExpectation alloc] initWithDescription:@"Session delegate called"];
  OCMExpect([self.sessionDelegate sessionDidConnect:session]).andDo(^(NSInvocation *invocation) {
    [delegateCalled fulfill];
  });
  [session connect];
  XCTAssertEqual([XCTWaiter waitForExpectations:@[self.socketOpened] timeout:1], XCTWaiterResultCompleted);
  OCMVerifyAll(self.socket);

  [self expectLogonWithUsername:@"bogusUser" password:@"bogusPassword" logonCallbackHandler:^(ZCCLogonCallback callback) {
    callback(YES, nil, nil);
  }];
  [session socketDidOpen:self.socket];

  XCTWaiterResult waitResult = [XCTWaiter waitForExpectations:@[self.logonSent, delegateCalled] timeout:3];
  XCTAssertEqual(waitResult, XCTWaiterResultCompleted);

  OCMVerifyAll(self.socket);
  OCMVerifyAll(self.sessionDelegate);
  XCTAssertEqual(session.state, ZCCSessionStateConnected);
}

// Verify that session behaves correctly when logging in fails
- (void)testConnect_LogonFails_CallsDelegate {
  ZCCSession *session = [self sessionWithUsername:nil password:nil];
  XCTestExpectation *delegateCalled = [[XCTestExpectation alloc] initWithDescription:@"Session delegate called"];
  OCMExpect([self.sessionDelegate session:session didFailToConnectWithError:OCMOCK_ANY]).andDo(^(NSInvocation *invocation) {
    __unsafe_unretained NSError *error = nil;
    [invocation getArgument:&error atIndex:3];
    XCTAssertEqualObjects(error.domain, ZCCErrorDomain);
    XCTAssertEqual(error.code, ZCCErrorCodeConnectFailed);
    XCTAssertEqualObjects(error.userInfo[ZCCServerErrorMessageKey], @"Uh oh");
    [delegateCalled fulfill];
  });
  [self expectSocketOpened];

  [session connect];
  XCTAssertEqual([XCTWaiter waitForExpectations:@[self.socketOpened] timeout:1], XCTWaiterResultCompleted);
  OCMVerifyAll(self.socket);

  [self expectLogonWithUsername:@"" password:@"" logonCallbackHandler:^(ZCCLogonCallback callback) {
    callback(NO, nil, @"Uh oh");
  }];
  [session socketDidOpen:self.socket];

  XCTWaiterResult waitResult = [XCTWaiter waitForExpectations:@[self.logonSent, delegateCalled] timeout:5];
  XCTAssertEqual(waitResult, XCTWaiterResultCompleted);

  OCMVerifyAll(self.socket);
  OCMVerify([self.socket close]);
  OCMVerifyAll(self.sessionDelegate);
}

#pragma mark -disconnect

// Verify that session disconnects web socket when user calls -disconnect
- (void)testDisconnect_ClosesSocketAndCallsDelegate {
  ZCCSession *session = [self sessionWithUsername:nil password:nil];
  [self connectSession:session];

  XCTestExpectation *socketClosed = [[XCTestExpectation alloc] initWithDescription:@"Socket closed"];
  OCMExpect([self.socket close]).andDo(^(NSInvocation *invocation) {
    [socketClosed fulfill];
  });
  XCTestExpectation *sessionDidDisconnect = [[XCTestExpectation alloc] initWithDescription:@"Session delegate informed socket disconnected"];
  OCMExpect([self.sessionDelegate sessionDidDisconnect:session]).andDo(^(NSInvocation *invocation) {
    [sessionDidDisconnect fulfill];
  });
  [session disconnect];
  XCTWaiterResult waitResult = [XCTWaiter waitForExpectations:@[socketClosed, sessionDidDisconnect] timeout:3.0];
  XCTAssertEqual(waitResult, XCTWaiterResultCompleted);

  OCMVerifyAll(self.socket);
  OCMVerifyAll(self.sessionDelegate);
  XCTAssertEqual(session.state, ZCCSessionStateDisconnected);
}

#pragma mark -startVoiceMessage

// Verify that we return nil if the session is not connected to the server
- (void)testStartVoiceMessage_notConnected_returnsNil {
  OCMStub([self.permissionsManager recordPermission]).andReturn(AVAudioSessionRecordPermissionGranted);
  ZCCSession *session = [self sessionWithUsername:nil password:nil];

  ZCCOutgoingVoiceStream *stream = [session startVoiceMessage];
  XCTAssertNil(stream);
}

// Verify that we return nil if microphone permission has not been granted by the user
- (void)testStartVoiceMessage_ConnectedNoMicrophonePermission_returnsNil {
  OCMStub([self.permissionsManager recordPermission]).andReturn(AVAudioSessionRecordPermissionDenied);
  ZCCSession *session = [self sessionWithUsername:nil password:nil];
  [self connectSession:session];

  ZCCOutgoingVoiceStream *stream = [session startVoiceMessage];
  XCTAssertNil(stream);
}

// Verify that we start opening a stream if we're connected and have microphone permission
- (void)testStartVoiceMessage_ConnectedMicrophonePermissionGranted_StartsConnecting {
  OCMStub([self.permissionsManager recordPermission]).andReturn(AVAudioSessionRecordPermissionGranted);
  ZCCSession *session = [self sessionWithUsername:nil password:nil];
  [self connectSession:session];

  XCTestExpectation *startStreamSent = [[XCTestExpectation alloc] initWithDescription:@"start_stream sent"];
  OCMExpect([self.socket sendStartStreamWithParams:OCMOCK_ANY recipient:nil callback:OCMOCK_ANY timeoutAfter:30.0]).andDo(^(NSInvocation *invocation) {
    [startStreamSent fulfill];
  });

  ZCCOutgoingVoiceStream *stream = [session startVoiceMessage];
  XCTAssertNotNil(stream);
  XCTAssertEqual([XCTWaiter waitForExpectations:@[startStreamSent] timeout:3.0], XCTWaiterResultCompleted);

  OCMVerifyAll(self.socket);
}

// Verify that we start opening a stream to a specific user if we're connected and have microphone permission
- (void)testStartVoiceMessageToUser_ConnectedMicrophonePermissionGranted_StartsConnecting {
  OCMStub([self.permissionsManager recordPermission]).andReturn(AVAudioSessionRecordPermissionGranted);
  ZCCSession *session = [self sessionWithUsername:nil password:nil];
  [self connectSession:session];

  XCTestExpectation *startStreamSent = [[XCTestExpectation alloc] initWithDescription:@"start_stream sent"];
  OCMExpect([self.socket sendStartStreamWithParams:OCMOCK_ANY recipient:@"exampleUser" callback:OCMOCK_ANY timeoutAfter:30.0]).andDo(^(NSInvocation *invocation) {
    [startStreamSent fulfill];
  });

  ZCCOutgoingVoiceStream *stream = [session startVoiceMessageToUser:@"exampleUser"];
  XCTAssertNotNil(stream);
  XCTAssertEqual([XCTWaiter waitForExpectations:@[startStreamSent] timeout:3.0], XCTWaiterResultCompleted);
  OCMVerifyAll(self.socket);
}

// Verify that we report to the delegate if there is an error opening the stream
- (void)testStartVoiceMessage_ConnectedMicrophonePermissionGrantedErrorOpening_ReportsToDelegate {
  OCMStub([self.permissionsManager recordPermission]).andReturn(AVAudioSessionRecordPermissionGranted);
  ZCCSession *session = [self sessionWithUsername:nil password:nil];
  [self connectSession:session];

  XCTestExpectation *startStreamSent = [[XCTestExpectation alloc] initWithDescription:@"start_stream sent"];
  __block ZCCStartStreamCallback streamStarted;
  OCMExpect([self.socket sendStartStreamWithParams:OCMOCK_ANY recipient:nil callback:OCMOCK_ANY timeoutAfter:30.0]).andDo(^(NSInvocation *invocation) {
    __unsafe_unretained ZCCStartStreamCallback callback = nil;
    [invocation getArgument:&callback atIndex:4];
    streamStarted = callback;
    [startStreamSent fulfill];
  });

  ZCCOutgoingVoiceStream *stream = [session startVoiceMessage];
  XCTestExpectation *streamDidEncounterError = [[XCTestExpectation alloc] initWithDescription:@"Delegate informed of stream error"];
  OCMExpect([self.sessionDelegate session:session outgoingVoice:stream didEncounterError:OCMOCK_ANY]).andDo(^(NSInvocation *invocation) {
    __unsafe_unretained NSError *error = nil;
    [invocation getArgument:&error atIndex:4];
    XCTAssertEqualObjects(error.domain, ZCCErrorDomain);
    XCTAssertEqual(error.code, ZCCErrorCodeWebSocketError);
    XCTAssertEqualObjects(error.userInfo[ZCCErrorWebSocketReasonKey], @"Uh oh");
    [streamDidEncounterError fulfill];
  });

  XCTAssertNotNil(stream);
  XCTAssertEqual([XCTWaiter waitForExpectations:@[startStreamSent] timeout:3.0], XCTWaiterResultCompleted);
  XCTAssertNotNil(streamStarted);

  if (streamStarted) {
    streamStarted(NO, 0, @"Uh oh");
  }
  XCTAssertEqual([XCTWaiter waitForExpectations:@[streamDidEncounterError] timeout:3.0], XCTWaiterResultCompleted);
  OCMVerifyAll(self.socket);
  OCMVerifyAll(self.sessionDelegate);
}

#pragma mark -sendText:

- (void)testSendText_SendsSocketMessage {
  ZCCSession *session = [self sessionWithUsername:nil password:nil];
  [self connectSession:session];

  XCTestExpectation *textSent = [[XCTestExpectation alloc] initWithDescription:@"send_text_message sent"];
  OCMExpect([self.socket sendTextMessage:@"test message" recipient:nil timeoutAfter:30.0]).andDo(^(NSInvocation *invocation) {
    [textSent fulfill];
  });
  [session sendText:@"test message"];

  XCTAssertEqual([XCTWaiter waitForExpectations:@[textSent] timeout:3.0], XCTWaiterResultCompleted);
  OCMVerifyAll(self.socket);
}

- (void)testSendTextToUser_SendsSocketMessage {
  ZCCSession *session = [self sessionWithUsername:nil password:nil];
  [self connectSession:session];

  XCTestExpectation *textSent = [[XCTestExpectation alloc] initWithDescription:@"send_text_message sent"];
  OCMExpect([self.socket sendTextMessage:@"test message" recipient:@"bogusUser" timeoutAfter:30.0]).andDo(^(NSInvocation *invocation) {
    [textSent fulfill];
  });
  [session sendText:@"test message" toUser:@"bogusUser"];

  XCTAssertEqual([XCTWaiter waitForExpectations:@[textSent] timeout:3.0], XCTWaiterResultCompleted);
  OCMVerifyAll(self.socket);
}

#pragma mark -sendLocation

// Verify that -sendLocation returns false if we don't have access to location services
- (void)testSendLocation_NoLocationAccess_ReturnsFalse {
  ZCCSession *session = [self sessionWithUsername:nil password:nil];

  // Verify we don't send location if we aren't connected
  self.locationService.locationServicesEnabled = YES;
  self.locationService.authorizationStatus = kCLAuthorizationStatusAuthorizedWhenInUse;
  XCTAssertFalse([session sendLocationWithContinuation:nil]);

  [self connectSession:session];
  self.locationService.locationServicesEnabled = YES;
  self.locationService.authorizationStatus = kCLAuthorizationStatusDenied;
  XCTAssertFalse([session sendLocationWithContinuation:nil]);

  self.locationService.authorizationStatus = kCLAuthorizationStatusRestricted;
  XCTAssertFalse([session sendLocationWithContinuation:nil]);

  self.locationService.authorizationStatus = kCLAuthorizationStatusNotDetermined;
  XCTAssertFalse([session sendLocationWithContinuation:nil]);

  self.locationService.authorizationStatus = kCLAuthorizationStatusAuthorizedWhenInUse;
  self.locationService.locationServicesEnabled = NO;
  XCTAssertFalse([session sendLocationWithContinuation:nil]);
}

// TODO: Verify that sendLocation sends the current location when we do have access to location services
- (void)testSendLocation_sendsLocation {
  self.locationService.locationServicesEnabled = YES;
  self.locationService.authorizationStatus = kCLAuthorizationStatusAuthorizedWhenInUse;
  CLLocationCoordinate2D coordinate;
  coordinate.latitude = 45.0;
  coordinate.longitude = 32.5;
  CLLocation *bogusLocation = [[CLLocation alloc] initWithCoordinate:coordinate altitude:0.0 horizontalAccuracy:15.0 verticalAccuracy:0.0 timestamp:[NSDate dateWithTimeIntervalSinceReferenceDate:0.0]];
  self.locationService.mockedRequestLocation = ^(ZCCLocationRequestCallback callback) {
    callback(bogusLocation, nil);
  };
  ZCCLocationInfo *expectedLocationInfo = [[ZCCLocationInfo alloc] init];
  expectedLocationInfo.latitude = 45.0;
  expectedLocationInfo.longitude = 32.5;
  expectedLocationInfo.accuracy = 15.0;
  expectedLocationInfo.address = @"Bogus address, Anytown";
  id placemark = OCMClassMock([CLPlacemark class]);
  OCMExpect([self.addressFormattingService stringFromPlacemark:placemark]).andReturn(@"Bogus address, Anytown");
  OCMStub([self.geocodingService reverseGeocodeLocation:bogusLocation completionHandler:OCMOCK_ANY]).andDo(^(NSInvocation *invocation) {
    __unsafe_unretained CLGeocodeCompletionHandler completionHandler;
    [invocation getArgument:&completionHandler atIndex:3];
    completionHandler(@[placemark], nil);
  });

  ZCCSession *session = [self sessionWithUsername:nil password:nil];
  [self connectSession:session];

  XCTestExpectation *callbackCalled = [[XCTestExpectation alloc] initWithDescription:@"-sendLocation callback called"];
  XCTAssertTrue([session sendLocationWithContinuation:^(ZCCLocationInfo *locationInfo, NSError *error) {
    XCTAssertEqualObjects(locationInfo, expectedLocationInfo);
    [callbackCalled fulfill];
  }]);

  OCMVerify([self.socket sendLocation:expectedLocationInfo recipient:nil timeoutAfter:30.0]);
  XCTAssertEqual([XCTWaiter waitForExpectations:@[callbackCalled] timeout:3.0], XCTWaiterResultCompleted);
}

#pragma mark ZCCSocketDelegate

// Verify that we report a connection loss during logon correctly
- (void)testSocketDidClose_LogonInProcess_CallsFailToConnect {
  ZCCSession *session = [self sessionWithUsername:nil password:nil];
  [self expectSocketOpened];
  [session connect];
  XCTAssertEqual([XCTWaiter waitForExpectations:@[self.socketOpened] timeout:3.0], XCTWaiterResultCompleted);

  XCTestExpectation *failedToConnect = [[XCTestExpectation alloc] initWithDescription:@"Delegate informed of failed connection"];
  OCMExpect([self.sessionDelegate session:session didFailToConnectWithError:OCMOCK_ANY]).andDo(^(NSInvocation *invocation) {
    __unsafe_unretained NSError *error = nil;
    [invocation getArgument:&error atIndex:3];
    XCTAssertEqualObjects(error.domain, ZCCErrorDomain);
    XCTAssertEqual(error.code, ZCCErrorCodeWebSocketError);
    XCTAssertEqualObjects(error.userInfo[ZCCErrorWebSocketReasonKey], @"Uh oh");
    [failedToConnect fulfill];
  });
  OCMReject([self.sessionDelegate sessionDidDisconnect:OCMOCK_ANY]);

  NSError *socketError = [NSError errorWithDomain:ZCCErrorDomain code:ZCCErrorCodeWebSocketError userInfo:@{ZCCErrorWebSocketReasonKey:@"Uh oh"}];
  [session socketDidClose:self.socket withError:socketError];
  XCTAssertEqual([XCTWaiter waitForExpectations:@[failedToConnect] timeout:3.0], XCTWaiterResultCompleted);

  OCMVerifyAll(self.socket);
  OCMVerifyAll(self.sessionDelegate);
  XCTAssertEqual(session.state, ZCCSessionStateDisconnected);
}

// Verify that we report a connection loss after successful connection correctly
- (void)testSocketDidClose_ConnectionComplete_CallsDisconnected {
  ZCCSession *session = [self sessionWithUsername:nil password:nil];
  [self connectSession:session];

  XCTestExpectation *disconnected = [[XCTestExpectation alloc] initWithDescription:@"Delegate informed of disconnection"];
  OCMExpect([self.sessionDelegate sessionDidDisconnect:session]).andDo(^(NSInvocation *invocation) {
    [disconnected fulfill];
  });
  OCMReject([self.sessionDelegate session:OCMOCK_ANY didFailToConnectWithError:OCMOCK_ANY]);

  [session socketDidClose:self.socket withError:nil];
  XCTAssertEqual([XCTWaiter waitForExpectations:@[disconnected] timeout:3.0], XCTWaiterResultCompleted);

  OCMVerifyAll(self.socket);
  OCMVerifyAll(self.sessionDelegate);
  XCTAssertEqual(session.state, ZCCSessionStateDisconnected);
}

// Verify that we prompt the delegate for player override and start processing when a stream starts
- (void)testSocketDidStartStreamWithId_PromptsDelegateForReceiverOverride {
  ZCCSession *session = [self sessionWithUsername:nil password:nil];
  id streamsManager = OCMClassMock([ZCCVoiceStreamsManager class]);
  session.streamsManager = streamsManager;
  [self connectSession:session];

  ZCCIncomingVoiceStreamInfo *info = [[ZCCIncomingVoiceStreamInfo alloc] initWithChannel:@"test" sender:@"sender"];
  OCMExpect([self.sessionDelegate session:session incomingVoiceWillStart:info]).andReturn(nil);

  ZCCStreamParams *params = [[ZCCStreamParams alloc] init];
  params.codecName = @"bogusCodec";
  params.type = @"bogusType";
  params.codecHeader = [NSData data];
  params.packetDuration = 46;
  [session socket:self.socket didStartStreamWithId:23 params:params channel:@"test" sender:@"sender"];

  OCMVerifyAll(self.sessionDelegate);
  OCMVerify([streamsManager onIncomingStreamStart:23 header:params.codecHeader packetDuration:46 channel:@"test" from:@"sender" receiverConfiguration:nil]);
}

// Verify that we pass custom receiver configuration when delegate specifies one
- (void)testSocketDidStartStreamWithId_CustomReceiver_CreatesStreamWithReceiverConfiguration {
  ZCCSession *session = [self sessionWithUsername:nil password:nil];
  id streamsManager = OCMClassMock([ZCCVoiceStreamsManager class]);
  session.streamsManager = streamsManager;
  [self connectSession:session];

  ZCCIncomingVoiceStreamInfo *info = [[ZCCIncomingVoiceStreamInfo alloc] initWithChannel:@"test" sender:@"sender"];
  ZCCIncomingVoiceConfiguration *config = [[ZCCIncomingVoiceConfiguration alloc] init];
  config.playThroughSpeaker = NO;
  id customReceiver = OCMProtocolMock(@protocol(ZCCVoiceReceiver));
  config.receiver = customReceiver;
  OCMExpect([self.sessionDelegate session:session incomingVoiceWillStart:info]).andReturn(config);

  ZCCStreamParams *params = [[ZCCStreamParams alloc] init];
  params.codecName = @"bogusCodec";
  params.type = @"bogusType";
  params.codecHeader = [NSData data];
  params.packetDuration = 46;
  [session socket:self.socket didStartStreamWithId:23 params:params channel:@"test" sender:@"sender"];

  OCMVerifyAll(self.sessionDelegate);
  OCMVerify([streamsManager onIncomingStreamStart:23 header:params.codecHeader packetDuration:46 channel:@"test" from:@"sender" receiverConfiguration:[OCMArg checkWithBlock:^BOOL(ZCCIncomingVoiceConfiguration *actual) {
    return actual.playThroughSpeaker == NO && actual.receiver == customReceiver;
  }]]);
}

// Verify that we report text messages
- (void)testSocketDidReceiveText_CallsDelegate {
  ZCCSession *session = [self sessionWithUsername:nil password:nil];
  [self connectSession:session];

  XCTestExpectation *received = [[XCTestExpectation alloc] initWithDescription:@"Received text"];
  OCMExpect([self.sessionDelegate session:session didReceiveText:@"test message" from:@"exampleSender"]).andDo(^(NSInvocation *invocation) {
    [received fulfill];
  });

  [session socket:self.socket didReceiveTextMessage:@"test message" sender:@"exampleSender"];

  XCTAssertEqual([XCTWaiter waitForExpectations:@[received] timeout:3.0], XCTWaiterResultCompleted);
  OCMVerifyAll(self.sessionDelegate);
}

@end
