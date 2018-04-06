//
//  ZCCCustomAudioSourceTests.m
//  ZelloChannelKitTests
//
//  Created by Greg Cooksey on 3/23/18.
//  Copyright © 2018 Zello. All rights reserved.
//

#import <OCMock/OCMock.h>
#import <XCTest/XCTest.h>
#import "ZCCCustomAudioSource.h"
#import "ZCCOutgoingVoiceConfiguration.h"
#import "ZCCOutgoingVoiceStream.h"

@interface ZCCCustomAudioSourceTests : XCTestCase

/// Mocked id<ZCCAudioSourceDelegate>
@property (nonatomic, strong) id delegate;
/// Mocked id<ZCCVoiceSource>
@property (nonatomic, strong) id source;
/// Mocked ZCCOutoingVoiceStream
@property (nonatomic, strong) id stream;

@property (nonatomic, strong) ZCCOutgoingVoiceConfiguration *config;

/// Object under test
@property (nonatomic, strong) ZCCCustomAudioSource *custom;

@property (nonatomic, strong) XCTestExpectation *sourceReady;
@property (nonatomic, strong) XCTestExpectation *sourceStarted;
@property (nonatomic, strong) XCTestExpectation *reportedSourceStarted;
@end

@implementation ZCCCustomAudioSourceTests

- (void)setUp {
  [super setUp];
  self.delegate = OCMProtocolMock(@protocol(ZCCAudioSourceDelegate));
  self.source = OCMProtocolMock(@protocol(ZCCVoiceSource));
  self.stream = OCMClassMock([ZCCOutgoingVoiceStream class]);

  self.config = [[ZCCOutgoingVoiceConfiguration alloc] init];
  self.config.source = self.source;

  self.custom = [[ZCCCustomAudioSource alloc] initWithConfiguration:self.config stream:self.stream];
  self.custom.delegate = self.delegate;

  self.sourceReady = [[XCTestExpectation alloc] initWithDescription:@"Source became ready"];
  self.sourceStarted = [[XCTestExpectation alloc] initWithDescription:@"Started audio source"];
  self.reportedSourceStarted = [[XCTestExpectation alloc] initWithDescription:@"Reported that audio source started"];
}

- (void)tearDown {
  self.delegate = nil;
  self.source = nil;
  self.stream = nil;

  self.config = nil;

  self.custom = nil;

  self.sourceReady = nil;
  self.sourceStarted = nil;
  self.reportedSourceStarted = nil;
  [super tearDown];
}

#pragma mark - Setup

- (void)expectSourceReady {
  OCMExpect([self.delegate audioSourceDidBecomeReady:self.custom]).andDo(^(NSInvocation *invocation) {
    [self.sourceReady fulfill];
  });
}

- (void)expectSourceStarted:(void (^)(id<ZCCVoiceSink> sink))provideSink {
  OCMExpect([self.source startProvidingAudio:OCMOCK_ANY sampleRate:16000 stream:self.stream]).andDo(^(NSInvocation *invocation) {
    if (provideSink) {
      __unsafe_unretained id<ZCCVoiceSink> sink = nil;
      [invocation getArgument:&sink atIndex:2];
      provideSink(sink);
    }
    [self.sourceStarted fulfill];
  });
  OCMExpect([self.delegate audioSourceDidStart:self.custom]).andDo(^(NSInvocation *invocation) {
    [self.reportedSourceStarted fulfill];
  });
}

- (void)prepareSource {
  [self expectSourceReady];
  [self.custom prepareWithChannels:1 sampleRate:16000 bufferSampleCount:960];
  XCTAssertEqual([XCTWaiter waitForExpectations:@[self.sourceReady] timeout:3.0], XCTWaiterResultCompleted);
}

/// Creates 2+ buffers of data to help verify callback behavior
- (NSData *)makeLargeData {
  NSMutableData *d = [NSMutableData dataWithCapacity:4096];
  // 1,920 bytes per block that the delegate expects, I think
  NSMutableData *inner = [NSMutableData dataWithCapacity:256];
  for (int i = 0; i < 256; ++i) {
    uint8_t b = (uint8_t)i;
    [inner appendBytes:&b length:1];
  }
  for (int i = 0; i < 16; ++i) {
    [d appendData:inner];
  }
  return d;
}

#pragma mark - Tests

// Verify that we report the correct amount of data when the source gives us more than one buffer of data
- (void)testProvideAudio_MoreThanOneBuffer_SendsCorrectDataToEncoder {
  [self prepareSource];

  __block id<ZCCVoiceSink> sink = nil;
  [self expectSourceStarted:^(id<ZCCVoiceSink> voiceSink) {
    sink = voiceSink;
  }];
  [self.custom record];
  XCTAssertEqual([XCTWaiter waitForExpectations:@[self.sourceStarted] timeout:3.0], XCTWaiterResultCompleted);

  NSData *largeData = [self makeLargeData];
  XCTestExpectation *dataProvided = [[XCTestExpectation alloc] initWithDescription:@"Data sent to delegate"];
  NSData *firstBuffer = [largeData subdataWithRange:NSMakeRange(0, 1920)];
  NSData *secondBuffer = [largeData subdataWithRange:NSMakeRange(1920, 1920)];
  [self.delegate setExpectationOrderMatters:YES];
  OCMExpect([self.delegate audioSource:self.custom didProduceData:firstBuffer]);
  OCMExpect([self.delegate audioSource:self.custom didProduceData:secondBuffer]).andDo(^(NSInvocation *invocation) {
    [dataProvided fulfill];
  });
  [sink provideAudio:largeData];
  XCTAssertEqual([XCTWaiter waitForExpectations:@[dataProvided] timeout:3.0], XCTWaiterResultCompleted);

  OCMVerifyAll(self.source);
  OCMVerifyAll(self.delegate);
}

// Verify that we don't report data when the source hasn't given us a full buffer yet
- (void)testProvideAudio_LessThanOneBuffer_SendsNoDataToEncoder {
  [self prepareSource];
  __block id<ZCCVoiceSink> sink = nil;
  [self expectSourceStarted:^(id<ZCCVoiceSink> voiceSink) {
    sink = voiceSink;
  }];
  [self.custom record];
  XCTAssertEqual([XCTWaiter waitForExpectations:@[self.sourceStarted] timeout:3.0], XCTWaiterResultCompleted);

  NSData *smallData = [[self makeLargeData] subdataWithRange:NSMakeRange(0, 480)];
  XCTestExpectation *dataProvided = [[XCTestExpectation alloc] initWithDescription:@"Data sent to delegate"];
  dataProvided.inverted = YES; // dataProvided -> test failure
  OCMStub([self.delegate audioSource:self.custom didProduceData:smallData]).andDo(^(NSInvocation *invocation) {
    [dataProvided fulfill];
  });
  [sink provideAudio:smallData];
  XCTAssertEqual([XCTWaiter waitForExpectations:@[dataProvided] timeout:3.0], XCTWaiterResultCompleted);
  OCMVerifyAll(self.delegate);
}

// Verify that we report any remaining data when the source stops
- (void)testStopVoiceSink_FlushesRemainingDataToEncoder {
  [self prepareSource];
  __block id<ZCCVoiceSink> sink = nil;
  [self expectSourceStarted:^(id<ZCCVoiceSink> voiceSink) {
    sink = voiceSink;
  }];
  [self.custom record];
  XCTAssertEqual([XCTWaiter waitForExpectations:@[self.sourceStarted] timeout:3.0], XCTWaiterResultCompleted);

  NSData *largeData = [self makeLargeData];
  XCTestExpectation *dataProvided = [[XCTestExpectation alloc] initWithDescription:@"Data sent to delegate"];
  NSData *secondBuffer = [largeData subdataWithRange:NSMakeRange(1920, 1920)];
  [self.delegate setExpectationOrderMatters:YES];
  OCMExpect([self.delegate audioSource:self.custom didProduceData:secondBuffer]).andDo(^(NSInvocation *invocation) {
    [dataProvided fulfill];
  });
  [sink provideAudio:largeData];
  XCTAssertEqual([XCTWaiter waitForExpectations:@[dataProvided] timeout:3.0], XCTWaiterResultCompleted);

  NSData *finalBuffer = [largeData subdataWithRange:NSMakeRange(3840, 256)];
  XCTestExpectation *finalBufferProvided = [[XCTestExpectation alloc] initWithDescription:@"Final data sent to delegate"];
  OCMExpect([self.delegate audioSource:self.custom didProduceData:finalBuffer]).andDo(^(NSInvocation *invocation) {
    [finalBufferProvided fulfill];
  });
  [sink stop];
  XCTAssertEqual([XCTWaiter waitForExpectations:@[finalBufferProvided] timeout:3.0], XCTWaiterResultCompleted);

  OCMVerifyAll(self.delegate);
}

#pragma mark ZCCAudioSource

// Verify that we report readiness when prepare is called
- (void)testPrepare_reportsReadiness {
  [self prepareSource];

  OCMVerifyAll(self.delegate);
}

// Verify that we start the source and report status when record is called
- (void)testRecord_startsSourceReportsStarted {
  [self prepareSource];

  [self expectSourceStarted:nil];
  [self.custom record];
  XCTWaiterResult waitResult = [XCTWaiter waitForExpectations:@[self.sourceStarted, self.reportedSourceStarted] timeout:3.0];
  XCTAssertEqual(waitResult, XCTWaiterResultCompleted);
  
  OCMVerifyAll(self.source);
  OCMVerifyAll(self.delegate);
}

// Verify that we stop the source and report status when stop is called
- (void)testStop_stopsSourceAndReportsStatus {
  XCTestExpectation *stoppedSource = [[XCTestExpectation alloc] initWithDescription:@"Stopped audio source"];
  OCMExpect([self.source stopProvidingAudio:OCMOCK_ANY]).andDo(^(NSInvocation *invocation) {
    [stoppedSource fulfill];
  });
  XCTestExpectation *reportedStatus = [[XCTestExpectation alloc] initWithDescription:@"Reported that source stopped"];
  OCMExpect([self.delegate audioSourceDidStop:self.custom]).andDo(^(NSInvocation *invocation) {
    [reportedStatus fulfill];
  });

  [self.custom stop];

  XCTWaiterResult waitResult = [XCTWaiter waitForExpectations:@[stoppedSource, reportedStatus] timeout:3.0];
  XCTAssertEqual(waitResult, XCTWaiterResultCompleted);
  OCMVerifyAll(self.source);
  OCMVerifyAll(self.delegate);
}

@end
