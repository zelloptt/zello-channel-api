//
//  ZCCStreamState.h
//  sdk
//
//  Created by Alexey Gavrilov on 12/8/17.
//  Copyright © 2018 Zello. All rights reserved.
//

#ifndef ZCCStreamState_h
#define ZCCStreamState_h

/// States the voice stream can be in
typedef NS_ENUM(NSInteger, ZCCStreamState) {
  /// Waiting for the server or audio layer to be ready
  ZCCStreamStateStarting,

  /// Running -- playing or recording
  ZCCStreamStateActive,

  /// Stopping
  ZCCStreamStateStopping,

  /// Not running
  ZCCStreamStateStopped,

  /// Not running due to an error
  ZCCStreamStateError
};

#endif /* ZCCStreamState_h */
