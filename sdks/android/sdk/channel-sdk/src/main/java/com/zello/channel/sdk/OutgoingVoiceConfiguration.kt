package com.zello.channel.sdk

/**
 * Use an OutgoingVoiceConfiguration object to specify the voice source when you want to send audio
 * to the Zello channels server from a source other than the device microphone.
 *
 * You will need to provide an object conforming to the [VoiceSource] interface. When the stream has
 * been opened to the channels server, your voice source object will receive a callback message
 * telling it that the system is ready for your audio stream to begin. The outgoing voice stream
 * will remain active until you close it by calling [stop] on either the [OutgoingVoiceStream] or the
 * [VoiceSink] provided to your voice source object.
 *
 * @property source Object that provides audio.
 *
 * @property sampleRate Sample rate, in Hz. If not specified, defaults to 16KHz.
 */
class OutgoingVoiceConfiguration(val source: VoiceSource, val sampleRate: Int)
