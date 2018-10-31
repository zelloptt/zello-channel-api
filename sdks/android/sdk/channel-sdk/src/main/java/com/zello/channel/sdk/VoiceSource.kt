package com.zello.channel.sdk

/**
 * Implement VoiceSource on an object that provides audio data to the Zello Channels server
 */
interface VoiceSource {
	/**
	 * This method is called when an outgoing stream is ready to receive voice data
	 *
	 * @param sink the object that you pass voice data to when you have data ready to send
	 * @param sampleRate the audio sample rate that the stream expects
	 * @param stream the stream that this voice source is sending audio to
	 */
	fun startProvidingAudio(sink: VoiceSink, sampleRate: Int, stream: OutgoingVoiceStream)

	/**
	 * Called when an outgoing stream can no longer receive audio. When a voice stream closes, this
	 * method is called to inform your voice source that the voice sink it has been sending audio to
	 * is no longer valid. You should stop calling methods on sink and release related resources.
	 *
	 * @param sink the voice sink object passed to [startProvidingAudio] when the containing stream
	 * started
	 */
	fun stopProvidingAudio(sink: VoiceSink)
}
