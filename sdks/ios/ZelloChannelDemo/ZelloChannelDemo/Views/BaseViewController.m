//
//  BaseViewController.m
//  demo
//
//  Created by Jim Pickering on 12/7/17.
//  Copyright © 2018 Zello. All rights reserved.
//

@import ZelloChannelKit;
#import "BaseViewController.h"
#import "common.h"
#import "Zello.h"

@implementation BaseViewController

- (void)viewDidLoad {
  [super viewDidLoad];
}

- (void)viewWillAppear:(BOOL)animated {
  [super viewWillAppear:animated];
  Zello.session.delegate = self;
}

@end
