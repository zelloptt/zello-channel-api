#include <jni.h>
#include "contexts.h"
#include "WaveFile.h"

static CContexts<CWaveFile> g_WaveFiles;

extern "C"
{

/**
* com.loudtalks.platform.audio.WaveFileImpl
*/

DLL_PUBLIC
jint
Java_com_loudtalks_platform_audio_WaveFileImpl_nativeOpenResource(JNIEnv* env, jobject object, jobject fd, jlong offset, jlong length)
{
	CWaveFile* p = new CWaveFile();
	if (!p->OpenResource(env, fd, offset, length))
	{
		delete p;
		return 0;
	}
	return g_WaveFiles.Allocate(p);
}

DLL_PUBLIC
jint
Java_com_loudtalks_platform_audio_WaveFileImpl_nativeOpenFile(JNIEnv* env, jobject object, jstring filename)
{
	CWaveFile* p = new CWaveFile();
	if (!p->OpenFile(env, filename))
	{
		delete p;
		return 0;
	}
	return g_WaveFiles.Allocate(p);
}

DLL_PUBLIC
void
Java_com_loudtalks_platform_audio_WaveFileImpl_nativeClose(JNIEnv* env, jobject object, jint id)
{
	CWaveFile* p = g_WaveFiles.Release(id);
	if (p)
	{
		p->Close(env);
		delete p;
		return;
	}
}

DLL_PUBLIC
jshortArray
Java_com_loudtalks_platform_audio_WaveFileImpl_nativeRead16BitData(JNIEnv* env, jobject object, jint id, jint sampleCount)
{
	CWaveFile* p = g_WaveFiles.Get(id);
	if (p)
	{
		return p->Read16BitData(env, sampleCount);
	}
	return 0;
}

DLL_PUBLIC
jbyteArray
Java_com_loudtalks_platform_audio_WaveFileImpl_nativeRead8BitData(JNIEnv* env, jobject object, jint id, jint sampleCount)
{
	CWaveFile* p = g_WaveFiles.Get(id);
	if (p)
	{
		return p->Read8BitData(env, sampleCount);
	}
	return 0;
}

DLL_PUBLIC
jint
Java_com_loudtalks_platform_audio_WaveFileImpl_nativeGetSampleSize(JNIEnv* env, jobject object, jint id)
{
	CWaveFile* p = g_WaveFiles.Get(id);
	if (p)
	{
		return p->GetSampleSize(env);
	}
	return 0;
}

DLL_PUBLIC
jint
Java_com_loudtalks_platform_audio_WaveFileImpl_nativeGetSampleRate(JNIEnv* env, jobject object, jint id)
{
	CWaveFile* p = g_WaveFiles.Get(id);
	if (p)
	{
		return p->GetSampleRate(env);
	}
	return 0;
}

DLL_PUBLIC
jint
Java_com_loudtalks_platform_audio_WaveFileImpl_nativeGetChannels(JNIEnv* env, jobject object, jint id)
{
	CWaveFile* p = g_WaveFiles.Get(id);
	if (p)
	{
		return p->GetChannels(env);
	}
	return 0;
}

DLL_PUBLIC
jint
Java_com_loudtalks_platform_audio_WaveFileImpl_nativeGetDuration(JNIEnv* env, jobject object, jint id)
{
	CWaveFile* p = g_WaveFiles.Get(id);
	if (p)
	{
		return p->GetDuration(env);
	}
	return 0;
}

}
