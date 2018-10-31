package com.zello.channel.sdk.transport

import org.json.JSONObject

/**
 * Command send callback interface.
 * Used to process server response on a command sent to it.
 */
internal interface TransportSendAck {

	/**
	 * Called when a command response is received.
	 * Must be called on the main UI thread.
	 */
	fun onResponse(json: JSONObject)

	/**
	 * Called when a command response can't be received.
	 * Must be called on the main UI thread.
	 */
	fun onError()

}
