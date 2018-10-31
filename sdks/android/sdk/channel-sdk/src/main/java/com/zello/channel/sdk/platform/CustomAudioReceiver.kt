package com.zello.channel.sdk.platform

import com.zello.channel.sdk.IncomingVoiceConfiguration
import com.zello.channel.sdk.IncomingVoiceStream
import com.zello.channel.sdk.SessionContext

/**
 * This class serves as a "player" that just passes incoming audio data to the user's [AudioReceiver].
 * During operation, it takes the place of [PlayerSpeaker] when the user implements
 * [SessionListener.onIncomingVoiceWillStart][com.zello.channel.sdk.SessionListener.onIncomingVoiceWillStart]
 * and passes audio data to the object they provide to the Session.
 *
 * It may also optionally pass audio through to the device speaker, in which case it acts simply as
 * a tap on the data going to the speaker and passes data to the user's AudioReceiver whenever the
 * player requests more.
 */
internal class CustomAudioReceiver(configuration: IncomingVoiceConfiguration, private val sessionContext: SessionContext, private val eventHandler: AudioReceiverEvents, private val stream: IncomingVoiceStream) : AudioReceiver, AudioReceiverEvents {

	private val voiceReceiver = configuration.receiver
	private val passThroughToSpeaker = configuration.playThroughSpeaker
	private var sampleRate = 0
	private var samplesPlayed = 0

	private var stopped = true
	// paused gets written from the UI thread and read from the pump thread
	@Volatile private var paused = false
	private val pausedSignal = Signal()

	private var playerListener: PlayerListener? = null
	private var playerListenerContext: Any? = null

	private var passThroughPlayer: AudioReceiver? = null

	private var pumpThread: ThreadEx? = null

	// region AudioReceiver
	override fun prepare(channels: Int, sampleRate: Int, bitsPerSample: Int, packetDuration: Int): Boolean {
		this.sampleRate = sampleRate
		voiceReceiver.prepare(stream, sampleRate)

		if (passThroughToSpeaker) {
			val passThrough = sessionContext.createAudioReceiver(null, this, stream)
			passThroughPlayer = passThrough
			return passThrough.prepare(channels, sampleRate, bitsPerSample, packetDuration)
		}

		return true
	}

	override fun start() {
		stopped = false
		val passThrough = passThroughPlayer
		if (passThrough != null) {
			passThrough.start()
			return
		}

		ensurePumpThread()
		pumpThread?.start()

		eventHandler.onPlaybackStart()
	}

	override fun stop() {
		if (!stopped) {
			val passThrough = passThroughPlayer
			if (passThrough != null) {
				passThrough.stop()
				return
			}

			stopped = true
			voiceReceiver.onStreamStopped(stream)
			eventHandler.onPlaybackEnd()
		}
	}

	override fun pause() {
		synchronized (pausedSignal) {
			paused = true
		}
		passThroughPlayer?.pause()
	}

	override fun resume() {
		synchronized (pausedSignal) {
			paused = false
			pausedSignal.eventNotifyNoSync()
		}
		passThroughPlayer?.resume()
	}

	override fun setStreamVolume(percent: Int) {
		passThroughPlayer?.setStreamVolume(percent)
	}

	override fun setDeviceVolume(percent: Int) {
		passThroughPlayer?.setDeviceVolume(percent)
	}

	override fun setMuted(muted: Boolean) {
		passThroughPlayer?.setMuted(muted)
	}

	override fun getPosition(): Int {
		return passThroughPlayer?.getPosition() ?: if (sampleRate != 0) (samplesPlayed * 1000 / sampleRate) else 0
	}

	override fun setPlayerListener(listener: PlayerListener?, listenerContext: Any?) {
		playerListener = listener
		playerListenerContext = listenerContext
	}

	override fun reset() {
		passThroughPlayer?.reset()
		playerListener = null
		playerListenerContext = null
	}

	override fun isPlaying(): Boolean {
		return passThroughPlayer?.isPlaying() ?: !(stopped || paused)
	}
	// endregion

	// region AudioReceiverEvents
	// onGet8BitData() shouldn't be called
	override fun onGet8BitData(): ByteArray? = null

	override fun onGet16BitData(): ShortArray? {
		val samples = eventHandler.onGet16BitData()
		if (samples != null) {
			sessionContext.runOnUiThread(Runnable {
				voiceReceiver.receive(samples, stream)
			})
		}
		return samples
	}

	override fun onPlaybackStart() {
		sessionContext.runOnUiThread(Runnable {
			eventHandler.onPlaybackStart()
		})
	}

	override fun onPlaybackEnd() {
		sessionContext.runOnUiThread(Runnable {
			stopped = true
			voiceReceiver.onStreamStopped(stream)
			eventHandler.onPlaybackEnd()
		})
	}

	override fun onPlaybackInitError() {
		sessionContext.runOnUiThread(Runnable {
			stopped = true
			eventHandler.onPlaybackInitError()
		})
	}
	// endregion

	// region Private
	private fun ensurePumpThread() {
		if (pumpThread != null) {
			return
		}

		pumpThread = object: ThreadEx("CustomAudioReceiver") {
			override fun run() {
				while (true) {
					synchronized (pausedSignal) {
						while(paused) {
							pausedSignal.eventWaitNoSync(100)
						}
					}

					// Check stopped after paused in case we're stopped while we're paused and then get resumed
					if (stopped) {
						return
					}

					val samples = eventHandler.onGet16BitData()
					if (samples == null) {
						sessionContext.runOnUiThread(Runnable {
							stopped = true
							voiceReceiver.onStreamStopped(stream)
							eventHandler.onPlaybackEnd()
						})
						return
					}

					sessionContext.runOnUiThread(Runnable {
						samplesPlayed += samples.size
						voiceReceiver.receive(samples, stream)
						playerListener?.onPlayerPositionChanged(getPosition(), playerListenerContext)
					})
				}
			}
		}
	}
	// endregion

}
