//
//  Zello.h
//  ZelloChannelDemo
//
//  Created by Greg Cooksey on 2/23/18.
//  Copyright © 2018 Zello. All rights reserved.
//

@import Foundation;
@import ZelloChannelKit;

NS_ASSUME_NONNULL_BEGIN

@interface Zello : NSObject

@property (nonatomic, strong, readonly, nullable, class) ZCCSession *session;

+ (void)setupSessionWithURL:(NSURL *)url channel:(nullable NSString *)channel username:(nullable NSString *)username password:(NSString *)password;

+ (void)closeSession;

@end

NS_ASSUME_NONNULL_END
