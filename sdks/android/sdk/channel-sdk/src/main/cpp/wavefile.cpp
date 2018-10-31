#include "wavefile.h"
#include "waveformatex.h"
#include <unistd.h>

CWaveFile::CWaveFile() :
	m_pFile(0),
	m_lFileOffset(0),
	m_lFileLength(0),
	m_lDataOffset(0),
	m_lDataLength(0),
	m_lDataCursor(0),
	m_iSampleSize(0),
	m_iSampleRate(0),
	m_iChannels(0),
	m_iDuration(0)
{
	pthread_mutex_init(&m_Mutex, 0);
}

CWaveFile::~CWaveFile()
{
	pthread_mutex_destroy(&m_Mutex);
}

bool CWaveFile::OpenResource(JNIEnv* pEnv, jobject pFd, jlong lOffset, jlong lLength)
{
	CGuard Guard(m_Mutex);
	if (!m_pFile && pFd && lOffset >= 0 && lLength > 0)
	{
		jclass fdClass = pEnv->FindClass("java/io/FileDescriptor"); 
		if (fdClass != NULL) 
		{
			jfieldID fdClassDescriptorFieldID = pEnv->GetFieldID(fdClass, "descriptor", "I"); 
			if (fdClassDescriptorFieldID != NULL) 
			{
				jint fd = pEnv->GetIntField(pFd, fdClassDescriptorFieldID); 
				int iFd = dup(fd); 
				m_pFile = fdopen(iFd, "rb"); 
				if (m_pFile)
				{
					fseek(m_pFile, lOffset, SEEK_SET);
					m_lFileOffset = lOffset;
					m_lFileLength = lLength;
				}
			}
		}
		if (m_pFile)
		{
			if (OpenImpl())
				fseek(m_pFile, m_lDataOffset, SEEK_SET);
			else
				CloseImpl();
		}
		return m_pFile != 0;
	}
	return false;
}

bool CWaveFile::OpenFile(JNIEnv* pEnv, jstring sFilename)
{
	CGuard Guard(m_Mutex);
	if (!m_pFile && sFilename)
	{
		jsize n = pEnv->GetStringUTFLength(sFilename);
		if (n > 0)
		{
			jboolean b = false;
			const char* p = pEnv->GetStringUTFChars(sFilename, &b);
			if (p)
			{
				m_pFile = fopen(p, "rb");
				pEnv->ReleaseStringUTFChars(sFilename, p);
				if (m_pFile)
				{
					fseek(m_pFile, 0, SEEK_END);
					m_lFileLength = ftell(m_pFile);
					fseek(m_pFile, 0, SEEK_SET);
				}
			}
		}
		if (m_pFile)
		{
			if (OpenImpl())
				fseek(m_pFile, m_lDataOffset, SEEK_SET);
			else
				CloseImpl();
		}
		return m_pFile != 0;
	}
	return false;
}

void CWaveFile::Close(JNIEnv* pEnv)
{
	CGuard Guard(m_Mutex);
	CloseImpl();
}

jshortArray CWaveFile::Read16BitData(JNIEnv* pEnv, jlong lSampleCount)
{
	CGuard Guard(m_Mutex);
	if (m_pFile && lSampleCount > 0 && m_iSampleSize == 16)
	{
		int64_t lLeft = m_lDataLength - ((int64_t) ftell(m_pFile) - m_lDataOffset);
		if (lSampleCount > lLeft / 2)
			lSampleCount = lLeft / 2;
		if (lSampleCount > 0)
		{
			jshortArray pResult = pEnv->NewShortArray((int) lSampleCount);
			if (pResult)
			{
				if (jshort* pShortArray = pEnv->GetShortArrayElements(pResult, 0))
				{
					fread(pShortArray, 1, 2 * lSampleCount, m_pFile);
					pEnv->ReleaseShortArrayElements(pResult, pShortArray, 0);
				}
				return pResult;
			}
		}
	}
	return 0;
}

jbyteArray CWaveFile::Read8BitData(JNIEnv* pEnv, jlong lSampleCount)
{
	CGuard Guard(m_Mutex);
	if (m_pFile && lSampleCount > 0 && m_iSampleSize == 8)
	{
		int64_t lLeft = m_lDataLength - ((int64_t) ftell(m_pFile) - m_lDataOffset);
		if (lSampleCount > lLeft)
			lSampleCount = lLeft;
		if (lSampleCount > 0)
		{
			jbyteArray pResult = pEnv->NewByteArray((int) lSampleCount);
			if (pResult)
			{
				if (jbyte* pByteArray = pEnv->GetByteArrayElements(pResult, 0))
				{
					fread(pByteArray, 1, lSampleCount, m_pFile);
					pEnv->ReleaseByteArrayElements(pResult, pByteArray, 0);
				}
				return pResult;
			}
		}
	}
	return 0;
}

int CWaveFile::GetSampleSize(JNIEnv* pEnv)
{
	return m_iSampleSize;
}

int CWaveFile::GetSampleRate(JNIEnv* pEnv)
{
	return m_iSampleRate;
}

int CWaveFile::GetChannels(JNIEnv* pEnv)
{
	return m_iChannels;
}

int CWaveFile::GetDuration(JNIEnv* pEnv)
{
	return m_iDuration;
}

bool CWaveFile::OpenImpl()
{
	if (m_pFile)
	{
		if (m_lFileLength > 4 + 4 + 4 + 2 * (4 + 4) + sizeof(PCMWAVEFORMAT))
		{
			unsigned int uSig = 0, uLen = 0, uTyp = 0;
			if (4 != fread(&uSig, 1, 4, m_pFile) ||
				4 != fread(&uLen, 1, 4, m_pFile) ||
				4 != fread(&uTyp, 1, 4, m_pFile))
				return false;
			if (uSig != 0x46464952/*RIFF*/ || uTyp != 0x45564157/*WAVE*/)
				return false;
			bool bFmt = false, bData = false;
			do
			{
				unsigned int uSecTyp = 0, uSecLen = 0;
				if (4 != fread(&uSecTyp, 1, 4, m_pFile) ||
					4 != fread(&uSecLen, 1, 4, m_pFile))
					return false;
				int64_t lPos = ftell(m_pFile);
				if (lPos + uSecLen > m_lFileOffset + m_lFileLength)
					uSecLen = m_lFileOffset + m_lFileLength - lPos;
				if (uSecTyp == 0x20746D66/*fmt_*/ && !bFmt)
				{
					bFmt = true;
					if (uSecLen < sizeof(PCMWAVEFORMAT) || uSecLen > 0x1FFFF)
						return false;
					PCMWAVEFORMAT wfx = {0};
					if (sizeof(wfx) != fread(&wfx, 1, sizeof(wfx), m_pFile))
						return false;
					if (wfx.wf.wFormatTag != 1 || (wfx.wBitsPerSample != 16 && wfx.wBitsPerSample != 8))
						return false;
					m_iSampleSize = (int) wfx.wBitsPerSample;
					m_iSampleRate = (int) wfx.wf.nSamplesPerSec;
					m_iChannels = (int) wfx.wf.nChannels;
				} else
				if (uSecTyp == 0x61746164/*data*/ && !bData)
				{
					bData = true;
					m_lDataOffset = lPos;
					m_lDataLength = uSecLen;
				}
				if (bFmt && bData)
				{
					if (m_iSampleRate > 0 && m_iChannels > 0)
						m_iDuration = (int) (((int64_t) m_lDataLength * 1000) / (m_iSampleSize / 8) / m_iChannels / m_iSampleRate);
					return true;
				}
				fseek(m_pFile, lPos + uSecLen, SEEK_SET);
			} while(true);
		}
	}
	return false;
}

void CWaveFile::CloseImpl()
{
	if (m_pFile)
	{
		fclose(m_pFile);
		m_pFile = 0;
		m_lFileOffset = 0;
		m_lFileLength = 0;
		m_lDataOffset = 0;
		m_lDataLength = 0;
		m_lDataCursor = 0;
		m_iSampleSize = 0;
		m_iSampleRate = 0;
		m_iChannels = 0;
		m_iDuration = 0;
	}
}
