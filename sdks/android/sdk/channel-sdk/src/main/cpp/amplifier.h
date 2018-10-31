#pragma once

#define EQUALITY_COEF 1000
#define EQUALITY_COEF_FL 1000.0f

int transformAmplifierGainToCoef(int iAmplifierGain);
void doAmplification(jshort* pDest,short* pSrc,int nOutput,int iAmplifierCoef);

