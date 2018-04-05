#ifndef _DECODEROPUS_H_
#define _DECODEROPUS_H_

extern "C"{
	#include "opus.h"
}

#include "guard.h"
#define SAMPLE_RATE 48000

class CDecoderOpus{
  static const unsigned MAXFRAMEBYTES = 1276;	// Recommended min size
	static const unsigned MAXPACKETSIZE = 5760;	// 120 ms at 48000 Hz
  
	pthread_mutex_t m_Mutex;
	OpusDecoder* m_pOpus;
	int m_sampleRate;								// Number of sample in second
	int m_framesInPacket;							// Number of frames in each packet
	int m_samplesInFrame;							// Number of audio samples in each frame
	int m_frameSize;									// Frame duration, ms
	//unsigned char m_input[MAXFRAMEBYTES];
	short m_output[MAXPACKETSIZE];
  unsigned char m_prevBuffer[MAXPACKETSIZE]; // More than we need
  int m_prevBufferSize = 0;
  bool m_prevLost = false;

public:
	CDecoderOpus();
	~CDecoderOpus();
	bool Start(unsigned char* pHeader, int nData);
	void Stop();
  void SetGain(int iAmplifierGain);
	int Decode(unsigned char* pData, int nData, short* output);
	int GetSampleRate();
  int GetFramesInPacket();
  int GetFrameSize();

};


#endif
