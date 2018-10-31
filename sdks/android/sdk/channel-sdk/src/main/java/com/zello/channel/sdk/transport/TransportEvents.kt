package com.zello.channel.sdk.transport

import org.json.JSONObject

/**
 * Command transport events.
 */
internal interface TransportEvents {

	/**
	 * Connection to the server has been successfully established.
	 */
	fun onConnectSucceeded()

	/**
	 * The server has ended the connection.
	 */
	fun onDisconnected()

	/**
	 * Connection to the server has failed.
	 */
	fun onConnectFailed()

	/**
	 * There's an incoming command.
	 *
	 * @param command Command name
	 * @param json Command body
	 * @param ack Non-null when the server expects a response
	 */
	fun onIncomingCommand(command: String, json: JSONObject, ack: TransportReadAck?)

	/**
	 * There's an incoming voice stream binary data from the server.
	 *
	 * @param streamId Stream ID
	 * @param packetId Packet ID
	 * @param data Data
	 */
	fun onIncomingVoiceStreamData(streamId: Int, packetId: Int, data: ByteArray)

}
