#ifndef _DECODEROPUS_H_
#define _DECODEROPUS_H_

#include <jni.h>
#include "guard.h"

extern "C"
{
	#include "opus.h"
	#include "opus_private.h"
}

class CDecoder
{
	static const unsigned _maxFrameBytes = 1276;	// Recommended min size
	static const unsigned _maxPacketSize = 5760;	// 120 ms at 48000 Hz

	pthread_mutex_t _mutex;
	OpusDecoder* _opus;
	int _sampleRate;								// Number of sample in second
	int _framesInPacket;							// Number of frames in each packet
	int _samplesInFrame;							// Number of audio samples in each frame
	int _frameSize;									// Frame duration, ms
	unsigned char _prevBuffer[_maxPacketSize];
	short _output[_maxPacketSize];
	int _prevBufferSize;
	bool _prevLost;

public:
	CDecoder();
	~CDecoder();
	bool Start(JNIEnv* env, jbyteArray header);
	void Stop(JNIEnv* env);
	jshortArray Decode(JNIEnv* env, jbyteArray data, int amplifierGain);
	int GetSampleRate(JNIEnv* env);
	int GetFramesInPacket(JNIEnv* env);
	int GetFrameSize(JNIEnv* env);

};

#endif
