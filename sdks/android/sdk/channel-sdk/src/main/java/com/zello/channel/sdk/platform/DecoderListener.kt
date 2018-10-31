package com.zello.channel.sdk.platform

internal interface DecoderListener {

	/**
	 * onDecoderData returns data to audio player.
	 * The player will call this method every time it needs more data to play
	 * Should block if more data is expected.
	 */
	fun onDecoderData(): ByteArray?

	fun onDecoderReady()

	fun onDecoderStart()

	fun onDecoderStop()

	fun onDecoderError()

}
