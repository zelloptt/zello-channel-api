//
//  ZCCSocketFactory.h
//  ZelloChannelKit
//
//  Created by Greg Cooksey on 3/22/18.
//  Copyright © 2018 Zello. All rights reserved.
//

#import <Foundation/Foundation.h>

@class ZCCSocket;

/**
 * Socket factory class, for testability via dependency injection. Replace the createSocketWithURL
 * block to change the behavior of -socketWithURL:
 */
@interface ZCCSocketFactory : NSObject

@property (nonatomic, strong, nonnull) ZCCSocket * _Nonnull (^createSocketWithURL)(NSURL * _Nonnull);

/**
 * Calls createSocketWithURL() to create a ZCCSocket object that connects to url.
 */
- (nonnull ZCCSocket *)socketWithURL:(nonnull NSURL *)url;

@end
