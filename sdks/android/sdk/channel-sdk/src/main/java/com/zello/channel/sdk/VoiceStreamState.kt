package com.zello.channel.sdk

/**
 * States the voice stream can be in
 */
enum class VoiceStreamState {
	/**
	 * Waiting for the server or audio layer to be ready
	 */
	STARTING,

	/**
	 * Running -- playing or recording
	 */
	ACTIVE,

	/**
	 * Not running
	 */
	STOPPED,

	/**
	 * Not running due to an error
	 */
	ERROR
}
