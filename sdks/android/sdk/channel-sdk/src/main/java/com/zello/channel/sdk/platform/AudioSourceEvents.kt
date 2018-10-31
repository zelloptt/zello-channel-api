package com.zello.channel.sdk.platform

internal interface AudioSourceEvents {

	fun onAudioSourceHasData(data: ShortArray)

	fun onAudioSourceReady(sampleRate: Int)

	fun onAudioSourceStart()

	fun onAudioSourceEnd()

	fun onAudioSourceError()

	fun onAudioSourceInitError()

	fun onRecordPermissionError()

}
