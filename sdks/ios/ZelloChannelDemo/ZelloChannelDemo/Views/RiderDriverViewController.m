//
//  ViewController.m
//  demo
//
//  Created by Jim Pickering on 12/4/17.
//  Copyright © 2018 Zello. All rights reserved.
//

@import ZelloChannelKit;
#import "RiderDriverViewController.h"
#import "SessionViewController.h"
#import "common.h"
#import "BaseViewController.h"
#import "Zello.h"

@interface RiderDriverViewController ()
@property (nonatomic, strong) IBOutlet UIButton *buttonRider;
@property (nonatomic, strong) IBOutlet UIButton *buttonDriver;
@property (nonatomic, strong) IBOutlet UITextField *textFieldUser;
@property (nonatomic, strong) IBOutlet UITextField *textFieldPassword;
@property (nonatomic, strong) UILongPressGestureRecognizer *longPressRecognizer;
@property (nonatomic, strong) UITapGestureRecognizer *tapRecognizer;
@end

@implementation RiderDriverViewController

- (void)viewDidLoad {
  [super viewDidLoad];
  self.buttonRider.backgroundColor = RGBA(77.0f, 77.0f, 77.0f, 0.5f);
  self.buttonDriver.backgroundColor = RGBA(77.0f, 77.0f, 77.0f, 0.5f);
  self.buttonRider.layer.cornerRadius = 8.0f;
  self.buttonDriver.layer.cornerRadius = 8.0f;
  self.buttonRider.layer.masksToBounds = YES;
  self.buttonDriver.layer.masksToBounds = YES;
  self.textFieldUser.hidden = NO;
  self.textFieldUser.text = @"";
  self.textFieldUser.attributedPlaceholder = [[NSAttributedString alloc] initWithString:@"username" attributes:@{NSForegroundColorAttributeName:RGBA(255.0f, 255.0f, 255.0f, 0.5f)}];
  self.textFieldPassword.attributedPlaceholder = [[NSAttributedString alloc] initWithString:@"password" attributes:@{NSForegroundColorAttributeName:RGBA(255.0f, 255.0f, 255.0f, 0.5f)}];
}

- (void)viewWillAppear:(BOOL)animated {
  [super viewWillAppear:animated];
  self.title = kTitleRoleSelection;
  
  self.tapRecognizer =  [[UITapGestureRecognizer alloc] initWithTarget:self action:@selector(didTapAnywhere:)];
  [self.view addGestureRecognizer:self.tapRecognizer];
  
  self.longPressRecognizer = [[UILongPressGestureRecognizer alloc] initWithTarget:self action:@selector(longPress:)];
  [self.longPressRecognizer setMinimumPressDuration:2.0f];
  self.longPressRecognizer.numberOfTouchesRequired = 2;
  [self.view addGestureRecognizer:self.longPressRecognizer];
  
  [Zello closeSession];
}

- (void)viewWillDisappear:(BOOL)animated {
  [super viewWillDisappear:animated];
  [self.view removeGestureRecognizer:self.longPressRecognizer];
  [self.view removeGestureRecognizer:self.tapRecognizer];
  self.longPressRecognizer = nil;
  self.tapRecognizer = nil;
}

- (void)didTapAnywhere:(UITapGestureRecognizer *)recognizer {
  [self.view endEditing:YES];
}

- (void)longPress:(UITapGestureRecognizer *)recognizer {
  if (recognizer.state == UIGestureRecognizerStateBegan){
    self.textFieldUser.hidden = !self.textFieldUser.hidden;
  }
}

- (BOOL)textFieldShouldReturn:(UITextField *)textField {
  [self.view endEditing:YES];
  return NO;
}

- (void)prepareForSegue:(UIStoryboardSegue *)segue sender:(id)sender {
  if ([segue.identifier isEqualToString:kRoleRider]
      || [segue.identifier isEqualToString:kRoleDriver]
      || [segue.identifier isEqualToString:kRoleQA]) {
    SessionViewController *session = segue.destinationViewController;
    session.role = segue.identifier;
    session.username = self.textFieldUser.text;
    session.password = self.textFieldPassword.text;
  }
}
@end
