//
//  DriverNextCollectionViewCell.m
//  demo
//
//  Created by Jim Pickering on 12/6/17.
//  Copyright © 2018 Zello. All rights reserved.
//

#import "DriverNextCollectionViewCell.h"
#import "DriverNext.h"

@interface DriverNextCollectionViewCell ()
@property (nonatomic, weak) IBOutlet UIView *viewContent;
@property (nonatomic, weak) IBOutlet UIView *viewHeader;
@property (nonatomic, weak) IBOutlet UILabel *labelTop;
@property (nonatomic, weak) IBOutlet UILabel *labelBottom;
@property (nonatomic, weak) IBOutlet UIImageView *imageViewAvatar;
@property (nonatomic, weak) IBOutlet UIButton *buttonTalk;
@property (nonatomic, weak) IBOutlet UIButton *buttonCancel;
@end

@implementation DriverNextCollectionViewCell

- (instancetype)init {
  self = [super init];
  if (self) {
    
  }
  return self;
}
- (void)setDriverItem:(DriverNext *)item {
  self.labelTop.text = item.topText;
  self.labelBottom.text = item.bottomText;
  self.imageViewAvatar.image = [UIImage imageNamed:item.imageName];
  
  self.contentView.layer.cornerRadius = 8.0f;
  self.contentView.layer.masksToBounds = YES;
  self.viewContent.layer.cornerRadius = 8.0f;
  self.viewContent.layer.masksToBounds = YES;
  
  CALayer *rightBorder = [CALayer layer];
  rightBorder.borderColor = [UIColor grayColor].CGColor;
  rightBorder.borderWidth = 0.5f;
  rightBorder.frame = CGRectMake(CGRectGetWidth(self.buttonTalk.frame) - 0.5f, 0 , 0.5f, CGRectGetHeight(self.buttonTalk.frame));
  [self.buttonTalk.layer addSublayer:rightBorder];

  
}
@end
