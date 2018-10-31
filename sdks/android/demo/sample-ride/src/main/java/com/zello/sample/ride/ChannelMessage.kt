package com.zello.sample.ride

import android.util.Log
import com.zello.channel.sdk.IncomingVoiceStream
import com.zello.channel.sdk.VoiceReceiver
import java.util.Date

class ChannelMessage(val sender: String, val receivedDate: Date) : VoiceReceiver {

	interface Events {
		fun onRecordingChanged(message: ChannelMessage, isRecording: Boolean)
	}
	var listener: Events? = null
		set(value) {
			field = value
			value?.onRecordingChanged(this, isRecording)
		}

	var isRecording = false
		private set(value) {
			if (field != value) {
				field = value
				listener?.onRecordingChanged(this, value)
			}
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

	companion object {
		private val TAG = "ZCC->CM"
	}
}
