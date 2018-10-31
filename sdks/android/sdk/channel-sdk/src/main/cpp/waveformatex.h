#ifndef _WAVEFORMATEX_H_
#define _WAVEFORMATEX_H_

#include <jni.h>

#pragma pack(push)
#pragma pack(1)

struct WAVEFORMAT
{
	unsigned short wFormatTag;			/* format type */
	unsigned short nChannels;			/* number of channels (i.e. mono, stereo...) */
	unsigned int nSamplesPerSec;		/* sample rate */
	unsigned int nAvgBytesPerSec;		/* for buffer estimation */
	unsigned short nBlockAlign;			/* block size of data */
};

struct PCMWAVEFORMAT
{
	WAVEFORMAT wf;
	unsigned short wBitsPerSample;		/* number of bits per sample of mono data */
};

#pragma pack(pop)

#endif
