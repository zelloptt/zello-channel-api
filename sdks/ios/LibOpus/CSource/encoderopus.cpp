#include "encoderopus.h"
#include "common.h"
#include "amplifier.h"

CEncoderOpus::CEncoderOpus() :
  m_pOpus (0),
  m_pPacketizer(0),
  m_framesInPacket(0),
  m_samplesInFrame(0),
  m_frameCount(0),
  m_sampleCount(0),
  m_packets(0),
  m_packet(0),
  m_packetLen(0),
  m_iAmplifierCoef(EQUALITY_COEF)
{
	pthread_mutex_init(&m_Mutex, 0);
}

CEncoderOpus::~CEncoderOpus()
{
	pthread_mutex_destroy(&m_Mutex);
}

bool ValidSampleRate(int sampleRate){
  return (sampleRate == 8000 || sampleRate == 12000 || sampleRate == 16000 || sampleRate == 24000 || sampleRate == 48000);
}
bool ValidFrameSize(int frameSize){
  return(frameSize == 5 || frameSize == 10 || frameSize == 20 || frameSize == 40 || frameSize == 60);
}

bool CEncoderOpus::Start(int sampleRate, int framesInPacket, int frameSize, int iBitrate, int iAmplifierGain){
	m_iAmplifierCoef = transformAmplifierGainToCoef(iAmplifierGain);
  
  if (!m_pOpus && ValidSampleRate(sampleRate) && ValidFrameSize(frameSize)){
    
		int error = 0;
		m_pOpus = opus_encoder_create(sampleRate, 1, OPUS_APPLICATION_VOIP, &error);
		if (m_pOpus){
			m_framesInPacket = framesInPacket;
			m_samplesInFrame = sampleRate * frameSize / 1000;
			m_frameCount = 0;
			m_sampleCount = 0;
			int bitrate = iBitrate > 0 ? iBitrate : DEFBITRATE;
			int complexity = DEFCOMPLEXITY;
			int lossRate = DEFLOSSRATE;
			m_packetLen = (1 + MAXFRAMEBYTES) * m_framesInPacket;
			m_packet = new unsigned char[m_packetLen];
      
			if (m_framesInPacket > 1){
				m_pPacketizer = opus_repacketizer_create();
				m_packets = new unsigned char*[m_framesInPacket];
				for (int i = 0; i < m_framesInPacket; ++i)
					m_packets[i] = new unsigned char[MAXFRAMEBYTES];
			}
      
			opus_encoder_ctl(m_pOpus, OPUS_SET_BANDWIDTH(OPUS_AUTO));
			opus_encoder_ctl(m_pOpus, OPUS_SET_VBR(1));
      opus_encoder_ctl(m_pOpus, OPUS_SET_INBAND_FEC(1));
			if (bitrate > 0){
				opus_encoder_ctl(m_pOpus, OPUS_SET_BITRATE(bitrate));
      }
			if (complexity >= 0){
				opus_encoder_ctl(m_pOpus, OPUS_SET_COMPLEXITY(complexity));
      }
			if (lossRate >= 0){
				opus_encoder_ctl(m_pOpus, OPUS_SET_PACKET_LOSS_PERC(lossRate));
      }
			return true;
		}
	}
	return false;

}


int CEncoderOpus::Stop(unsigned char* output){
	CGuard Guard(m_Mutex);
  int result = 0;
	if (m_pOpus){
		if (m_sampleCount || (m_pPacketizer && m_frameCount)){
			int outputLen = 0;
			if (m_sampleCount){
				memset(m_input + m_sampleCount, 0, (m_samplesInFrame - m_sampleCount) * 2);
				if (m_pPacketizer){
					// Negative result designates an error, result of 1 designates DTX (don't transmit)
					int packetLen = opus_encode(m_pOpus, m_input, m_samplesInFrame, m_packets[m_frameCount], MAXFRAMEBYTES);
					if (packetLen > 1)
						opus_repacketizer_cat(m_pPacketizer, m_packets[m_frameCount], packetLen);
				}
        else{
					// Negative result designates an error, result of 1 designates DTX (don't transmit)
					int packetLen = opus_encode(m_pOpus, m_input, m_samplesInFrame, m_packet, m_packetLen);
					if (packetLen > 1)
						outputLen = packetLen;
				}
			}
			if (m_pPacketizer){
				int frameCount = opus_repacketizer_get_nb_frames(m_pPacketizer);
				if (frameCount > 0){
					int packetLen = opus_repacketizer_out(m_pPacketizer, m_packet, m_packetLen);
					if (packetLen > 0)
						outputLen = packetLen;
				}
			}
			if (outputLen > 0){
        memcpy(output, m_packet, outputLen);
        result = outputLen;
			}
		}
		opus_encoder_destroy(m_pOpus);
		m_pOpus = 0;
		if (m_pPacketizer)
			opus_repacketizer_destroy(m_pPacketizer);
		m_pPacketizer = 0;
		if (m_packet){
			delete[] m_packet;
    }
		m_packet = 0;
		m_packetLen = 0;
		if (m_packets){
			for (int i = 0; i < m_framesInPacket; ++i)
				delete[] m_packets[i];
			delete[] m_packets;
			m_packets = 0;
		}
		m_framesInPacket = 0;
		m_samplesInFrame = 0;
		m_frameCount = 0;
		m_sampleCount = 0;
	}
	return result;

}

int CEncoderOpus::Encode(short* pData, int nData, unsigned char* output, int amplifierGain){
  m_iAmplifierCoef = transformAmplifierGainToCoef(amplifierGain);
  CGuard Guard(m_Mutex);
	int result = 0;
	if (m_pOpus && pData){
		
		if (nData > 0){
			
      short* p = pData;
      if (nData > m_samplesInFrame * m_framesInPacket){
        nData = m_samplesInFrame * m_framesInPacket;
      }
      int amplify = transformAmplifierGainToCoef(amplifierGain);
      
      while (nData){
        int next = m_samplesInFrame - m_sampleCount;
        if (next > nData){
          next = nData;
        }
        
        doAmplification(pData + m_sampleCount, p, next, amplify);
        p += next;
        m_sampleCount += next;
        nData -= next;
        
        if (m_sampleCount == m_samplesInFrame){
          int outputLen = 0;
          m_sampleCount = 0;
          if (m_pPacketizer){
            // Negative result designates an error, result of 1 designates DTX (don't transmit)
            int packetLen = opus_encode(m_pOpus, pData, m_samplesInFrame, m_packets[m_frameCount], MAXFRAMEBYTES);
            if (packetLen > 1){
              opus_repacketizer_cat(m_pPacketizer, m_packets[m_frameCount], packetLen);
            }
            ++m_frameCount;
            if (m_frameCount >= m_framesInPacket){
              int frameCount = opus_repacketizer_get_nb_frames(m_pPacketizer);
              if (frameCount > 0){
                packetLen = opus_repacketizer_out(m_pPacketizer, m_packet, m_packetLen);
                if (packetLen > 0){
                  outputLen = packetLen;
                }
              }
              opus_repacketizer_init(m_pPacketizer);
              m_frameCount = 0;
            }
          }
          else{
            // Negative result designates an error, result of 1 designates DTX (don't transmit)
            int packetLen = opus_encode(m_pOpus, pData, m_samplesInFrame, m_packet, m_packetLen);
            if (packetLen > 1){
              outputLen = packetLen;
            }
          }
          if (outputLen > 0){
            memcpy(output, m_packet, outputLen);
            result = outputLen;
          }
        }
      }
    }
  }
  return result;
}

int CEncoderOpus::GetHeader(int iSampleRate, int iFramesInPacket, int iFrameSize, unsigned char* pOutput){
  pOutput[0] = iSampleRate & 0xff;
  pOutput[1] = (iSampleRate >> 8) & 0xff;
  pOutput[2] = iFramesInPacket & 0xff;
  pOutput[3] = iFrameSize & 0xff;
	return 4;
}
