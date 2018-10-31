package com.zello.channel.sdk.platform

internal interface AudioSource {

	val level: Int

	fun prepare(sampleRate: Int, bufferSampleCount: Int, levelMeter: Boolean, noiseSuppression: Boolean, useAGC: Boolean): Boolean

	fun start()

	fun stop()

}
