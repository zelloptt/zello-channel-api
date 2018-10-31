package com.zello.channel.sdk

import com.zello.channel.sdk.commands.CommandStartVoiceStream
import com.zello.channel.sdk.commands.CommandStopVoiceStream
import com.zello.channel.sdk.platform.Encoder
import com.zello.channel.sdk.platform.EncoderListener
import com.zello.channel.sdk.platform.Utils
import com.zello.channel.sdk.transport.Transport

/**
 * Stream sending voice audio to the Zello Channels server. Create an outgoing voice stream by calling
 * [startVoiceMessage][Session.startVoiceMessage] and stop it by calling [stop]. After stopping an
 * outgoing voice stream, the object is defunct. To send more voice audio to the server, you will need
 * to create a new stream.
 */
abstract class OutgoingVoiceStream internal constructor(
		session: Session, events: SessionListener?, context: SessionContext, private var transport: Transport, private val configuration: OutgoingVoiceConfiguration?) :
		VoiceStream(session, events, context, 0) {

	private var encoder: Encoder? = null

	private var duration: Int = 0

	/**
	 * Called when message state changes
 	 */
	protected abstract fun onStateChanged(state: VoiceStreamState)

	/**
	 * Called when the message fails to start
 	 */
	protected abstract fun onError(error: OutgoingVoiceStreamError)

	/**
	 * Called when the message completely stops
 	 */
	protected abstract fun onStopped()

	// UI thread
	internal fun start() {
		state = VoiceStreamState.STARTING
		duration = 0
		val encoder = context.createEncoder()
		this.encoder = encoder
		encoder.setListener(object : EncoderListener {
			override fun onEncoderData(buffer: ByteArray) {
				if (state == VoiceStreamState.STOPPED) return
				transport.sendVoiceStreamData(streamId, buffer)
				context.runOnUiThread(Runnable {
					this@OutgoingVoiceStream.onEncoderData()
				})
			}

			override fun onEncoderReady() {
				if (state == VoiceStreamState.STOPPED) return
				context.runOnUiThread(Runnable {
					this@OutgoingVoiceStream.onEncoderReady()
				})
			}

			override fun onEncoderStart() {
			}

			override fun onEncoderErrorUnknown() {
				onCommandError(OutgoingVoiceStreamError.UNKNOWN)
			}

			override fun onEncoderErrorControlledAccess() {
				onCommandError(OutgoingVoiceStreamError.NO_MIC_PERMISSION)
			}

			override fun onEncoderErrorMicrophoneDevice() {
				onCommandError(OutgoingVoiceStreamError.DEVICE_PROBLEM)
			}

			override fun onEncoderErrorCodecImplementation() {
				onCommandError(OutgoingVoiceStreamError.UNKNOWN)
			}
		})
		val audioSource = context.createAudioSource(configuration, encoder, this)
		encoder.init(audioSource)
		encoder.prepareAsync(0, false)
		onStateChanged(state)
	}

	/**
	 * Stops transmitting audio to the Zello Channels server and closes the stream.
	 * Must be called on the main UI thread.
	 */
	fun stop() {
		val oldState = state
		encoder?.stop()
		encoder = null
		if (oldState == VoiceStreamState.ACTIVE) {
			val command = CommandStopVoiceStream(transport, streamId)
			command.send()
		}
		if (oldState != VoiceStreamState.STOPPED) {
			state = VoiceStreamState.STOPPED
			onStateChanged(state)
			onStopped()
		}
	}

	private fun onEncoderData() {
		val encoder = encoder ?: return
		duration += encoder.packetDuration
		events?.onOutgoingVoiceProgress(session, this, duration)
	}

	private fun onEncoderReady() {
		val encoder = encoder ?: return
		state = VoiceStreamState.STARTING
		onStateChanged(state)
		val command = object : CommandStartVoiceStream(transport, encoder.name, encoder.header, encoder.packetDuration) {
			override fun onSuccess(streamId: Int) {
				if (state == VoiceStreamState.STOPPED) return
				this@OutgoingVoiceStream.streamId = streamId
				state = VoiceStreamState.ACTIVE
				startTimestamp = Utils.getTickCount()
				encoder.start()
				onStateChanged(state)
			}

			override fun onFailure(error: OutgoingVoiceStreamError) {
				state = VoiceStreamState.ERROR
				// Call onError() before stop() or the VoiceManager thinks it's a stale error
				onError(error)
				stop()
			}
		}
		command.send()
	}

	private fun onCommandError(error: OutgoingVoiceStreamError) {
		context.runOnUiThread(Runnable {
			stop()
			onError(error)
		})
	}

}
