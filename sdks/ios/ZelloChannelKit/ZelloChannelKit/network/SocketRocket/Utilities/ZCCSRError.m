//
// Copyright (c) 2016-present, Facebook, Inc.
// All rights reserved.
//
// This source code is licensed under the BSD-style license found in the
// LICENSE file in the root directory of this source tree. An additional grant
// of patent rights can be found in the PATENTS file in the same directory.
//

#import "ZCCSRError.h"

#import "ZCCSRWebSocket.h"

NS_ASSUME_NONNULL_BEGIN

NSError *ZCCSRErrorWithDomainCodeDescription(NSString *domain, NSInteger code, NSString *description)
{
    return [NSError errorWithDomain:domain code:code userInfo:@{ NSLocalizedDescriptionKey: description }];
}

NSError *ZCCSRErrorWithCodeDescription(NSInteger code, NSString *description)
{
    return ZCCSRErrorWithDomainCodeDescription(ZCCSRWebSocketErrorDomain, code, description);
}

NSError *ZCCSRErrorWithCodeDescriptionUnderlyingError(NSInteger code, NSString *description, NSError *underlyingError)
{
    return [NSError errorWithDomain:ZCCSRWebSocketErrorDomain
                               code:code
                           userInfo:@{ NSLocalizedDescriptionKey: description,
                                       NSUnderlyingErrorKey: underlyingError }];
}

NSError *ZCCSRHTTPErrorWithCodeDescription(NSInteger httpCode, NSInteger errorCode, NSString *description)
{
    return [NSError errorWithDomain:ZCCSRWebSocketErrorDomain
                               code:errorCode
                           userInfo:@{ NSLocalizedDescriptionKey: description,
                                       ZCCSRHTTPResponseErrorKey: @(httpCode) }];
}

NS_ASSUME_NONNULL_END
