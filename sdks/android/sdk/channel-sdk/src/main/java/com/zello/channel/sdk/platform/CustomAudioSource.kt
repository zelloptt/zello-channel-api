package com.zello.channel.sdk.platform

import com.zello.channel.sdk.OutgoingVoiceConfiguration
import com.zello.channel.sdk.OutgoingVoiceStream
import com.zello.channel.sdk.VoiceSink
import com.zello.channel.sdk.VoiceSource

/**
 * This class serves as a "recorder" that takes audio data directly from the user instead of from the
 * device's microphone. It provides a [VoiceSink] that the user can send audio data to, and it then
 * sends this audio data to the channels server.
 */
internal class CustomAudioSource(configuration: OutgoingVoiceConfiguration, private val stream: OutgoingVoiceStream, private val listener: AudioSourceEvents): AudioSource {

	private val source: VoiceSource = configuration.source
	private val sampleRateIn: Int = configuration.sampleRate
	private var sampleRateOut: Int = 0
	private var bufferSampleCount: Int = 0
	private var sink: VoiceSink? = null
	private var bufferedAudioIn = shortArrayOf()
	private var bufferedAudioOut = shortArrayOf()

	// region AudioSource
	override val level = 0

	override fun prepare(sampleRate: Int, bufferSampleCount: Int, levelMeter: Boolean, noiseSuppression: Boolean, useAGC: Boolean): Boolean {
		this.sampleRateOut = sampleRate
		this.bufferSampleCount = bufferSampleCount
		listener.onAudioSourceReady(sampleRate)
		return true
	}

	override fun start() {
		val sink = object: VoiceSink {
			override fun provideAudio(audio: ShortArray) {
				if (sampleRateIn == sampleRateOut) {
					// Just pass through from bufferIn to bufferOut
					bufferedAudioOut = Arrays.join(bufferedAudioOut, audio)
				} else {
					// FIXME: This sample rate converter is low quality
					// If they're not the same sample rate, we need to convert sample rates
					bufferedAudioIn = Arrays.join(bufferedAudioIn, audio)
					val converted: ShortArray = AudioConverter(sampleRateOut).convert(bufferedAudioIn, 0, bufferedAudioIn.size, sampleRateIn)
					bufferedAudioIn = shortArrayOf()
					bufferedAudioOut = Arrays.join(bufferedAudioOut, converted)
				}
				// bufferedAudioIn should be empty now

				// Only send bufferSampleCount worth of samples at a time
				while (bufferedAudioOut.size >= bufferSampleCount) {
					val buffer = Arrays.chunk(bufferedAudioOut, 0, bufferSampleCount)
					bufferedAudioOut = Arrays.chunk(bufferedAudioOut, bufferSampleCount, bufferedAudioOut.size - bufferSampleCount)
					listener.onAudioSourceHasData(buffer)
				}
			}

			override fun stop() {
				if (bufferedAudioOut.isNotEmpty()) {
					listener.onAudioSourceHasData(bufferedAudioOut)
				}
				listener.onAudioSourceEnd()
			}
		}
		source.startProvidingAudio(sink, sampleRateIn, stream)
		this.sink = sink
	}

	override fun stop() {
		val sink = this.sink ?: return
		source.stopProvidingAudio(sink)
		listener.onAudioSourceEnd()
	}
	// endregion

}
