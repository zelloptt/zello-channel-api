package com.zello.channel.sdk

/**
 * Errors that are encountered by outgoing streams
 */
enum class OutgoingVoiceStreamError {
	/**
	 * Some other error occurred
	 */
	UNKNOWN,

	/**
	 * The server sent an unexpected response
	 */
	BAD_RESPONSE,

	/**
	 * The connection to the server timed out
	 */
	NO_RESPONSE,

	/**
	 * Session error
	 */
	FAILED_TO_START,

	/**
	 * Session error
	 */
	BUSY,

	/**
	 * The current account is not permitted to speak on the channel
	 */
	LISTEN_ONLY,

	/**
	 * An error occurred in the audio layer
	 */
	DEVICE_PROBLEM,

	/**
	 * The app does not have permission to access the microphone
	 */
	NO_MIC_PERMISSION
}
