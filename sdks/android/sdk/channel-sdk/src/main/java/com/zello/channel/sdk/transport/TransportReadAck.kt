package com.zello.channel.sdk.transport

import org.json.JSONObject

/**
 * Command read callback interface.
 * Used to send a command response to the server.
 */
internal interface TransportReadAck {

	/**
	 * Send a command response to the server.
	 * Must be called on the main UI thread.
	 */
	fun onResponse(json: JSONObject)

}
