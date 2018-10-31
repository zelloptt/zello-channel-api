#include <jni.h>
#include <cmath>
#include <limits.h>
#include <string.h> //malloc lives here? (o_O)
#include "amplifier.h"

int transformAmplifierGainToCoef(int iAmplifierGain)
{
	if(iAmplifierGain!=0)
		return static_cast<int>(std::floor(std::pow(10.0f, static_cast<float>(iAmplifierGain) / 20.0f) * EQUALITY_COEF_FL + .5f));
	return EQUALITY_COEF;
}

void doAmplification(jshort* pDest,short* pSrc,int nOutput,int iAmplifierCoef)
{
	if(iAmplifierCoef!=EQUALITY_COEF)
	{
		int nCurrent = nOutput;
		while(--nCurrent>=0)
		{
			int s = static_cast<int>(pSrc[nCurrent])*iAmplifierCoef;
			s /= EQUALITY_COEF;
			if(s>SHRT_MAX)
				pDest[nCurrent] = SHRT_MAX;
			else if(s<SHRT_MIN)
				pDest[nCurrent] = SHRT_MIN;
			else
				pDest[nCurrent] = static_cast<short>(s);
		}
	}
	else
		memcpy(pDest, pSrc, nOutput * 2);
}