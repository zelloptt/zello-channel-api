
#include "contexts.h"

#include "decoderopus.h"
#include "encoderopus.h"
#include "libopus.h"

static CContexts<CDecoderOpus> g_Decoders;
static CContexts<CEncoderOpus> g_Encoders;

#ifdef __X86__
extern "C"
{
  //void *__dso_handle = NULL;
 
}
#endif

extern "C"
{
  /**
   * com.loudtalks.platform.audio.EcoderOpus
   */
  int encoder_opus_nativeStart(int sampleRate, int framesInPacket, int frameSize, int bitrate, int amplifierGain){
    CEncoderOpus* p = new CEncoderOpus();
    if (!p->Start(sampleRate, framesInPacket, frameSize, bitrate, amplifierGain)){
      delete p;
      return 0;
    }
    return g_Encoders.Allocate(p);
  }
  
  int encoder_opus_nativeStop(int id, unsigned char* output){
    CEncoderOpus* p = g_Encoders.Release(id);
    if (p){
      int pRemaining = p->Stop(output);
      delete p;
      return pRemaining;
    }
    return 0;
  }
  
  int encoder_opus_nativeEncode(int id, short* data, int len, unsigned char* output, int amplifierGain){
    CEncoderOpus* p = g_Encoders.Get(id);
    if (p){
      return p->Encode(data, len, output, amplifierGain);
    }
    return 0;
  }
  
  int encoder_opus_nativeGetHeader(int sampleRate, int framesInPacket, int frameSize, unsigned char* output){
    return CEncoderOpus::GetHeader(sampleRate, framesInPacket, frameSize, output);
  }
  
  /**
   * com.loudtalks.platform.audio.Decoderopus
   */
  
  int decoder_opus_nativeStart(unsigned char* header, int len){
    CDecoderOpus* p = new CDecoderOpus();
    if (!p->Start(header, len)){
      delete p;
      return 0;
    }
    return g_Decoders.Allocate(p);
  }
  
  void decoder_opus_nativeSetGain(int id, int amplifierGain) {
    CDecoderOpus* p = g_Decoders.Get(id);
    if (p){
      return p->SetGain(amplifierGain);
    }
    return 0;
  }
  
  void decoder_opus_nativeStop(int id){
    CDecoderOpus* p = g_Decoders.Release(id);
    if (p){
      p->Stop();
      delete p;
      return;
    }
  }
  
  int decoder_opus_nativeDecode(int id, unsigned char* data, int len, short* output){
    CDecoderOpus* p = g_Decoders.Get(id);
    if (p){
      return p->Decode(data, len, output);
    }
    return 0;
  }
  
  int decoder_opus_nativeGetSampleRate(int id){
    CDecoderOpus* p = g_Decoders.Get(id);
    if (p){
      return p->GetSampleRate();
    }
    return 0;
  }
  
  int decoder_opus_nativeGetFramesInPacket(int id){
    CDecoderOpus* p = g_Decoders.Get(id);
    if (p){
      return p->GetFramesInPacket();
    }
    return 0;
  }
  
  
  int decoder_opus_nativeGetFrameSize(int id){
    CDecoderOpus* p = g_Decoders.Get(id);
    if (p){
      return p->GetFrameSize();
    }
    return 0;
  }
}
