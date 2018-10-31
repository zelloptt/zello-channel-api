package com.zello.channel.sdk.transport

import com.zello.channel.sdk.SessionConnectErrorException
import org.json.JSONObject

/**
 * Minimum command transport interface.
 */
internal interface Transport {

	/**
	 * Asynchronously connect to a server.
	 * Must be called on the main UI thread.
	 * Connection state change callbacks are guaranteed to be called on the main UI thread.
	 *
	 * @param events Callback object used to notify about connection related events
	 * @param address Server address
	 * @param requestTimeoutSec Seconds to wait for requests to the server to succeed
	 * @return True if connection was initiated, a callback will be invoked later to notify about connection status changes
	 *         False if connection was not initiated, no callbacks will be invoked
	 */
	@Throws(SessionConnectErrorException::class)
	fun connect(events: TransportEvents, address: String, requestTimeoutSec: Long)

	/**
	 * Close the open connection.
	 * Must be called on the main UI thread.
	 */
	fun disconnect()

	/**
	 * Asynchronously send a command to the server.
	 * Must be called on the main UI thread.
	 *
	 * @param command Command name
	 * @param json Command body
	 * @param ack Optional callback object that is used to notify about server response
	 */
	fun send(command: String, json: JSONObject, ack: TransportSendAck?)

	/**
	 * Asynchronously send voice stream data to the server.
	 *
	 * @param streamId Stream ID
	 * @param data Audio data
	 */
	fun sendVoiceStreamData(streamId: Int, data: ByteArray)
}
