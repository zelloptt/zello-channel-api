package com.zello.channel.sdk.platform

internal interface AudioReceiver {

	fun prepare(channels: Int, sampleRate: Int, bitsPerSample: Int, packetDuration: Int): Boolean

	fun start()

	fun stop()

	fun pause()

	fun resume()

	fun setStreamVolume(percent: Int)

	fun setDeviceVolume(percent: Int)

	fun setMuted(muted: Boolean)

	/**
	 * Returns the playback position in milliseconds from the start of the audio stream
	 */
	fun getPosition(): Int

	fun setPlayerListener(listener: PlayerListener?, listenerContext: Any?)

	fun reset()

	fun isPlaying(): Boolean

}
