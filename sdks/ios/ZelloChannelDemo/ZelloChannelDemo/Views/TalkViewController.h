//
//  TalkViewController.h
//  demo
//
//  Created by Jim Pickering on 12/8/17.
//  Copyright © 2018 Zello. All rights reserved.
//

#import <UIKit/UIKit.h>
#import <MapKit/MapKit.h>
#import "BaseViewController.h"

@interface TalkViewController : BaseViewController
@property (nonatomic, strong) IBOutlet UIButton *buttonTalk;
@property (nonatomic, strong) IBOutlet MKMapView *mapView;
@property (nonatomic, strong) IBOutlet UIView *viewDetails;
@property (nonatomic, strong) IBOutlet UIView *viewHeader;

- (IBAction)onButtonTalkUp:(id)sender;

- (void)setButtonReceiving;
- (void)setButtonSending;
- (void)setButtonNormal;
@end
