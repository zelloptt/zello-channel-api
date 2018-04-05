//
//  DriverViewController.m
//  demo
//
//  Created by Jim Pickering on 12/6/17.
//  Copyright © 2018 Zello. All rights reserved.
//

#import "DriverViewController.h"
#import "DriverNext.h"
#import "DriverNextCollectionViewCell.h"
#import "common.h"
#import <MapKit/MapKit.h>

@interface DriverViewController ()
@property (nonatomic, strong) UICollectionView *collectionView;
@property (nonatomic, strong) NSMutableArray *arrayDriverList;
@property (nonatomic, weak) IBOutlet UIView *viewHeader;
@property (nonatomic, strong) IBOutlet MKMapView *mapView;
@end

@implementation DriverViewController

- (void)viewDidLoad {
  [super viewDidLoad];
  [self initDriverList];
  
  [self.navigationController.navigationBar setBarStyle:UIBarStyleDefault];
  self.viewHeader.backgroundColor = RGB(247, 247, 247);
  self.mapView.showsUserLocation = YES;
  self.view.backgroundColor = [UIColor whiteColor];
}

- (void)viewWillAppear:(BOOL)animated {
  [super viewWillAppear:animated];
  [self.collectionView reloadData];
}

- (void)viewWillDisappear:(BOOL)animated {
  [super viewWillDisappear:animated];
  [self.navigationController.navigationBar setBarStyle:UIBarStyleBlack];
}

- (void)initDriverList {
  self.arrayDriverList = [NSMutableArray array];
  NSString *plistFile = [[NSBundle mainBundle] pathForResource:@"driverlist" ofType:@"plist"];
  NSArray *arrayData = [NSArray arrayWithContentsOfFile:plistFile];
  
  for (NSDictionary *entry in arrayData) {
    [self.arrayDriverList addObject:[DriverNext driverItemWithDictionary:entry]];
  }
}

- (NSInteger)collectionView:(UICollectionView *)collectionView numberOfItemsInSection:(NSInteger)section {
  return (NSInteger)self.arrayDriverList.count;
}

- (NSInteger)numberOfSectionsInCollectionView:(UICollectionView *)collectionView {
  return 1;
}

- (UICollectionViewCell *)collectionView:(UICollectionView *)collectionView cellForItemAtIndexPath:(NSIndexPath *)indexPath {
  DriverNextCollectionViewCell *cell = [collectionView dequeueReusableCellWithReuseIdentifier:@"DriverNextCollectionViewCell" forIndexPath:indexPath];
  [cell setDriverItem:self.arrayDriverList[(NSUInteger)indexPath.row]];
  return cell;
}

#pragma mark - UICollectionViewFlowLayout

- (CGSize)collectionView:(UICollectionView *)collectionView layout:(UICollectionViewLayout*)collectionViewLayout sizeForItemAtIndexPath:(NSIndexPath *)indexPath {
  CGFloat width = self.view.frame.size.width - 40;
  CGFloat height = 112.0f;
  return CGSizeMake(width,height);
}

@end
