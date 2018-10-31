#include "decoderopus.h"
#include "common.h"
#include "../../amplifier.h"

CDecoder::CDecoder() :
	_opus(0),
	_sampleRate(0),
	_framesInPacket(0),
	_samplesInFrame(0),
	_frameSize(0),
	_prevBufferSize(0),
	_prevLost(false)
{
	pthread_mutex_init(&_mutex, 0);
}

CDecoder::~CDecoder()
{
	pthread_mutex_destroy(&_mutex);
}

bool CDecoder::Start(JNIEnv* env, jbyteArray header)
{
	CGuard guard(_mutex);
	if (!_opus && header)
	{
		int headerLen = env->GetArrayLength(header);
		if (headerLen >= 4)
		{
			if (jbyte* input = env->GetByteArrayElements(header, 0))
			{
				int sampleRate = ((int) input[0] & 0xff) + (((int) input[1] & 0xff) << 8);
				int framesInPacket = (int) input[2] & 0xff;
				int frameSize = (int) input[3] & 0xff;
				env->ReleaseByteArrayElements(header, input, JNI_ABORT);
				if ((sampleRate == 8000 || sampleRate == 12000 || sampleRate == 16000 || sampleRate == 24000 || sampleRate == 48000) &&
					(framesInPacket > 0) && (framesInPacket * frameSize <= 120) &&
					(frameSize == 5 || frameSize == 10 || frameSize == 20 || frameSize == 40 || frameSize == 60))
				{
					int error = 0;
					_opus = opus_decoder_create(sampleRate, 1, &error);
					if (_opus)
					{
						_sampleRate = sampleRate;
						_framesInPacket = framesInPacket;
						_samplesInFrame = sampleRate * frameSize / 1000;
						_frameSize = frameSize;
						return true;
					}
				}
			}
		}
	}
	return false;
}

void CDecoder::Stop(JNIEnv* env)
{
	CGuard guard(_mutex);
	if (_opus)
	{
		opus_decoder_destroy(_opus);
		_opus = 0;
		_sampleRate = 0;
		_framesInPacket = 0;
		_samplesInFrame = 0;
		_frameSize = 0;
	}
}
/**
*	Since one buffer is stored inside decoder now for FEC, an extra decode call with NULL data it required 
*	at the end to make sure that last packet is decoded
*/
jshortArray CDecoder::Decode(JNIEnv* env, jbyteArray data, int amplifierGain)
{
	CGuard guard(_mutex);
	jshortArray result = 0;
	if (_opus)
	{
		opus_decoder_ctl(_opus, OPUS_SET_GAIN(amplifierGain * 256));
		int amplify = transformAmplifierGainToCoef(amplifierGain);
		int outputLen = 0;
		int dataLen = 0;
		
		jbyte* input = data == NULL ? NULL : env->GetByteArrayElements(data, 0);
		bool lost = input == NULL;
		if (!lost)
		{
			dataLen = env->GetArrayLength(data);
		}
		
		if (_prevBufferSize > 0)
		{
			if (_prevLost)
			{
				if (!lost)
				{
					// Use FEC data from this packet
					outputLen = opus_decode(_opus, (unsigned char*) input, dataLen, _output, _samplesInFrame * _framesInPacket, 1);
				}
				else
				{
					// Use PLC
					outputLen = opus_decode(_opus, NULL, 0, _output, _samplesInFrame * _framesInPacket, 0);
				}
			}
			else
			{
				// Decode previous packet normally
				outputLen = opus_decode(_opus, _prevBuffer, _prevBufferSize, _output, _maxPacketSize, 0);
			}
		}
		_prevLost = lost;
		if (!lost && input != NULL && dataLen < _maxPacketSize) {
			// Save current packet data
			memcpy(_prevBuffer, (unsigned char*) input, dataLen);
			_prevBufferSize = dataLen;
		}
		if (input != NULL)
		{
			env->ReleaseByteArrayElements(data, input, JNI_ABORT);
		}
		/*
		if (data)
		{
			// Decode data
			int dataLen = env->GetArrayLength(data);
			
			if (jbyte* input = env->GetByteArrayElements(data, 0))
			{
				outputLen = opus_decode(_opus, (unsigned char*) input, dataLen, _output, _maxPacketSize, 0);
				env->ReleaseByteArrayElements(data, input, JNI_ABORT);
			}
		} else {
			// Generate compensation data
			outputLen = opus_decode(_opus, NULL, 0, _output, _samplesInFrame * _framesInPacket, 0);
		}
		*/
		if (outputLen > 0)
		{
			result = env->NewShortArray(outputLen);
			if (result)
			{
				if (jshort* output = env->GetShortArrayElements(result, 0))
				{
					//doAmplification(output, _output, outputLen, amplify);
					memcpy(output, _output, outputLen * 2);
					env->ReleaseShortArrayElements(result, output, 0);
				}
			}
		}
	}
	return result;
}

int CDecoder::GetSampleRate(JNIEnv* env)
{
	CGuard guard(_mutex);
	return _sampleRate;
}

int CDecoder::GetFramesInPacket(JNIEnv* env)
{
	CGuard guard(_mutex);
	return _framesInPacket;
}

int CDecoder::GetFrameSize(JNIEnv* env)
{
	CGuard guard(_mutex);
	return _frameSize;
}
