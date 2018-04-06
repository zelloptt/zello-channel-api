//
// Copyright 2012 Square Inc.
// Portions Copyright (c) 2016-present, Facebook, Inc.
//
// All rights reserved.
//
// This source code is licensed under the BSD-style license found in the
// LICENSE file in the root directory of this source tree. An additional grant
// of patent rights can be found in the PATENTS file in the same directory.
//

#import "NSURLRequest+ZCCSRWebSocket.h"
#import "NSURLRequest+ZCCSRWebSocketPrivate.h"

// Required for object file to always be linked.
void import_NSURLRequest_ZCCSRWebSocket() { }

NS_ASSUME_NONNULL_BEGIN

static NSString *const SRSSLPinnnedCertificatesKey = @"SocketRocket_SSLPinnedCertificates";

@implementation NSURLRequest (ZCCSRWebSocket)

- (nullable NSArray *)SR_ZCCSSLPinnedCertificates
{
    return nil;
}

@end

@implementation NSMutableURLRequest (ZCCSRWebSocket)

- (void)setSR_ZCCSSLPinnedCertificates:(nullable NSArray *)SR_SSLPinnedCertificates
{
    [NSException raise:NSInvalidArgumentException
                format:@"Using pinned certificates is neither secure nor supported in SocketRocket, "
                        "and leads to security issues. Please use a proper, trust chain validated certificate."];
}

@end

NS_ASSUME_NONNULL_END
