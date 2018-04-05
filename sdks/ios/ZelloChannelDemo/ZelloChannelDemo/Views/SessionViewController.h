//
//  SessionViewController.h
//  demo
//
//  Created by Jim Pickering on 12/5/17.
//  Copyright © 2018 Zello. All rights reserved.
//

#import <UIKit/UIKit.h>
#import "BaseViewController.h"

@interface SessionViewController : BaseViewController
@property (nonatomic, copy, nonnull) NSString *role;
@property (nonatomic, copy, nonnull) NSString *username;
@property (nonatomic, copy, nonnull) NSString *password;
@end
