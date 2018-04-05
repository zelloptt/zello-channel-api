//
//  libopus.h
//  LibOpus
//
//  Created by Alexey Gavrilov on 1/9/12.
//  Copyright (c) 2012 Zello. All rights reserved.
//

#ifndef LibOpus_libopus_h
#define LibOpus_libopus_h

#define OPUS_MAX_FRAMES_PER_PACKET   10
#define OPUS_MAX_DECODED_PACKET      2*6400
#define OPUS_MAX_ENCODED_PACKET      2048
extern "C"
{
  int encoder_opus_nativeStart(int sampleRate, int framesInPacket, int frameSize, int bitrate, int amplifierGain);
  int encoder_opus_nativeStop(int id, unsigned char* output);
  int encoder_opus_nativeEncode(int id, short* data, int len, unsigned char* output, int amplifierGain);
  int encoder_opus_nativeGetHeader(int sampleRate, int framesInPacket, int frameSize, unsigned char* output);
  int decoder_opus_nativeStart(unsigned char* header, int len);
  void decoder_opus_nativeSetGain(int id, int amplifierGain);
  void decoder_opus_nativeStop(int id);
  int decoder_opus_nativeDecode(int id, unsigned char* data, int len, short* output);
  int decoder_opus_nativeGetSampleRate(int id);
  int decoder_opus_nativeGetFrameSize(int id);
  int decoder_opus_nativeGetFramesInPacket(int id);
}
#endif
