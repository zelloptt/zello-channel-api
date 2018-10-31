#include "encoderopus.h"
#include "common.h"
#include "../../amplifier.h"

CEncoder::CEncoder() :
	_opus(0),
	_packetizer(0),
	_framesInPacket(0),
	_samplesInFrame(0),
	_frameCount(0),
	_sampleCount(0),
	_packets(0),
	_packet(0),
	_packetLen(0)
{
	pthread_mutex_init(&_mutex, 0);
}

CEncoder::~CEncoder()
{
	pthread_mutex_destroy(&_mutex);
}

bool CEncoder::Start(JNIEnv* env, int sampleRate, int framesInPacket, int frameSize, int bitrate)
{
	CGuard guard(_mutex);
	if (!_opus &&
		(sampleRate == 8000 || sampleRate == 12000 || sampleRate == 16000 || sampleRate == 24000 || sampleRate == 48000) &&
		(frameSize == 5 || frameSize == 10 || frameSize == 20 || frameSize == 40 || frameSize == 60))
	{
		int error = 0;
		_opus = opus_encoder_create(sampleRate, 1, OPUS_APPLICATION_VOIP, &error);
		if (_opus)
		{
			_framesInPacket = framesInPacket;
			_samplesInFrame = sampleRate * frameSize / 1000;
			_frameCount = 0;
			_sampleCount = 0;
			int complexity = _defComplexity;
			int lossRate = _defLossRate;
			_packetLen = (1 + _maxFrameBytes) * _framesInPacket;
			_packet = new unsigned char[_packetLen];
			if (_framesInPacket > 1)
			{
				_packetizer = opus_repacketizer_create();
				_packets = new unsigned char*[_framesInPacket];
				for (int i = 0; i < _framesInPacket; ++i)
					_packets[i] = new unsigned char[_maxFrameBytes];
			}
			opus_encoder_ctl(_opus, OPUS_SET_BANDWIDTH(OPUS_AUTO));
			opus_encoder_ctl(_opus, OPUS_SET_VBR(1));
			opus_encoder_ctl(_opus, OPUS_SET_INBAND_FEC(1));
			if (bitrate > 0)
				opus_encoder_ctl(_opus, OPUS_SET_BITRATE(bitrate));
			if (complexity >= 0)
				opus_encoder_ctl(_opus, OPUS_SET_COMPLEXITY(complexity));
			if (lossRate >= 0)
				opus_encoder_ctl(_opus, OPUS_SET_PACKET_LOSS_PERC(lossRate));
			return true;
		}
	}
	return false;
}

jbyteArray CEncoder::Stop(JNIEnv* env)
{
	CGuard guard(_mutex);
	jbyteArray result = 0;
	if (_opus)
	{
		if (_sampleCount || (_packetizer && _frameCount))
		{
			int outputLen = 0;
			if (_sampleCount)
			{
				memset(_input + _sampleCount, (_samplesInFrame - _sampleCount) * 2, 0);
				if (_packetizer)
				{
					// Negative result designates an error, result of 1 designates DTX (don't transmit)
					int packetLen = opus_encode(_opus, _input, _samplesInFrame, _packets[_frameCount], _maxFrameBytes);
					if (packetLen > 1)
						opus_repacketizer_cat(_packetizer, _packets[_frameCount], packetLen);
				} else
				{
					// Negative result designates an error, result of 1 designates DTX (don't transmit)
					int packetLen = opus_encode(_opus, _input, _samplesInFrame, _packet, _packetLen);
					if (packetLen > 1)
						outputLen = packetLen;
				}
			}
			if (_packetizer)
			{
				int frameCount = opus_repacketizer_get_nb_frames(_packetizer);
				if (frameCount > 0)
				{
					int packetLen = opus_repacketizer_out(_packetizer, _packet, _packetLen);
					if (packetLen > 0)
						outputLen = packetLen;
				}
			}
			if (outputLen > 0)
			{
				result = env->NewByteArray(outputLen);
				if (result)
				{
					if (jbyte* output = env->GetByteArrayElements(result, 0))
					{
						memcpy(output, _packet, outputLen);
						env->ReleaseByteArrayElements(result, output, 0);
					}
				}
			}
		}
		opus_encoder_destroy(_opus);
		_opus = 0;
		if (_packetizer)
			opus_repacketizer_destroy(_packetizer);
		_packetizer = 0;
		if (_packet)
			delete[] _packet;
		_packet = 0;
		_packetLen = 0;
		if (_packets)
		{
			for (int i = 0; i < _framesInPacket; ++i)
				delete[] _packets[i];
			delete[] _packets;
			_packets = 0;
		}
		_framesInPacket = 0;
		_samplesInFrame = 0;
		_frameCount = 0;
		_sampleCount = 0;
	}
	return result;
}

jbyteArray CEncoder::Encode(JNIEnv* env, jshortArray data, int amplifierGain)
{
	
	CGuard guard(_mutex);
	jbyteArray result = 0;
	if (_opus && data)
	{
		int dataLen = env->GetArrayLength(data);
		if (dataLen > 0)
		{
			if (jshort* input = env->GetShortArrayElements(data, 0))
			{
				jshort* p = input;
				if (dataLen > _samplesInFrame * _framesInPacket)
					dataLen = _samplesInFrame * _framesInPacket;
				int amplify = transformAmplifierGainToCoef(amplifierGain);
				while (dataLen)
				{
					int next = _samplesInFrame - _sampleCount;
					if (next > dataLen)
						next = dataLen;
					doAmplification(_input + _sampleCount, p, next, amplify);
					p += next;
					_sampleCount += next;
					dataLen -= next;
					if (_sampleCount == _samplesInFrame)
					{
						int outputLen = 0;
						_sampleCount = 0;
						if (_packetizer)
						{
							// Negative result designates an error, result of 1 designates DTX (don't transmit)
							int packetLen = opus_encode(_opus, _input, _samplesInFrame, _packets[_frameCount], _maxFrameBytes);
							if (packetLen > 1)
								opus_repacketizer_cat(_packetizer, _packets[_frameCount], packetLen);
							++_frameCount;
							if (_frameCount >= _framesInPacket)
							{
								int frameCount = opus_repacketizer_get_nb_frames(_packetizer);
								if (frameCount > 0)
								{
									packetLen = opus_repacketizer_out(_packetizer, _packet, _packetLen);
									if (packetLen > 0)
										outputLen = packetLen;
								}
								opus_repacketizer_init(_packetizer);
								_frameCount = 0;
							}
						} else
						{
							// Negative result designates an error, result of 1 designates DTX (don't transmit)
							int packetLen = opus_encode(_opus, _input, _samplesInFrame, _packet, _packetLen);
							if (packetLen > 1)
								outputLen = packetLen;
						}
						if (outputLen > 0)
						{
							result = env->NewByteArray(outputLen);
							if (result)
							{
								if (jbyte* output = env->GetByteArrayElements(result, 0))
								{
									memcpy(output, _packet, outputLen);
									env->ReleaseByteArrayElements(result, output, 0);
								}
							}
						}
					}
				}
				env->ReleaseShortArrayElements(data, input, JNI_ABORT);
			}
		}
	}
	return result;
}

jbyteArray CEncoder::GetHeader(JNIEnv* env, int sampleRate, int framesInPacket, int frameSize)
{
	jbyteArray result = env->NewByteArray(4);
	if (result)
	{
		if (jbyte* output = env->GetByteArrayElements(result, 0))
		{
			output[0] = sampleRate & 0xff;
			output[1] = (sampleRate >> 8) & 0xff;
			output[2] = framesInPacket & 0xff;
			output[3] = frameSize & 0xff;
			env->ReleaseByteArrayElements(result, output, 0);
		}
	}
	return result;
}
