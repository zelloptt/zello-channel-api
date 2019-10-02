//
//  ZCCOutgoingVoiceConfiguration.h
//  ZelloChannelKit
//
//  Created by Greg Cooksey on 2/28/18.
//  Copyright © 2018 Zello. All rights reserved.
//

#import <CoreAudio/CoreAudioTypes.h>
#import <Foundation/Foundation.h>

@class ZCCOutgoingVoiceStream;

NS_ASSUME_NONNULL_BEGIN

/**
 * @abstract The <code>ZCCVoiceSink</code> protocol allows you to send audio from non-microphone sources to the Zello
 * channel.
 *
 * @discussion You get access to a <code>ZCCVoiceSink</code> by calling <code>-[ZCCSession startVoiceMessageWithConfiguration:]</code>
 * and passing a <code>ZCCOutgoingVoiceConfiguration</code> object specifying your <code>ZCCVoiceSource</code>. Once the stream
 * has finished being created to the channels server, <code>startProvidingAudio:sampleRate:stream:</code>
 * will be called on your <code>ZCCVoiceSource</code>. Use the provided <code>ZCCVoiceSink</code> to send audio data to the
 * channels server.
 *
 * Once you have a <code>ZCCVoiceSink</code>, call <code>provideAudio:</code> to send audio to the channels server. When you
 * have finished sending your message, call <code>stop</code> to close the outgoing voice stream and invalidate
 * the <code>ZCCVoiceSink</code> object. After calling <code>stop</code>, do not call any further methods on the <code>ZCCVoiceSink</code>.
 *
 * The data is expected to conform to an <code>AudioStreamBasicDescription</code> returned by
 * <code>-[ZCCOutgoingVoiceStream audioStreamDescriptionWithSampleRate:]</code> called with the sample rate
 * passed to your voice source's <code>startProvidingAudio:sampleRate:stream:</code> method.
 */
@protocol ZCCVoiceSink <NSObject, NSCopying>

/**
 * @abstract Call this method to send voice over the outgoing stream.
 *
 * @discussion The data is expected to conform to an <code>AudioStreamBasicDescription</code> returned by
 * <code>-[ZCCOutgoingVoiceStream audioStreamDescriptionWithSampleRate:]</code> called with the sample rate
 * passed to your voice source's <code>startProvidingAudio:sampleRate:stream:</code> method. If you
 * pass very small buffers, transmission will be delayed and the data will be cached until it fills
 * the SDK's internal buffer.
 *
 * @param audio A buffer of audio data
 */
- (void)provideAudio:(NSData *)audio;

/**
 * @abstract Call when you have no more audio to send over the stream
 *
 * @discussion This method closes the stream and invalidates the <code>ZCCVoiceSink</code> object.
 * After calling <code>stop</code>, don't call any further methods on the voice sink.
 */
- (void)stop;

@end

/**
 * Implement <code>ZCCVoiceSource</code> on an object that provides audio data to the Zello channels server.
 */
@protocol ZCCVoiceSource <NSObject>

/**
 * @abstract This method is called when an outgoing stream is ready to receive voice data
 *
 * @param sink the object that you pass voice data to when you have data ready to send
 *
 * @param sampleRate the audio sample rate that <sink> expects the data you send it to be in
 *
 * @param stream the stream that this voice source is sending audio to
 */
- (void)startProvidingAudio:(id<ZCCVoiceSink>)sink sampleRate:(NSUInteger)sampleRate stream:(ZCCOutgoingVoiceStream *)stream;

/**
 * @abstract Called when an outgoing stream can no longer receive audio
 *
 * @discussion When a voice stream closes, this method is called to inform your voice source that
 * the voice sink it has been sending audio to is no longer valid. You should stop calling methods
 * on <code>sink</code> and release related resources.
 *
 * @param sink the voice sink object passed to <startProvidingAudio:sampleRate:stream:> when the
 * containing stream started
 */
- (void)stopProvidingAudio:(id<ZCCVoiceSink>)sink;

@end

/**
 * Use a <code>ZCCOutgoingVoiceConfiguration</code> object to specify the voice source when you want to send
 * audio to the Zello channels server from a source other than the device microphone.
 *
 * You will need to provide an object conforming to the <code>ZCCVoiceSource</code> protocol. When the stream
 * has been opened to the channels server, your voice source object will receive a callback message
 * telling it that the system is ready for your audio stream to begin. The outgoing voice stream
 * will remain active until you close it by calling <code>stop</code> on either the <code>ZCCOutgoingVoiceStream</code>
 * or the <code>ZCCVoiceSink</code> provided to your voice source object.
 */
@interface ZCCOutgoingVoiceConfiguration : NSObject

/**
 * @abstract The sample rates supported by outgoing streams
 */
@property (nonatomic, readonly, class) NSArray <NSNumber *> *supportedSampleRates;

/**
 * @abstract Sample rate, in Hz
 *
 * @discussion Only values in <code>supportedSampleRates</code> are allowed. If not specified, defaults
 * to 16KHz.
 */
@property (nonatomic) NSUInteger sampleRate;

/**
 * @abstract Object that provides audio
 *
 * @discussion Assign your custom voice source object to this property. A strong reference to this
 * object will be maintained until the outgoing voice stream closes.
 */
@property (nonatomic, strong) id<ZCCVoiceSource> source;

@end

NS_ASSUME_NONNULL_END
