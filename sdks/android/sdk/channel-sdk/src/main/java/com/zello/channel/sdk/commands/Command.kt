package com.zello.channel.sdk.commands

import com.zello.channel.sdk.transport.Transport
import com.zello.channel.sdk.transport.TransportSendAck
import org.json.JSONObject

internal abstract class Command protected constructor(transport: Transport, private val requiresResponse: Boolean) {

	private var transport: Transport? = transport

	var succeeded: Boolean = false
		private set
	var error: String? = null
		private set

	abstract fun getCommandName(): String
	abstract fun getCommandBody(): JSONObject
	abstract fun read(json: JSONObject)
	abstract fun error()

	open fun send(): Boolean {
		val transport = transport ?: return false
		val commandName = getCommandName()
		val commandBody = getCommandBody()
		var ack: TransportSendAck? = null
		if (requiresResponse) {
			ack = object : TransportSendAck {
				// Called on the UI thread
				override fun onResponse(json: JSONObject) {
					read(json)
				}

				override fun onError() {
					error()
				}
			}
		}
		transport.send(commandName, commandBody, ack)
		return true
	}

	open fun close() {
		transport = null
		error = null
	}

	protected fun parseSimpleResponse(json: JSONObject) {
		val success = json.optBoolean(keySuccess, false)
		if (success) {
			succeeded = true
		} else {
			error = json.optString(keyError, null)
		}
	}

	/**
	 * Protocol constants
	 */
	companion object {
		val keyCommand = "command"
		val keySeq = "seq"
		val keySuccess = "success"
		val keyType = "type"
		val keyCodec = "codec"
		val keyCodecHeader = "codec_header"
		val keyPacketDuration = "packet_duration"
		val keyStreamId = "stream_id"
		// TODO: Remove streamId key after server is fixed
		// There's a server bug where the server sends streamId instead of stream_id in on_stream_stop events
		val keyStreamIdAlt = "streamId"
		val keyError = "error"
		val keyAuthToken = "auth_token"
		val keyRefreshToken = "refresh_token"
		val keyUsername = "username"
		val keyPassword = "password"
		val keyChannel = "channel"
		val keyFrom = "from"

		val valAudio = "audio"

		val errorUnknownCommand = "unknown command"
		val errorInternalServerError = "internal server error"
		val errorInvalidJson = "invalid json"
		val errorInvalidRequest = "invalid request"
		val errorNotAuthorized = "not authorized"
		val errorNotLoggedIn = "not logged in"
		val errorNotEnoughParams = "not enough params"
		val errorServerClosedConnection = "server closed connection"
		val errorChannelNotReady = "channel not ready"
		val errorListenOnlyConnection = "listen only connection"
		val errorFailedToStartStream = "failed to start stream"
		val errorFailedToStopStream = "failed to stop stream"
		val errorFailedToSendData = "failed to send data"
		val errorInvalidAudioPacket = "invalid audio packet"

		val valInvalidUsername = "invalid username"
		val valInvalidPassword = "invalid password"
		val valBusy = "channel busy"

		val commandLogon = "logon"
		val commandStartStream = "start_stream"
		val commandStopStream = "stop_stream"

		val eventOnChannelStatus = "on_channel_status"
		val eventOnStreamStart = "on_stream_start"
		val eventOnStreamStop = "on_stream_stop"
		val eventOnError = "on_error"
	}

}
