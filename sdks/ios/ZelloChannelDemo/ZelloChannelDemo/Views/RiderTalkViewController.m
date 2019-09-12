//
//  RiderViewController.m
//  demo
//
//  Created by Jim Pickering on 12/5/17.
//  Copyright © 2018 Zello. All rights reserved.
//

@import ZelloChannelKit;

#import "RiderTalkViewController.h"
#import "common.h"
#import "Zello.h"
#import "ImagePopupPresentationController.h"
#import "ImagePopupViewController.h"

@interface RiderTalkViewController () <ZCCSessionDelegate>
@property (nonatomic, weak) IBOutlet UIButton *buttonCancel;
@property (nonatomic, weak) IBOutlet UIButton *buttonDetail;
@property (nonatomic, weak) IBOutlet UILabel *labelTitle;
@property (nonatomic, weak) IBOutlet UILabel *labelDetail;
@property (nonatomic, weak) IBOutlet UILabel *labelHeaderTitle;
@property (nonatomic, weak) IBOutlet UILabel *labelHeaderDetail;
@property (nonatomic, weak) IBOutlet UIImageView *imageViewAvatar;
@property (nonatomic, weak) IBOutlet UITextField *feedbackTextField;
@end

@implementation RiderTalkViewController

- (void)viewDidLoad {
  [super viewDidLoad];
  
  self.buttonDetail.layer.borderWidth = 1.0;
  self.buttonDetail.layer.borderColor = RGBA(0, 0, 0, 0.05f).CGColor;
  self.buttonDetail.layer.cornerRadius = 4.0f;
  [self.buttonDetail setTitleColor:RGB(53.0f, 60.0f, 69.0f) forState:UIControlStateNormal];
  
  [self.navigationController.navigationBar setBarStyle:UIBarStyleDefault];
  [self.navigationItem setHidesBackButton:YES animated:YES];
}

- (void)viewWillDisappear:(BOOL)animated {
  [super viewWillDisappear:animated];
  [self.navigationController.navigationBar setBarStyle:UIBarStyleBlack];
}

- (IBAction)onButtonCancel:(id)sender {
  [self.navigationController.navigationBar setBarStyle:UIBarStyleBlack];
  [self.navigationController popViewControllerAnimated:YES];
}

- (IBAction)sendTextMessage {
  if (self.feedbackTextField.text.length > 0) {
    [Zello.session sendText:self.feedbackTextField.text];
    self.feedbackTextField.text = nil;
  }
}

#pragma mark - ZCCSessionDelegate

- (void)sessionDidDisconnect:(ZCCSession *)session {
  [self.navigationController.navigationBar setBarStyle:UIBarStyleBlack];
  [self.navigationController popViewControllerAnimated:YES];
}

- (void)session:(ZCCSession *)session outgoingVoice:(nonnull ZCCOutgoingVoiceStream *)stream didEncounterError:(nonnull NSError *)error {
  [self onButtonTalkUp:self];
}

- (void)session:(ZCCSession *)session incomingVoiceDidStart:(ZCCIncomingVoiceStream *)stream {
  [self setButtonReceiving];
}

- (void)session:(ZCCSession *)session incomingVoiceDidStop:(ZCCIncomingVoiceStream *)stream {
  [self setButtonNormal];
}

- (void)session:(ZCCSession *)session didReceiveImage:(ZCCImageInfo *)info {
  if (!info.image) {
    return;
  }
  // Show image in a popup
  ImagePopupViewController *popup = [self.storyboard instantiateViewControllerWithIdentifier:@"imagePopup"];
  popup.modalPresentationStyle = UIModalPresentationCustom;
  popup.image = info.image;
  ImagePopupPresentationController *presentationController = [[ImagePopupPresentationController alloc] initWithPresentedViewController:popup presentingViewController:self];
  popup.transitioningDelegate = presentationController;
  [self presentViewController:popup animated:YES completion:nil];
}

@end
