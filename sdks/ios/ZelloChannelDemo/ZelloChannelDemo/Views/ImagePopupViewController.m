//
//  ImagePopupViewController.m
//  ZelloChannelDemo
//
//  Created by Greg Cooksey on 9/6/19.
//  Copyright © 2019 Zello. All rights reserved.
//

#import "ImagePopupViewController.h"

@interface ImagePopupViewController ()
@property (nonatomic, weak) IBOutlet UIImageView *imageView;
@end

@implementation ImagePopupViewController {
  UIImage *_image;
}

#pragma mark - Properties

- (UIImage *)image {
  return _image;
}

- (void)setImage:(UIImage *)image {
  _image = image;
  if (self.viewLoaded) {
    self.imageView.image = image;
  }
}

#pragma mark - UIViewController

- (void)viewDidLoad {
  [super viewDidLoad];
  // Do any additional setup after loading the view.
  self.imageView.image = self.image;
}

#pragma mark - Actions

- (IBAction)closePopup {
  [self dismissViewControllerAnimated:YES completion:nil];
}

#pragma mark - UIPopoverPresentationControllerDelegate

- (UIModalPresentationStyle)adaptivePresentationStyleForPresentationController:(UIPresentationController *)controller {
  return UIModalPresentationNone;
}

@end
