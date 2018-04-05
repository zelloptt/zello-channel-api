//
//  QAViewController.m
//  ZelloChannelDemo
//
//  Created by Greg Cooksey on 3/6/18.
//  Copyright © 2018 Zello. All rights reserved.
//

@import AudioToolbox;
@import AVFoundation;
#import <ZelloChannelKit/ZelloChannelKit.h>
#import "QAViewController.h"
#import "Zello.h"

@interface ChannelMessage : NSObject
@property (nonatomic) BOOL recording;
@property (nonatomic, copy) NSString *sender;
@property (nonatomic, strong) NSDate *receivedDate;
@property (nonatomic) AudioStreamBasicDescription audioDescription;
@property (nonatomic, strong) NSMutableData *audioData;
@end

@implementation ChannelMessage

- (instancetype)init {
  self = [super init];
  if (self) {
    _audioData = [NSMutableData data];
  }
  return self;
}

@end

@interface QAViewController () <AVAudioPlayerDelegate, UITableViewDataSource, UITableViewDelegate, ZCCSessionDelegate, ZCCVoiceReceiver>
@property (nonatomic, weak) IBOutlet UITableView *messagesTableView;
@property (nonatomic, weak) IBOutlet UISwitch *monitorSwitch;

@property (nonatomic, strong) NSMutableArray <ChannelMessage *> *messages;
@property (nonatomic, strong) NSDateFormatter *dateFormatter;
@property (nonatomic, strong) AVAudioPlayer *player;
@end

@implementation QAViewController

- (void)viewDidLoad {
  [super viewDidLoad];
  
  self.dateFormatter = [[NSDateFormatter alloc] init];
  self.dateFormatter.dateStyle = NSDateFormatterShortStyle;
  self.dateFormatter.timeStyle = NSDateFormatterShortStyle;
  self.messages = [@[] mutableCopy];
}

- (void)viewWillAppear:(BOOL)animated {
  [super viewWillAppear:animated];
  Zello.session.delegate = self;

  self.monitorSwitch.on = NO;
}

#pragma mark - AVAudioPlayerDelegate

- (void)audioPlayerDidFinishPlaying:(AVAudioPlayer *)player successfully:(BOOL)flag {
  dispatch_async(dispatch_get_main_queue(), ^{
    [self.messagesTableView deselectRowAtIndexPath:self.messagesTableView.indexPathForSelectedRow animated:NO];
    self.player.delegate = nil;
    self.player = nil;
  });
}

- (void)audioPlayerDecodeErrorDidOccur:(AVAudioPlayer *)player error:(NSError *)error {
  NSLog(@"Error decoding audio: %@", error);
}

#pragma mark - UITableViewDataSource

- (NSInteger)tableView:(UITableView *)tableView numberOfRowsInSection:(NSInteger)section {
  return self.messages.count;
}

- (UITableViewCell *)tableView:(UITableView *)tableView cellForRowAtIndexPath:(NSIndexPath *)indexPath {
  UITableViewCell *cell = [tableView dequeueReusableCellWithIdentifier:@"message"];
  if (!cell) {
    cell = [[UITableViewCell alloc] initWithStyle:UITableViewCellStyleValue1 reuseIdentifier:@"message"];
  }
  ChannelMessage *message = self.messages[indexPath.row];
  cell.textLabel.text = message.sender;
  cell.detailTextLabel.text = [self.dateFormatter stringFromDate:message.receivedDate];
  if (message.recording) {
    cell.textLabel.textColor = UIColor.redColor;
  } else {
    cell.textLabel.textColor = UIColor.blackColor;
  }
  return cell;
}

#pragma mark - UITableViewDelegate

- (void)tableView:(UITableView *)tableView didSelectRowAtIndexPath:(NSIndexPath *)indexPath {
  ChannelMessage *message = self.messages[indexPath.row];
  if (!message) {
    return;
  }
  if (message.recording) {
    [tableView deselectRowAtIndexPath:indexPath animated:NO];
    return;
  }
  [self playMessage:message];
}

#pragma mark - ZCCSessionDelegate

- (ZCCIncomingVoiceConfiguration *)session:(ZCCSession *)session incomingVoiceWillStart:(ZCCIncomingVoiceStreamInfo *)streamInfo {
  // Session callbacks are called on the main thread, so there's no need to dispatch here
  
  ZCCIncomingVoiceConfiguration *receiverConfig = [[ZCCIncomingVoiceConfiguration alloc] init];
  receiverConfig.receiver = self;
  self.monitorSwitch.enabled = NO;
  receiverConfig.playThroughSpeaker = self.monitorSwitch.on;

  ChannelMessage *incoming = [[ChannelMessage alloc] init];
  incoming.sender = streamInfo.sender;
  incoming.receivedDate = [NSDate date];
  incoming.recording = YES;

  [self.messagesTableView beginUpdates];
  if (self.messages.count > 4) {
    [self.messages removeObjectAtIndex:4];
    [self.messagesTableView deleteRowsAtIndexPaths:@[[NSIndexPath indexPathForRow:4 inSection:0]] withRowAnimation:UITableViewRowAnimationBottom];
  }
  [self.messages insertObject:incoming atIndex:0];
  [self.messagesTableView insertRowsAtIndexPaths:@[[NSIndexPath indexPathForRow:0 inSection:0]] withRowAnimation:UITableViewRowAnimationTop];
  [self.messagesTableView endUpdates];

  return receiverConfig;
}

#pragma mark - ZCCVoiceReceiver

- (void)prepareWithAudioDescription:(AudioStreamBasicDescription)description stream:(ZCCIncomingVoiceStream *)stream {
  dispatch_async(dispatch_get_main_queue(), ^{
    ChannelMessage *first = self.messages.firstObject;
    if (!first.recording) {
      return;
    }

    first.audioDescription = description;
  });
}

- (void)receiveAudio:(NSData *)audioData stream:(ZCCIncomingVoiceStream *)stream {
  dispatch_async(dispatch_get_main_queue(), ^{
    ChannelMessage *first = self.messages.firstObject;
    if (!first.recording) {
      return;
    }

    [first.audioData appendData:audioData];
  });
}

- (void)stopReceivingAudio:(ZCCIncomingVoiceStream *)stream {
  dispatch_async(dispatch_get_main_queue(), ^{
    ChannelMessage *first = self.messages.firstObject;
    if (!first.recording) {
      return;
    }

    first.recording = NO;
    [self.messagesTableView reloadRowsAtIndexPaths:@[[NSIndexPath indexPathForRow:0 inSection:0]] withRowAnimation:UITableViewRowAnimationNone];
    self.monitorSwitch.enabled = YES;
  });
}

#pragma mark - Private

- (void)playMessage:(ChannelMessage *)message {
  if (self.player) {
    self.player.delegate = nil;
    [self.player stop];
    self.player = nil;
  }

  NSURL *cache = [[[NSFileManager defaultManager] URLsForDirectory:NSCachesDirectory inDomains:NSUserDomainMask] firstObject];
  NSURL *tempAudioURL = [cache URLByAppendingPathComponent:@"temp.caf"];
  AudioFileID fileID = NULL;
  AudioStreamBasicDescription desc = message.audioDescription;
  OSStatus status = AudioFileCreateWithURL((__bridge CFURLRef)tempAudioURL, kAudioFileCAFType, &desc, kAudioFileFlags_EraseFile, &fileID);
  if (status != noErr) {
    NSLog(@"Error creating temp audio file (%d)", (int)status);
    return;
  }
  UInt32 numBytes = (UInt32)message.audioData.length;
  status = AudioFileWriteBytes(fileID, true, 0, &numBytes, message.audioData.bytes);
  AudioFileClose(fileID);
  if (status != noErr) {
    NSLog(@"Error writing temp audio file (%d)", (int)status);
    return;
  }

  NSError *error = nil;
  self.player = [[AVAudioPlayer alloc] initWithContentsOfURL:tempAudioURL error:&error];
  if (!self.player) {
    NSLog(@"Error initalizing player: %@", error);
    return;
  }
  self.player.delegate = self;
  [self.player play];
}

@end
