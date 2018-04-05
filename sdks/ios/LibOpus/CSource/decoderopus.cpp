#include "common.h"
#include "decoderopus.h"
#include "amplifier.h"

CDecoderOpus::CDecoderOpus() :
	m_pOpus (0),
  m_sampleRate(0),
  m_framesInPacket(0),
  m_samplesInFrame(0),
  m_frameSize(0)
{
	pthread_mutex_init(&m_Mutex, 0);
}

CDecoderOpus::~CDecoderOpus(){
	pthread_mutex_destroy(&m_Mutex);
}

bool CDecoderOpus::Start(unsigned char* pHeader, int nData){
	CGuard Guard(m_Mutex);
  
  if (!m_pOpus && pHeader){
		int headerLen = nData;
		if (headerLen >= 4){
			unsigned char* input = pHeader;
			if(input){
				int sampleRate = ((int) input[0] & 0xff) + (((int) input[1] & 0xff) << 8);
				int framesInPacket = (int) input[2] & 0xff;
				int frameSize = (int) input[3] & 0xff;
				
				if ((sampleRate == 8000 || sampleRate == 12000 || sampleRate == 16000 || sampleRate == 24000 || sampleRate == 48000) &&
            (framesInPacket > 0) && (framesInPacket * frameSize <= 120) &&
            (frameSize == 5 || frameSize == 10 || frameSize == 20 || frameSize == 40 || frameSize == 60))	{
					int error = 0;
					m_pOpus = opus_decoder_create(sampleRate, 1, &error);
					if (m_pOpus){
						m_sampleRate = sampleRate;
						m_framesInPacket = framesInPacket;
						m_samplesInFrame = sampleRate * frameSize / 1000;
						m_frameSize = frameSize;
						return true;
					}
        }
			}
		}
	}
	return false;
}

void CDecoderOpus::Stop(){
	CGuard Guard(m_Mutex);
	if (m_pOpus){
    opus_decoder_destroy(m_pOpus);
    m_pOpus = 0;
    m_sampleRate = 0;
    m_framesInPacket = 0;
    m_samplesInFrame = 0;
    m_frameSize = 0;
  }
}

void CDecoderOpus::SetGain(int iAmplifierGain) {
  CGuard Guard(m_Mutex);
  if (m_pOpus){
    opus_decoder_ctl(m_pOpus, OPUS_SET_GAIN(iAmplifierGain*256));
  }
}

int CDecoderOpus::Decode(unsigned char* pData, int nData, short* pOutput){
  int result = 0;
	CGuard Guard(m_Mutex);
	if (m_pOpus){

		int outputLen = 0;
    bool lost = pData == NULL;
    
    if (m_prevBufferSize > 0) {
      if (m_prevLost){
        //cout << "Previous packet lost\n";
        if (!lost) {
          outputLen = opus_decode(m_pOpus, pData, nData, pOutput, m_samplesInFrame * m_framesInPacket, 1);
          //cout << "This packet has data, use FEC: " << outputLen << "\n";
        } else {
          outputLen = opus_decode(m_pOpus, NULL, 0, pOutput, m_samplesInFrame * m_framesInPacket, 0);
          //cout << "This packet is lost too, use PLC: " << outputLen << "\n";
        }
      } else {
        outputLen = opus_decode(m_pOpus, m_prevBuffer, m_prevBufferSize, pOutput, m_samplesInFrame * m_framesInPacket, 0);
        //cout << "Decode previous packet: " << outputLen << "\n";
      }
    }
    
    m_prevLost = lost;
    if (!lost && nData < MAXPACKETSIZE) {
      // Save current packet data
      memcpy(m_prevBuffer, pData, nData);
      m_prevBufferSize = nData;
    }
    
		if (outputLen > 0){
      result = outputLen;
		}
    else{
      result = 0;
    }
	}
	return result;

}

int CDecoderOpus::GetSampleRate(){
	CGuard Guard(m_Mutex);
	return m_sampleRate;
}

int CDecoderOpus::GetFramesInPacket(){
	CGuard Guard(m_Mutex);
	return m_framesInPacket;
}

int CDecoderOpus::GetFrameSize(){
	CGuard guard(m_Mutex);
	return m_frameSize;
}

