//
//  Codec.h
//  LoudtalksLite
//
//  Created by JAMES PICKERING on 11/29/11.
//  Copyright © 2018 Zello. All rights reserved.
//

#import <Foundation/Foundation.h>

typedef NS_ENUM(NSInteger, ZCCCodecType) {
  ZCCCodecTypeSpeex = 0x00000001,
  ZCCCodecTypeAMR = 0x00000002,
  ZCCCodecTypeOpus = 0x00000004
};

typedef NSString * ZCCCodecName NS_TYPED_ENUM;
FOUNDATION_EXPORT ZCCCodecName const ZCCCodecNameAMR;
FOUNDATION_EXPORT ZCCCodecName const ZCCCodecNameSpeex;
FOUNDATION_EXPORT ZCCCodecName const ZCCCodecNameOpus;
