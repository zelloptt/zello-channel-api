//
//  ZCCWebSocketFactory.h
//  ZelloChannelKit
//
//  Created by Greg Cooksey on 3/26/18.
//  Copyright © 2018 Zello. All rights reserved.
//

#import <Foundation/Foundation.h>

@class ZCCSRWebSocket;

/**
 * Creates SRWebSockets. Web socket creation extracted for testability.
 */
@interface ZCCWebSocketFactory : NSObject

@property (nonatomic, strong, nonnull) ZCCSRWebSocket * _Nonnull (^createWebSocket)(NSURL * _Nonnull url);

- (nonnull ZCCSRWebSocket *)socketWithURL:(nonnull NSURL *)url;

@end
