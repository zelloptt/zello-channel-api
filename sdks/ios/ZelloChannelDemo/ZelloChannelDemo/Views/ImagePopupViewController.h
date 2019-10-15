//
//  ImagePopupViewController.h
//  ZelloChannelDemo
//
//  Created by Greg Cooksey on 9/6/19.
//  Copyright © 2019 Zello. All rights reserved.
//

#import <UIKit/UIKit.h>

NS_ASSUME_NONNULL_BEGIN

@interface ImagePopupViewController : UIViewController <UIPopoverPresentationControllerDelegate>

@property (nonatomic, strong) UIImage *image;

@end

NS_ASSUME_NONNULL_END
