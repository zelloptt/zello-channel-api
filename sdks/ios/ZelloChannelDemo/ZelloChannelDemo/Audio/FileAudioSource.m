//
//  FileAudioSource.m
//  ZelloChannelDemo
//
//  Created by Greg Cooksey on 3/8/18.
//  Copyright © 2018 Zello. All rights reserved.
//

#import "FileAudioSource.h"

@interface ConverterData : NSObject
@property (nonatomic, assign) AudioFileID audioFile;
@property (nonatomic) SInt64 packetCursor;
@property (nonatomic) AudioStreamBasicDescription sourceDescription;
@property (nonatomic) AudioStreamBasicDescription destinationDescription;
@property (nonatomic, assign) void *conversionBuffer;
@property (nonatomic) size_t conversionBufferSize;
@end
@implementation ConverterData
- (void)dealloc {
  if (_conversionBuffer != NULL) {
    free(_conversionBuffer);
  }
}
@end

static OSStatus ProvideDataForConverter(AudioConverterRef audioConverter, UInt32 *ioNumberDataPackets, AudioBufferList *ioData, AudioStreamPacketDescription **outDataPacketDescription, void *userData) {
  ConverterData *converterData = (__bridge id)userData;

  UInt32 bytesPerPacket = converterData.sourceDescription.mBytesPerPacket;
  UInt32 numPackets = *ioNumberDataPackets;
  UInt32 numBytes = numPackets * bytesPerPacket;
  if (converterData.conversionBufferSize < numBytes) {
    if (converterData.conversionBuffer != NULL) {
      free(converterData.conversionBuffer);
    }
    converterData.conversionBuffer = malloc(numBytes);
    converterData.conversionBufferSize = numBytes;
  }
  OSStatus status = AudioFileReadPacketData(converterData.audioFile, true, &numBytes, NULL, converterData.packetCursor, &numPackets, converterData.conversionBuffer);
  if (status != noErr) {
    NSLog(@"Error reading audio file data (%d)", (int)status);
    free(converterData.conversionBuffer);
    converterData.conversionBuffer = NULL;
    converterData.conversionBufferSize = 0;
    return status;
  }

  *ioNumberDataPackets = numPackets;
  converterData.packetCursor += numPackets;
  ioData->mBuffers[0].mData = converterData.conversionBuffer;
  ioData->mBuffers[0].mDataByteSize = numBytes;
  ioData->mBuffers[0].mNumberChannels = converterData.sourceDescription.mChannelsPerFrame;
  return noErr;
}

@interface FileAudioSource ()
@property (nonatomic, strong) ConverterData *converterData;
@end

@implementation FileAudioSource {
  AudioFileID _fileID;
  AudioConverterRef _converter;
}

- (instancetype)initWithURL:(NSURL *)audioFileURL {
  self = [super init];
  if (self) {
    _audioFileURL = audioFileURL;
  }
  return self;
}

- (void)dealloc {
  if (_fileID != NULL) {
    AudioFileClose(_fileID);
  }
  if (_converter != NULL) {
    AudioConverterDispose(_converter);
  }
}

#pragma mark - ZCCVoiceSource

- (void)startProvidingAudio:(nonnull id<ZCCVoiceSink>)sink sampleRate:(NSUInteger)sampleRate stream:(nonnull ZCCOutgoingVoiceStream *)stream {
  AudioStreamBasicDescription zelloASBD = [stream audioStreamDescriptionWithSampleRate:sampleRate];
  OSStatus status;
  if (_fileID == NULL) {
    OSStatus status = AudioFileOpenURL((__bridge CFURLRef)self.audioFileURL, kAudioFileReadPermission, 0, &_fileID);
    if (status != noErr) {
      NSLog(@"Error opening file (%ld)", (long)status);
      [sink stop];
      return;
    }
  }

  AudioStreamBasicDescription fileASBD;
  UInt32 descSize = sizeof(fileASBD);
  status = AudioFileGetProperty(_fileID, kAudioFilePropertyDataFormat, &descSize, &fileASBD);
  if (status != noErr) {
    NSLog(@"Error reading file data format (%d)", (int)status);
    AudioFileClose(_fileID);
    _fileID = NULL;
    [sink stop];
    return;
  }

  if (_converter != NULL) {
    AudioConverterDispose(_converter);
    _converter = NULL;
  }
  AudioConverterRef converter = NULL;
  status = AudioConverterNew(&fileASBD, &zelloASBD, &converter);
  if (status != noErr) {
    NSLog(@"Error creating audio converter (%d)", (int)status);
    AudioFileClose(_fileID);
    _fileID = NULL;
    [sink stop];
    return;
  }
  _converter = converter;

  self.converterData = [[ConverterData alloc] init];
  self.converterData.audioFile = _fileID;
  self.converterData.destinationDescription = zelloASBD;
  self.converterData.sourceDescription = fileASBD;
  self.converterData.packetCursor = 0;

  // Testing reading some file info
  UInt64 packetCount = 0;
  UInt32 packetCountSize = sizeof(packetCount);
  status = AudioFileGetProperty(_fileID, kAudioFilePropertyAudioDataPacketCount, &packetCountSize, &packetCount);
  if (status != noErr) {
    NSLog(@"Error reading packet count (%d)", (int)status);
  }
  UInt32 bufferPacketCount = (UInt32)packetCount;

  AudioBufferList bufferList;
  UInt32 bufferSize = sizeof(UInt8) * 1024 * 32;
  bufferPacketCount = bufferSize / self.converterData.destinationDescription.mBytesPerPacket;
  UInt8 *buffer = malloc(bufferSize);
  bufferList.mNumberBuffers = 1;
  bufferList.mBuffers[0].mNumberChannels = self.converterData.destinationDescription.mChannelsPerFrame;
  bufferList.mBuffers[0].mDataByteSize = bufferSize;
  bufferList.mBuffers[0].mData = buffer;

  while (YES) {
    status = AudioConverterFillComplexBuffer(_converter, &ProvideDataForConverter, (__bridge void *)self.converterData, &bufferPacketCount, &bufferList, NULL);
    if (status != noErr) {
      NSLog(@"Error converting data (%d)", (int)status);
      break;
    }
    if (bufferPacketCount == 0) {
      break;
    }

    NSData *audioData = [NSData dataWithBytes:bufferList.mBuffers[0].mData length:bufferList.mBuffers[0].mDataByteSize];
    [sink provideAudio:audioData];
  }
  free(buffer);

  [sink stop];
}

- (void)stopProvidingAudio:(nonnull id<ZCCVoiceSink>)sink {

}

@end
