//
//  ZCCTypes.h
//  ZelloChannelKit
//
//  Created by Greg Cooksey on 9/23/19.
//  Copyright © 2019 Zello. All rights reserved.
//

#ifndef ZCCTypes_h
#define ZCCTypes_h

/**
 * Describes the features available in the channel that this session is connected to
 */
typedef NS_OPTIONS(NSInteger, ZCCChannelFeatures) {
  /// The channel does not support any features other than voice messages
  ZCCChannelFeaturesNone = 0,
  /// If present, the channel supports image messages
  ZCCChannelFeaturesImageMessages = 1 << 1,
  /// If present, the channel supports text messages
  ZCCChannelFeaturesTextMessages = 1 << 2,
  /// If present, the channel supports location messages
  ZCCChannelFeaturesLocationMessages = 1 << 3
};

/**
 * @abstract The online status of the channel
 *
 * @discussion Generally this reflects whether the session is connected to the server. In the future,
 *             it may be possible for the session to connect to the server, but enter a state where
 *             it is not considered to be connected to the channel.
 */
typedef NS_ENUM(NSInteger, ZCCChannelStatus) {
  ZCCChannelStatusUnknown,
  /// The session is not connected to the channel
  ZCCChannelStatusOffline,
  /// The session is connected to the channel
  ZCCChannelStatusOnline
};

#endif /* ZCCTypes_h */
