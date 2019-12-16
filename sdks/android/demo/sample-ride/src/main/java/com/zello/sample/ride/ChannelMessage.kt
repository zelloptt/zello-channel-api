package com.zello.sample.ride

import com.zello.channel.sdk.IncomingVoiceStream
import com.zello.channel.sdk.VoiceReceiver
import java.util.Date

interface ChannelMessage {
	val sender: String
	val receivedDate: Date
	val isRecording: Boolean
		get() {
			 return false
		}
	val titleText: String
	val subtitleText: String
}

class ChannelMessageVoice(override val sender: String, override val receivedDate: Date) : ChannelMessage, VoiceReceiver {

	interface Events {
		fun onRecordingChanged(message: ChannelMessage, isRecording: Boolean)
	}
	var listener: Events? = null
		set(value) {
			field = value
			value?.onRecordingChanged(this, isRecording)
		}

	override var isRecording = false
		private set(value) {
			if (field != value) {
				field = value
				listener?.onRecordingChanged(this, value)
			}
		}

	override val titleText: String
		get() {
			return sender
		}

	override val subtitleText: String
		get() {
			return receivedDate.toString()
		}

	var audioData = shortArrayOf()
	var sampleRate: Int = 0
	val audioBuffers = ArrayList<ShortArray>()

	// region VoiceReceiver
	override fun prepare(stream: IncomingVoiceStream, sampleRate: Int) {
		this.sampleRate = sampleRate
		isRecording = true
	}

	override fun receive(audio: ShortArray, stream: IncomingVoiceStream) {
		if (audio.isNotEmpty()) {
			audioBuffers.add(audio)
		}
	}

	override fun onStreamStopped(stream: IncomingVoiceStream) {
		// Collect all buffers into one
		val audioSize = audioBuffers.sumBy { it -> it.size }
		audioData = ShortArray(audioSize)
		var offset = 0
		audioBuffers.forEach {
			System.arraycopy(it, 0, audioData, offset, it.size)
			offset += it.size
		}
		audioBuffers.clear()
		isRecording = false
	}
	// endregion

	override fun toString() = "<ChannelMessage from ${sender} at ${receivedDate}>"
}

class ChannelMessageText(override val sender: String, override val receivedDate: Date, val message: String) : ChannelMessage {
	override val titleText = message
	override val subtitleText = sender
}