package com.zello.sample.ride

import android.content.Context
import android.content.res.Resources
import android.graphics.Bitmap
import android.util.Log
import com.zello.channel.sdk.ImageInfo
import com.zello.channel.sdk.IncomingVoiceConfiguration
import com.zello.channel.sdk.IncomingVoiceStream
import com.zello.channel.sdk.IncomingVoiceStreamInfo
import com.zello.channel.sdk.Location
import com.zello.channel.sdk.OutgoingVoiceConfiguration
import com.zello.channel.sdk.OutgoingVoiceStream
import com.zello.channel.sdk.OutgoingVoiceStreamError
import com.zello.channel.sdk.ReconnectReason
import com.zello.channel.sdk.SentLocationCallback
import com.zello.channel.sdk.Session
import com.zello.channel.sdk.SessionConnectError
import com.zello.channel.sdk.SessionListener
import com.zello.channel.sdk.VoiceSink
import com.zello.channel.sdk.VoiceSource
import com.zello.channel.sdk.VoiceStreamState

class Zello : SessionListener {
	var session: Session? = null
	var listener: SessionListener? = null

	var incomingStream: IncomingVoiceStream? = null
		private set
	var outgoingStream: OutgoingVoiceStream? = null
		private set

	fun establishSession(context: Context, username: String, password: String) {
		if (session != null) {
			session?.disconnect()
			session = null
		}

		session = Session.Builder(context, serverAddress, devAuthToken, channelName).
				setUsername(username, password).build()
		 session?.sessionListener = this
	}

	fun disconnect() {
		session?.sessionListener = null
		session?.disconnect()
	}

	fun startVoiceMessage(): OutgoingVoiceStream? {
		outgoingStream = session?.startVoiceMessage()
		return outgoingStream
	}

	fun honk(resources: Resources?) {
		if (resources == null) { return }
		if (outgoingStream != null) {
			return
		}
		val session = session ?: return

		val voiceSource = object: VoiceSource {
			var stopped = false

			override fun startProvidingAudio(sink: VoiceSink, sampleRate: Int, stream: OutgoingVoiceStream) {
				val honkFd = resources.openRawResourceFd(R.raw.honk)
				val honkReader = WavReader(honkFd)
				fun wavReaderCallback(status: WavReader.ReadStatus, samples: ShortArray?) {
					if (stopped) return

					when (status) {
						WavReader.ReadStatus.Done -> {
							if (samples != null && samples.isNotEmpty()) {
								sink.provideAudio(samples)
							}
							sink.stop()
							outgoingStream?.stop()
						}
						WavReader.ReadStatus.More -> {
							if (samples != null && samples.isNotEmpty()) {
								sink.provideAudio(samples)
							}
						}
						WavReader.ReadStatus.Error -> {
							Log.w(TAG, "Error reading honk.wav")
							sink.stop()
							outgoingStream?.stop()
						}
					}
				}
				honkReader.read(::wavReaderCallback)
			}

			override fun stopProvidingAudio(sink: VoiceSink) {
				stopped = true
			}

		}

		// Read the sample rate from the audio file
		val honkFd = resources.openRawResourceFd(R.raw.honk)
		val honkReader = WavReader(honkFd)
		val sampleRate = honkReader.sampleRate
		honkFd.close()
		outgoingStream = session.startVoiceMessage(OutgoingVoiceConfiguration(voiceSource, sampleRate)) ?: return
	}

	fun sendImage(image: Bitmap) {
		session?.sendImage(image)
	}

	fun sendLocation(continuation: SentLocationCallback?) {
		session?.sendLocation(continuation)
	}

	fun  sendText(message: String) {
		session?.sendText(message)
	}

	// region SessionListener

	override fun onChannelStatusUpdate(session: Session) {
		listener?.onChannelStatusUpdate(session)
	}

	override fun onConnectFailed(session: Session, error: SessionConnectError) {
		listener?.onConnectFailed(session, error)
		this.session = null
	}

	override fun onConnectStarted(session: Session) {
		listener?.onConnectStarted(session)
	}

	override fun onConnectSucceeded(session: Session) {
		listener?.onConnectSucceeded(session)
	}

	override fun onDisconnected(session: Session) {
		incomingStream = null
		outgoingStream = null
		this.session = null
		listener?.onDisconnected(session)
	}

	override fun onSessionWillReconnect(session: Session, reason: ReconnectReason): Boolean {
		incomingStream = null
		outgoingStream = null
		return listener?.onSessionWillReconnect(session, reason) ?: false
	}

	override fun onImageMessage(session: Session, imageInfo: ImageInfo) {
		listener?.onImageMessage(session, imageInfo)
	}

	override fun onIncomingVoiceWillStart(session: Session, streamInfo: IncomingVoiceStreamInfo): IncomingVoiceConfiguration? {
		return listener?.onIncomingVoiceWillStart(session, streamInfo)
	}

	override fun onIncomingVoiceStarted(session: Session, stream: IncomingVoiceStream) {
		incomingStream = stream
		listener?.onIncomingVoiceStarted(session, stream)
	}

	override fun onIncomingVoiceProgress(session: Session, stream: IncomingVoiceStream, positionMs: Int) {
		if (stream != incomingStream) {
			return
		}
		listener?.onIncomingVoiceProgress(session, stream, positionMs)
	}

	override fun onIncomingVoiceStopped(session: Session, stream: IncomingVoiceStream) {
		if (stream == incomingStream) {
			incomingStream = null
		}
		listener?.onIncomingVoiceStopped(session, stream)
	}

	override fun onLocationMessage(session: Session, sender: String, location: Location) {
		listener?.onLocationMessage(session, sender, location)
	}

	override fun onOutgoingVoiceError(session: Session, stream: OutgoingVoiceStream, error: OutgoingVoiceStreamError) {
		if (outgoingStream == stream) {
			outgoingStream = null
		}
		listener?.onOutgoingVoiceError(session, stream, error)
	}

	override fun onOutgoingVoiceProgress(session: Session, stream: OutgoingVoiceStream, positionMs: Int) {
		listener?.onOutgoingVoiceProgress(session, stream, positionMs)
	}

	override fun onOutgoingVoiceStateChanged(session: Session, stream: OutgoingVoiceStream) {
		if (stream != outgoingStream) {
			return
		}
		if (stream.state == VoiceStreamState.STOPPED) {
			outgoingStream = null
		}
		listener?.onOutgoingVoiceStateChanged(session, stream)
	}

	override fun onTextMessage(session: Session, sender: String, message: String) {
		listener?.onTextMessage(session, sender, message)
	}


	// endregion

	companion object {
		const val TAG = "Zello"
		val instance: Zello = Zello()

		/**
		 * Hardcoded server URL
		 */
		// TODO: Replace with the correct API endpoint
		private val serverAddress = "wss://zellowork.io/ws/default"

		// TODO: Replace with your channels SDK API key
		private val devAuthToken = "[AUTH TOKEN]"

		/**
		 * Hardcoded channel name
		 */
		// TODO: Replace with the channel name you want to connect to
		private val channelName = "Everyone"
	}
}
