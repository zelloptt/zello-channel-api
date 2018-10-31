package com.zello.channel.sdk

/**
 * Describes the state of the Zello channels client's connection to the Zello channels server
 */
enum class SessionState {
	/**
	 * The session has encountered an error and is not connected to the server
 	 */
	ERROR,

	/**
	 * The session is not connected to the server
 	 */
	DISCONNECTED,

	/**
	 * The session is in the process of connecting to the server or channel
 	 */
	CONNECTING,

	/**
	 * The session has successfully connected to the server and channel
	 */
	CONNECTED
}
