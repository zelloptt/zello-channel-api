package com.zello.channel.sdk

import com.zello.channel.sdk.platform.Decoder
import com.zello.channel.sdk.platform.DecoderOpus
import com.zello.channel.sdk.platform.DecoderListener
import com.zello.channel.sdk.platform.PlayerListener
import com.zello.channel.sdk.platform.Utils

/**
 * This class implements voice streams from the Zello channels server to the client device
 */
abstract class IncomingVoiceStream internal constructor(
		session: Session, events: SessionListener?, context: SessionContext, id: Int, private val receiverConfig: IncomingVoiceConfiguration?) :
		VoiceStream(session, events, context, id) {

	private var decoder: Decoder? = null
	private val data: ArrayList<ByteArray> = ArrayList()
	private val dataSync = Object()
	private var closed = false // The message has released the resources it uses
	private var finished = false // The message was ended by the sender or timed out
	private var lastActiveTime: Long = 0 // Time when the last incoming packet was seen

	internal var packetDuration: Int = 0
		private set

	/**
	 * The name of the channel this stream is connected to
	 */
	override lateinit var channel: String
		protected set

	/**
	 * The username of the speaker
	 */
	lateinit var sender: String
		private set

	internal abstract fun onDone()

	internal abstract fun onStart()

	/**
	 * Start the incoming message.
	 * Must be called on the UI thread.
	 */
	internal fun start(codec: String?, header: ByteArray?, packetDuration: Int, channel: String, sender: String): Boolean {
		if (closed || codec == null) {
			session.logger.logError("IncomingVoiceStream already closed or missing codec")
			return false
		}
		var decoder: Decoder? = null
		if (DecoderOpus.name == codec) decoder = context.createDecoder()
		if (decoder == null) {
			session.logger.logError("IncomingVoiceStream failed to create decoder")
			return false
		}

		state = VoiceStreamState.STARTING
		this.packetDuration = packetDuration
		this.channel = channel
		this.sender = sender
		this.decoder = decoder
		decoder.init(context.createAudioReceiver(receiverConfig, decoder, this))
		decoder.setListener(object : DecoderListener {
			override fun onDecoderData(): ByteArray? {
				synchronized(dataSync) {
					while (!closed) {
						if (data.size > 0) {
							return data.removeAt(0)
						} else if (finished) {
							// Return nothing when there's no data expected
							return null
						}
						dataSync.wait(200)
						// Check if the message has timed out
						if (!finished && data.size == 0) {
							val time = Utils.getTickCount()
							if (time - lastActiveTime >= INACTIVE_TIMEOUT_MS) {
								finished = true
								// Signal about the end of the message
								context.runOnUiThread(Runnable {
									attemptOnDone()
								})
								return null
							}
						}
					}
				}
				return null
			}

			override fun onDecoderReady() {
				if (state == VoiceStreamState.STOPPED) return
				context.runOnUiThread(Runnable {
					decoder.start()
				})
			}

			override fun onDecoderStart() {
				if (state == VoiceStreamState.STOPPED) return
				context.runOnUiThread(Runnable {
					state = VoiceStreamState.ACTIVE
					startTimestamp = Utils.getTickCount()
					events?.onIncomingVoiceStarted(session, this@IncomingVoiceStream)
					onStart()
				})
			}

			override fun onDecoderStop() {
				if (state == VoiceStreamState.STOPPED) return
				context.runOnUiThread(Runnable {
					state = VoiceStreamState.STOPPED
					attemptOnDone()
				})
			}

			override fun onDecoderError() {
				if (state == VoiceStreamState.STOPPED) return
				context.runOnUiThread(Runnable {
					state = VoiceStreamState.STOPPED
					attemptOnDone()
				})
			}
		})
		decoder.setPlayerListener(object : PlayerListener {
			override fun onPlayerPositionChanged(pos: Int, Object: Any?) {
				if (state == VoiceStreamState.STOPPED) return
				context.runOnUiThread(Runnable {
					events?.onIncomingVoiceProgress(session, this@IncomingVoiceStream, pos)
				})
			}
		}, null)
		decoder.prepareAsync(header, 0, false)
		synchronized(dataSync) {
			lastActiveTime = Utils.getTickCount()
		}
		return true
	}

	/**
	 * Stop the incoming message and release all the resources used.
	 * Must be called on the UI thread.
	 */
	internal fun stop() {
		state = VoiceStreamState.STOPPED
		synchronized(dataSync) {
			closed = true
			dataSync.notifyAll()
		}
		decoder?.setListener(null)
		decoder?.setPlayerListener(null, null)
		decoder?.stop()
		decoder = null
		events?.onIncomingVoiceStopped(session, this)
	}

	/**
	 * Mark the message as finished.
	 * No data is expected to arrive and the message can be disposed of
	 * as soon as the playback is over.
	 * Must be called on the UI thread.
	 */
	internal fun finish() {
		synchronized(dataSync) {
			finished = true
			dataSync.notifyAll()
		}
	}

	// Any thread
	// Packet data may be missing which may be used as a signal to compensate for a lost packet
	internal fun onData(packetId: Int, packetData: ByteArray?) {
		synchronized(dataSync) {
			if (closed) return
			lastActiveTime = Utils.getTickCount()
			data.add(packetData ?: ByteArray(0))
			dataSync.notifyAll()
		}
	}

	private fun attemptOnDone() {
		if (decoder != null && state != VoiceStreamState.STOPPED) return
		onDone()
	}

	private companion object {
		private const val INACTIVE_TIMEOUT_MS = 5000
	}

}
