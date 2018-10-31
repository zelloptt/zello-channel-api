package com.zello.channel.sdk.platform

import android.content.Context
import android.media.MediaRecorder
import android.media.AudioManager.OnAudioFocusChangeListener
import com.zello.channel.sdk.SessionLogger

internal class Audio private constructor(context: Context, val logger: SessionLogger?) {

	private var focusMode: Int = 0
	private var playbackCounter: Int = 0
	private var recordingCounter: Int = 0
	private var focusCounter: Int = 0
	private var focusListener: OnAudioFocusChangeListener? = null
	private var audioManager: android.media.AudioManager? = null

	val recordStreamType: Int
		get() = MediaRecorder.AudioSource.DEFAULT

	val playbackStreamType: Int
		get() = android.media.AudioManager.STREAM_MUSIC

	init {
		try {
			audioManager = context.getSystemService(Context.AUDIO_SERVICE) as android.media.AudioManager
		} catch (ignore: Throwable) {
			// Throws on some devices
		}

	}

	fun acquirePlayback() {
		synchronized(this) {
			++playbackCounter
			checkMode()
		}
	}

	fun releasePlayback() {
		synchronized(this) {
			--playbackCounter
			checkMode()
		}
	}

	fun acquireRecording() {
		synchronized(this) {
			++recordingCounter
			checkMode()
		}
	}

	fun releaseRecording() {
		synchronized(this) {
			--recordingCounter
			checkMode()
		}
	}

	fun acquireTransientFocus() {
		synchronized(this) {
			++focusCounter
			checkMode()
		}
	}

	fun releaseTransientFocus() {
		synchronized(this) {
			--focusCounter
			checkMode()
		}
	}

	private fun checkMode() {
		val needFocus = focusCounter > 0
		if (needFocus) {
			val focusMode = if (recordingCounter > 0) android.media.AudioManager.AUDIOFOCUS_GAIN_TRANSIENT else android.media.AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK
			if (focusMode == this.focusMode) {
				return
			}
			if (focusListener == null) {
				focusListener = OnAudioFocusChangeListener { focusChange ->
					when (focusChange) {
						android.media.AudioManager.AUDIOFOCUS_LOSS_TRANSIENT, android.media.AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK -> {
							synchronized(this@Audio) {
								this.focusMode = 0
								logger?.log("(AUDIO) lost audio focus")
							}
						}
					}
				}
			}
			var error: String? = null
			try {
				val ret = audioManager!!.requestAudioFocus(focusListener, playbackStreamType, focusMode)
				if (ret != android.media.AudioManager.AUDIOFOCUS_REQUEST_GRANTED) {
					error = Integer.toString(ret)
				}
			} catch (t: Throwable) {
				error = t.javaClass.name + "; " + t.message
			}

			if (error == null) {
				this.focusMode = focusMode
				logger?.log("(AUDIO) Acquired " + (if (focusMode == android.media.AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK) "ducking" else "full") + " audio focus")
			} else {
				logger?.logError("(AUDIO) Failed to acquire audio focus ($error)", null)
			}
		} else if (focusMode != 0) {
			focusMode = 0
			var error: String? = null
			try {
				val ret = audioManager!!.abandonAudioFocus(focusListener)
				if (ret != android.media.AudioManager.AUDIOFOCUS_REQUEST_GRANTED) {
					error = Integer.toString(ret)
				}
			} catch (t: Throwable) {
				error = t.javaClass.name + "; " + t.message
			}

			if (error == null) {
				logger?.log("(AUDIO) Released audio focus")
			} else {
				logger?.logError("(AUDIO) Failed to release audio focus ($error)", null)
			}
		}
	}

	companion object {

		private var _manager: Audio? = null

		@JvmStatic operator fun get(context: Context, logger: SessionLogger?): Audio? {
			if (_manager != null) {
				return _manager;
			}
			synchronized(Audio::class.java) {
				if (_manager == null) {
					_manager = Audio(context.applicationContext, logger)
				}
			}
			return _manager
		}
	}

}
