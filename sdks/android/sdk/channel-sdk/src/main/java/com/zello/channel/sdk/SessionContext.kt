package com.zello.channel.sdk

import com.zello.channel.sdk.platform.AudioReceiver
import com.zello.channel.sdk.platform.AudioReceiverEvents
import com.zello.channel.sdk.platform.AudioSource
import com.zello.channel.sdk.platform.AudioSourceEvents
import com.zello.channel.sdk.platform.Decoder
import com.zello.channel.sdk.platform.Encoder

/**
 * Platform-specific context.
 *
 * Implements a minimum set of calls necessary for an instance of [Session] to work.
 */
internal interface SessionContext {

	fun setLogger(logger: SessionLogger?)

	fun getLogger(): SessionLogger

	fun createAudioSource(configuration: OutgoingVoiceConfiguration?, audioEventHandler: AudioSourceEvents, stream: OutgoingVoiceStream): AudioSource

	fun createEncoder(): Encoder

	fun createAudioReceiver(configuration: IncomingVoiceConfiguration?, receiverEventHandler: AudioReceiverEvents, stream: IncomingVoiceStream): AudioReceiver

	fun createDecoder(): Decoder

	fun runOnUiThread(run: Runnable)

	fun runOnUiThread(run: Runnable, delayMillis: Long)

}
