package com.zello.channel.sdk

/**
 * The VoiceSink allows you to send audio from non-microphone sources to the Zello channel. You get
 * access to a VoiceSink by calling [startVoiceMessage][Session.startVoiceMessage] and passing a
 * [OutgoingVoiceConfiguration] object specifying your [VoiceSource]. Once the stream to the channels
 * server has finished opening, [startProvidingAudio][VoiceSource.startProvidingAudio] will be called
 * on your VoiceSource. Use the provided VoiceSink to send audio data to the channels server.
 *
 * Once you have a VoiceSink, call [provideAudio] to send audio to the channels server. When you
 * have finished sending your message, call [stop] to close the outgoing voice stream and invalidate
 * the VoiceSink object. After calling [stop], do not call any further methods on the VoiceSink.
 */
interface VoiceSink {

	/**
	 * Call this method to send audio over the outgoing stream.
	 *
	 * @param audio a buffer of audio data, in signed linear PCM format, at the sample rate specified
	 * in the call to [startProvidingAudio][VoiceSource.startProvidingAudio].
	 */
	fun provideAudio(audio: ShortArray)

	/**
	 * Call this to close the stream and invalidate this VoiceSink object
	 */
	fun stop()

}
