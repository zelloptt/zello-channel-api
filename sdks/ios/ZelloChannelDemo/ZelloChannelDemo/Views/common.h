//
//  common.h
//  demo
//
//  Created by Jim Pickering on 12/5/17.
//  Copyright © 2018 Zello. All rights reserved.
//

#ifndef common_h
#define common_h
#define RGB(r, g, b)[UIColor colorWithRed:r / 255.0 green:g / 255.0 blue:b / 255.0 alpha:1]
#define RGBA(r, g, b, a)[UIColor colorWithRed:r / 255.0 green:g / 255.0 blue:b / 255.0 alpha:a]

#define kRoleDriver @"driver"
#define kRoleRider @"rider"
#define kRoleQA @"qa"

// Make sure you use the right server URL for your Zello account
// See https://github.com/zelloptt/zello-channel-api/blob/master/API.md
#define kServerUrl @"wss://zello.io/ws"
#define kDefaultChannel @"test"

#define kResponseError @"error"
#define kResponseSuccess @"success"

#define kTitleRoleSelection @"Select your role"

#define kStoryboardName @"Main"
#define kToRiderScreen @"toRiderScreen"
#define kToDriverTalk @"toDriverTalk"
#define kToQAMonitor @"toQAMonitor"

#define kDefaultWhiteBackground RGBA(255, 255, 255, 0.82f)
#endif /* common_h */
