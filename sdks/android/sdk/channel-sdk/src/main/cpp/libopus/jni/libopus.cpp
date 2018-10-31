#include <jni.h>
#include "contexts.h"
#include "decoderopus.h"
#include "encoderopus.h"

static CContexts<CDecoder> g_Decoders;
static CContexts<CEncoder> g_Encoders;

extern "C"
{

/**
* com.zello.channel.sdk.platform.EncoderOpus
*/

DLL_PUBLIC
jint
Java_com_zello_channel_sdk_platform_EncoderOpus_nativeStart(JNIEnv* env, jobject object, int sampleRate, int framesInPacket, int frameSize, int bitrate)
{
	CEncoder* p = new CEncoder();
	if (!p->Start(env, sampleRate, framesInPacket, frameSize, bitrate))
	{
		delete p;
		return 0;
	}
	return g_Encoders.Allocate(p);
}

DLL_PUBLIC
jbyteArray
Java_com_zello_channel_sdk_platform_EncoderOpus_nativeStop(JNIEnv* env, jobject object, int id)
{
	CEncoder* p = g_Encoders.Release(id);
	if (p)
	{
		jbyteArray pRemaining = p->Stop(env);
		delete p;
		return pRemaining;
	}
	return 0;
}

DLL_PUBLIC
jbyteArray
Java_com_zello_channel_sdk_platform_EncoderOpus_nativeEncode(JNIEnv* env, jobject object, int id, jshortArray data, int amplifierGain)
{
	CEncoder* p = g_Encoders.Get(id);
	if (p)
	{
		return p->Encode(env, data, amplifierGain);
	}
	return 0;
}

DLL_PUBLIC
jbyteArray
Java_com_zello_channel_sdk_platform_EncoderOpus_nativeGetHeader(JNIEnv* env, jobject object, int sampleRate, int framesInPacket, int frameSize)
{
	return CEncoder::GetHeader(env, sampleRate, framesInPacket, frameSize);
}

/**
* com.loudtalks.platform.audio.DecoderOpus
*/

DLL_PUBLIC
jint
Java_com_zello_channel_sdk_platform_DecoderOpus_nativeStart(JNIEnv* env, jobject object, jbyteArray header)
{
	CDecoder* p = new CDecoder();
	if (!p->Start(env, header))
	{
		delete p;
		return 0;
	}
	return g_Decoders.Allocate(p);
}

DLL_PUBLIC
void
Java_com_zello_channel_sdk_platform_DecoderOpus_nativeStop(JNIEnv* env, jobject object, int id)
{
	CDecoder* p = g_Decoders.Release(id);
	if (p)
	{
		p->Stop(env);
		delete p;
		return;
	}
}

DLL_PUBLIC
jshortArray
Java_com_zello_channel_sdk_platform_DecoderOpus_nativeDecode(JNIEnv* env, jobject object, int id, jbyteArray data, int amplifierGain)
{
	CDecoder* p = g_Decoders.Get(id);
	if (p)
	{
		return p->Decode(env, data, amplifierGain);
	}
	return 0;
}

DLL_PUBLIC
jint
Java_com_zello_channel_sdk_platform_DecoderOpus_nativeGetSampleRate(JNIEnv* env, jobject object, int id)
{
	CDecoder* p = g_Decoders.Get(id);
	if (p)
	{
		return p->GetSampleRate(env);
	}
	return 0;
}

DLL_PUBLIC
jint
Java_com_zello_channel_sdk_platform_DecoderOpus_nativeGetFramesInPacket(JNIEnv* env, jobject object, int id)
{
	CDecoder* p = g_Decoders.Get(id);
	if (p)
	{
		return p->GetFramesInPacket(env);
	}
	return 0;
}

DLL_PUBLIC
jint
Java_com_zello_channel_sdk_platform_DecoderOpus_nativeGetFrameSize(JNIEnv* env, jobject object, int id)
{
    CDecoder* p = g_Decoders.Get(id);
    if (p)
    {
        return p->GetFrameSize(env);
    }
    return 0;
}

}
