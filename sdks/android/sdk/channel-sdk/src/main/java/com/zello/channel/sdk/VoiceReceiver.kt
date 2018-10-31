package com.zello.channel.sdk

/**
 * Implement VoiceReceiver to provide custom handling for incoming voice data.
 *
 * [prepare] will be called on your voice receiver when the incoming stream has finished opening.
 * Then [receive] will be called repeatedly as new audio comes in from the channels server. When the
 * stream is closing, [onStreamStopped] will be called.
 */
interface VoiceReceiver {

	/**
	 * prepare is called when an incoming stream finishes opening.
	 *
	 * @param stream the stream that has just opened
	 *
	 * @param sampleRate the sample rate of the audio that will be sent to the [receive] method
	 */
	fun prepare(stream: IncomingVoiceStream, sampleRate: Int)

	/**
	 * This method is called periodically as new data comes in from the channels server.
	 *
	 * @param audio a buffer of audio data in signed linear PCM format at the sampling rate passed
	 * to the [prepare] method
	 *
	 * @param stream the stream that the data is coming from
	 */
	fun receive(audio: ShortArray, stream: IncomingVoiceStream)

	/**
	 * This method is called when the incoming stream has ended.
	 *
	 * @param stream the stream that has closed
	 */
	fun onStreamStopped(stream: IncomingVoiceStream)

}
