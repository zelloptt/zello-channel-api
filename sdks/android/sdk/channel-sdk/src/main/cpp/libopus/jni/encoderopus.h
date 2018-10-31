#ifndef _ENCODEROPUS_H_
#define _ENCODEROPUS_H_

#include <jni.h>
#include "guard.h"

extern "C"
{
	#include "opus.h"
	#include "opus_private.h"
}

class CEncoder
{
	static const unsigned _maxPacketSize = 2880;	// 60 ms at 48000 Hz
	static const unsigned _maxFrameBytes = 1276;	// Recommended min size
	static const int _defBitrate = 0;				// [1000, ∞]
	static const int _defComplexity = 10;			// [1, 10]
	static const int _defLossRate = 20;				// [0, 100]

	pthread_mutex_t _mutex;
	OpusEncoder* _opus;
	OpusRepacketizer* _packetizer;
	int _framesInPacket;							// Number of frames in each packet
	int _samplesInFrame;							// Number of audio samples in each frame
	int _frameCount;								// Number of compressed frames that are already in the packet
	int _sampleCount;								// Number of buffered samples
	unsigned char** _packets;
	unsigned char* _packet;
	int _packetLen;
	short _input[_maxPacketSize];

public:
	CEncoder();
	~CEncoder();
	bool Start(JNIEnv* env, int sampleRate, int framesInPacket, int frameSize, int bitrate);
	jbyteArray Stop(JNIEnv* env);
	jbyteArray Encode(JNIEnv* env, jshortArray data, int amplifierGain);
	static jbyteArray GetHeader(JNIEnv* env, int sampleRate, int framesInPacket, int frameSize);

};

#endif
