//
//  SessionViewController.m
//  demo
//
//  Created by Jim Pickering on 12/5/17.
//  Copyright © 2018 Zello. All rights reserved.
//

@import ZelloChannelKit;

#import "SessionViewController.h"
#import "common.h"
#import "DriverViewController.h"
#import "RiderTalkViewController.h"
#import "QAViewController.h"
#import "Zello.h"

@interface SessionViewController ()
@property (nonatomic, strong) IBOutlet UITextField *textFieldChannel;
@property (nonatomic, strong) IBOutlet UIButton *buttonConnect;
@property (nonatomic, strong) IBOutlet UITextView *textViewLog;
@property (nonatomic, strong) UITapGestureRecognizer *tapRecognizer;
@property (nonatomic, strong) UILongPressGestureRecognizer *longPressRecognizer;
@property (nonatomic, strong) UIActivityIndicatorView *activityIndicatorButton;
@property (nonatomic, strong) NSTimer *timerTimeout;
@end

#define kPlaceholderText @"channel"
#define kTitleError @"Error"
#define kEnterSessionName @"Enter a Channel Name"
#define kTitleMissingInformation @"Missing information"
#define kButtonTextCancel @"Cancel"
#define kButtonTextDisconnect @"Disconnect"
#define kButtonTextConnectAs @"Connect as %@"

#define kSessionTimeout 20.0f

@implementation SessionViewController

- (void)viewDidLoad {
  [super viewDidLoad];
  [self setDefaultConnectButton];
  self.textFieldChannel.attributedPlaceholder = [[NSAttributedString alloc] initWithString:kPlaceholderText attributes:@{NSForegroundColorAttributeName: RGBA(255.0f, 255.0f, 255.0f, .5f)}];
  self.buttonConnect.layer.cornerRadius = 8.0f;
  self.buttonConnect.layer.masksToBounds = YES;
  self.textViewLog.keyboardAppearance = UIKeyboardAppearanceDark;
  self.textViewLog.hidden = YES;
  self.textFieldChannel.text = kDefaultChannel;
}

- (void)viewWillAppear:(BOOL)animated {
  [super viewWillAppear:animated];
  [self.navigationController.navigationBar setBarStyle:UIBarStyleBlack];
  Zello.session.delegate = self;

  if (Zello.session.state == ZCCSessionStateConnected) {
    [self setDisconnectButton];
  } else {
    [self setDefaultConnectButton];
  }
}

- (void)viewDidAppear:(BOOL)animated {
  [super viewDidAppear:animated];
  self.tapRecognizer =  [[UITapGestureRecognizer alloc] initWithTarget:self action:@selector(didTapAnywhere:)];
  [self.view addGestureRecognizer:self.tapRecognizer];
  
  self.longPressRecognizer = [[UILongPressGestureRecognizer alloc] initWithTarget:self action:@selector(longPress:)];
  [self.longPressRecognizer setMinimumPressDuration:2.0f];
  self.longPressRecognizer.numberOfTouchesRequired = 2;
  [self.view addGestureRecognizer:self.longPressRecognizer];
  
}

- (void)viewWillDisappear:(BOOL)animated {
  [super viewWillDisappear:animated];
  [self.view removeGestureRecognizer:self.tapRecognizer];
  [self.view removeGestureRecognizer:self.longPressRecognizer];
  self.longPressRecognizer = nil;
  self.tapRecognizer = nil;
}

- (BOOL)gestureRecognizer:(UIGestureRecognizer *)gestureRecognizer shouldRecognizeSimultaneouslyWithGestureRecognizer:(UIGestureRecognizer *)otherGestureRecognizer {
  return YES;
}

#pragma mark - Navigation

- (void)prepareForSegue:(UIStoryboardSegue *)segue sender:(id)sender {
  NSLog(@"[SVC] prepareForSegue");
}

- (void)didTapAnywhere:(UITapGestureRecognizer *)recognizer {
  [self.view endEditing:YES];
}

- (void)longPress:(UITapGestureRecognizer *)recognizer {
  if (recognizer.state == UIGestureRecognizerStateBegan){
    self.textViewLog.hidden = !self.textViewLog.hidden;
  }
}

- (void)showMessage:(NSString *)message title:(NSString *)title {
  UIAlertController* alert = [UIAlertController alertControllerWithTitle:title ? : kTitleError
                                                                 message:message
                                                          preferredStyle:UIAlertControllerStyleAlert];
  
  UIAlertAction* defaultAction = [UIAlertAction actionWithTitle:@"OK" style:UIAlertActionStyleDefault
                                                        handler:^(UIAlertAction * action) {}];
  [alert addAction:defaultAction];
  [self presentViewController:alert animated:YES completion:nil];
}

- (IBAction)onButtonConnect:(id)sender {
  [self.view endEditing:YES];
  
  if (Zello.session.state != ZCCSessionStateConnected && Zello.session.state != ZCCSessionStateConnecting) {
    if (self.textFieldChannel.text.length > 0) {
      [self setBusyButton];
      [self ensureZelloSession];
      Zello.session.delegate = self;
      [Zello.session connect];
    } else {
      [self showMessage:kEnterSessionName title:kTitleMissingInformation];
    }
  } else {
    [Zello.session disconnect];
  }
}

- (BOOL)textFieldShouldReturn:(UITextField *)textField {
  [self.view endEditing:YES];
  if (textField.text.length > 0) {
    [self onButtonConnect:self];
  }
  return NO;
}

- (void)setBusyButton {
  [self.buttonConnect setTitle:[NSString stringWithFormat:kButtonTextCancel] forState:UIControlStateNormal];
  if (!self.activityIndicatorButton) {
    self.activityIndicatorButton = [[UIActivityIndicatorView alloc] initWithActivityIndicatorStyle:UIActivityIndicatorViewStyleWhite];
    [self.activityIndicatorButton setCenter:CGPointMake(self.buttonConnect.frame.size.width / 4, self.buttonConnect.frame.size.height / 2)];
    [self.buttonConnect addSubview:self.activityIndicatorButton];
    [self.activityIndicatorButton startAnimating];
    [self.buttonConnect layoutIfNeeded];
  }
  [self startTimer];
}

- (void)setDefaultConnectButton {
  [self.buttonConnect setTitle:[NSString stringWithFormat:kButtonTextConnectAs, self.role] forState:UIControlStateNormal];
  [self clearButtonActivity];
}

- (void)setDisconnectButton {
  [self.buttonConnect setTitle:[NSString stringWithFormat:kButtonTextDisconnect] forState:UIControlStateNormal];
  [self clearButtonActivity];
}

- (void)clearButtonActivity {
  if (self.activityIndicatorButton) {
    [self.activityIndicatorButton stopAnimating];
    [self.activityIndicatorButton removeFromSuperview];
    self.activityIndicatorButton = nil;
  }
}

#pragma mark - ZCCSessionDelegate

- (void)session:(ZCCSession *)session didFailToConnectWithError:(NSError *)error {
  [self stopTimer];
  [self setDefaultConnectButton];
  NSString *message = error.localizedDescription;
  if (error.userInfo[ZCCServerErrorMessageKey]) {
    message = error.userInfo[ZCCServerErrorMessageKey];
  }
  [self showMessage:message title:kTitleError];
}

- (void)sessionDidConnect:(ZCCSession *)session {
  [self stopTimer];
  [self setDisconnectButton];
  UIStoryboard *sb = [UIStoryboard storyboardWithName:kStoryboardName bundle:nil];
  if ([self.role isEqualToString:kRoleRider]) {
    RiderTalkViewController *riderViewController = [sb instantiateViewControllerWithIdentifier:kToRiderScreen];
    [self.navigationController pushViewController:riderViewController animated:YES];
  } else if ([self.role isEqualToString:kRoleDriver]) {
    DriverViewController *driverViewController = [sb instantiateViewControllerWithIdentifier:kToDriverTalk];
    [self.navigationController pushViewController:driverViewController animated:YES];
  } else if ([self.role isEqualToString:kRoleQA]) {
    QAViewController *qaViewController = [sb instantiateViewControllerWithIdentifier:kToQAMonitor];
    [self.navigationController pushViewController:qaViewController animated:YES];
  }
}

- (void)sessionDidDisconnect:(ZCCSession *)session {
  [self stopTimer];
  [self setDefaultConnectButton];
  [Zello closeSession];
}

- (void)startTimer {
  if (self.timerTimeout) {
    [self stopTimer];
  }
  self.timerTimeout = [NSTimer scheduledTimerWithTimeInterval:kSessionTimeout target:self selector:@selector(onTimer) userInfo:nil repeats:NO];
}

- (void)stopTimer {
  if (!self.timerTimeout) {
    return;
  }
  [self.timerTimeout invalidate];
  self.timerTimeout = nil;
}

- (void)onTimer {
  [self stopTimer];
  
  if (Zello.session.state == ZCCSessionStateConnected) {
    [self setDisconnectButton];
  } else {
    [self setDefaultConnectButton];
    [Zello.session disconnect];
    [self showMessage:@"Cannot connect" title:kTitleError];
  }
}

#pragma mark - Private

- (void)ensureZelloSession {
  if (!Zello.session) {
    [Zello setupSessionWithURL:[NSURL URLWithString:kServerUrl] channel:self.textFieldChannel.text username:self.username password:self.password];
  }
}

@end
