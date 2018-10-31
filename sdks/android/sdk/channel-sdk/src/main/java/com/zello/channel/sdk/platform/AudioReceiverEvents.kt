package com.zello.channel.sdk.platform

internal interface AudioReceiverEvents {

	fun onGet8BitData(): ByteArray?

	fun onGet16BitData(): ShortArray?

	fun onPlaybackStart()

	fun onPlaybackEnd()

	fun onPlaybackInitError()

}
