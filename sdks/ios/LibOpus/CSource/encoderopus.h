#ifndef _ENCODEROPUS_H_
#define _ENCODEROPUS_H_

extern "C"
{
#include "opus.h"
	
}
#include "guard.h"
class CEncoderOpus
{
  
  static const unsigned MAXPACKETSIZE = 2880;	// 60 ms at 48000 Hz
	static const unsigned MAXFRAMEBYTES = 1276;	// Recommended min size
	static const int DEFBITRATE = 0;				// [1000, ∞]
	static const int DEFCOMPLEXITY = 10;			// [1, 10]
	static const int DEFLOSSRATE = 20;				// [0, 100]
  
	pthread_mutex_t m_Mutex;
	OpusEncoder* m_pOpus;
  int m_iAmplifierCoef;
	OpusRepacketizer* m_pPacketizer;
	int m_framesInPacket;							// Number of frames in each packet
	int m_samplesInFrame;							// Number of audio samples in each frame
	int m_frameCount;								// Number of compressed frames that are already in the packet
	int m_sampleCount;								// Number of buffered samples
	unsigned char** m_packets;
	unsigned char* m_packet;
	int m_packetLen;
	short m_input[MAXPACKETSIZE];

  
public:
	CEncoderOpus();
	~CEncoderOpus();
	bool Start(int iSampleRate, int iFramesInPacket, int frameSize, int iBitrate, int iAmplifierGain);
	int Stop(unsigned char* output);
	int Encode(short* pData, int nData, unsigned char* output, int iAmplifierGain);
	static int GetHeader(int iSampleRate, int iFramesInPacket, int iFrameSize, unsigned char* output);

};

#endif
