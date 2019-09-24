//
//  ImagePopupPresentationController.m
//  ZelloChannelDemo
//
//  Created by Greg Cooksey on 9/6/19.
//  Copyright © 2019 Zello. All rights reserved.
//

#import "ImagePopupPresentationController.h"

@implementation ImagePopupPresentationController

- (CGRect)frameOfPresentedViewInContainerView {
  CGSize size = CGSizeMake(300.0f, 340.0f);
  CGPoint origin = CGPointMake((self.containerView.frame.size.width - size.width) / 2.0,
                               (self.containerView.frame.size.height - size.height) / 2.0);
  return CGRectMake(origin.x, origin.y, size.width, size.height); // centered
}

- (UIPresentationController *)presentationControllerForPresentedViewController:(UIViewController *)presented presentingViewController:(UIViewController *)presenting sourceViewController:(UIViewController *)source {
  return self;
}

@end
