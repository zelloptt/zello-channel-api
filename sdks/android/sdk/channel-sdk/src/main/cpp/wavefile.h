#ifndef _WAVEFILE_H_
#define _WAVEFILE_H_

#include <jni.h>
#include <stdio.h>
#include "guard.h"

class CWaveFile
{
	pthread_mutex_t m_Mutex;

	FILE* m_pFile;
	int64_t m_lFileOffset, m_lFileLength;
	int64_t m_lDataOffset, m_lDataLength, m_lDataCursor;
	int m_iSampleSize, m_iSampleRate, m_iChannels, m_iDuration;

	bool OpenImpl();
	void CloseImpl();

public:
	CWaveFile();
	~CWaveFile();

	bool OpenResource(JNIEnv* pEnv, jobject pFd, jlong lOffset, jlong lLength);
	bool OpenFile(JNIEnv* pEnv, jstring sFilename);
	void Close(JNIEnv* pEnv);
	jshortArray Read16BitData(JNIEnv* pEnv, jlong lSampleCount);
	jbyteArray Read8BitData(JNIEnv* pEnv, jlong lSampleCount);
	int GetSampleSize(JNIEnv* pEnv);
	int GetSampleRate(JNIEnv* pEnv);
	int GetChannels(JNIEnv* pEnv);
	int GetDuration(JNIEnv* pEnv);

};

#endif
