package com.zello.channel.sdk.transport

import android.os.Handler
import com.zello.channel.sdk.SessionConnectError
import com.zello.channel.sdk.SessionConnectErrorException
import com.zello.channel.sdk.commands.Command
import com.zello.channel.sdk.platform.Utils
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import okio.ByteString
import org.json.JSONObject
import java.lang.ref.WeakReference
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.util.concurrent.TimeUnit

internal class TransportWebSockets : Transport, WebSocketListener() {

	private var events: TransportEvents? = null
	private var handler: Handler? = null
	private var socket: WebSocket? = null
	private var client: OkHttpClient? = null
	private var sequence: Long = 0
	private val sentCommands = ArrayList<SentCommand>()
	private var sentCommandsTimer: Timer? = null
	private var connected = false
	private var replyTimeoutMs: Long = 30000

	@Throws(SessionConnectErrorException::class)
	override fun connect(events: TransportEvents, address: String, requestTimeoutSec: Long) {
		replyTimeoutMs = requestTimeoutSec * 1000
		if (socket != null) {
			throw SessionConnectErrorException(SessionConnectError.UNKNOWN)
		}
		this.events = events
		handler = Handler(Handler.Callback { msg ->
			when (msg.what) {
				SOCKET_EVENT -> {
					(msg.obj as TransportWebSockets.SocketEvent).run(this)
					true
				}
				else ->
					false
			}
		})
		val socket: WebSocket
		val client: OkHttpClient
		try {
			client = OkHttpClient.Builder().connectTimeout(requestTimeoutSec, TimeUnit.SECONDS).writeTimeout(requestTimeoutSec, TimeUnit.SECONDS).readTimeout(requestTimeoutSec, TimeUnit.SECONDS).pingInterval(WS_PING_INTERVAL_SEC, TimeUnit.SECONDS).build()
			val request = Request.Builder().url(address).build()
			socket = client.newWebSocket(request, this)
		} catch (e: IllegalStateException) {
			throw SessionConnectErrorException(SessionConnectError.INVALID_ADDRESS)
		} catch (e: IllegalArgumentException) {
			throw SessionConnectErrorException(SessionConnectError.INVALID_ADDRESS)
		} catch (e: Throwable) {
			throw SessionConnectErrorException(SessionConnectError.CONNECT_FAILED)
		}
		this.socket = socket
		this.client = client
	}

	override fun disconnect() {
		try {
			socket?.close(CODE_NORMAL, null)
		} catch (e: Throwable) {
		}
		socket = null
		client?.dispatcher()?.executorService()?.shutdown()
		client = null
		synchronized(sentCommands) {
			sentCommands.clear()
		}
		stopSentCommandsTimer()
		sentCommandsTimer = null
		connected = false
		sequence = 0
		events = null
	}

	override fun send(command: String, json: JSONObject, ack: TransportSendAck?) {
		json.put(Command.keyCommand, command)
		if (ack != null) {
			val seq = sequence++
			json.put(Command.keySeq, seq)
			if (sentCommands.isEmpty()) {
				startSentCommandsTimer()
			}
			sentCommands.add(SentCommand(seq, replyTimeoutMs, ack))
		}

		socket?.send(json.toString())
	}

	override fun sendVoiceStreamData(streamId: Int, data: ByteArray) {
		val buffer = ByteArray(9 + data.size)
		val hton = ByteBuffer.wrap(buffer, 0, 9).order(ByteOrder.BIG_ENDIAN)
		hton.put(PACKET_TYPE_STREAM)
		hton.putInt(streamId)
		hton.putInt(0)
		System.arraycopy(data, 0, buffer, 9, data.size)
		// Sadly, there's no way to pass a byte[] to a new or existing okio ByteString without copying the data
		socket?.send(ByteString.of(buffer, 0, buffer.size))
	}

	/**
	 * Invoked when a web socket has been accepted by the remote peers.
	 */
	override fun onOpen(webSocket: WebSocket?, response: Response?) {
		val h = handler
		h?.sendMessage(h.obtainMessage(SOCKET_EVENT, object : SocketEvent(socket) {
			override fun process(transport: TransportWebSockets) {
				connected = true
				events?.onConnectSucceeded()
			}
		}))
	}

	/**
	 * Invoked when a text (type 0x1) message has been received.
	 */
	override fun onMessage(webSocket: WebSocket?, text: String?) {
		if (text == null) return
		var json: JSONObject? = null
		try {
			json = JSONObject(text)
		} catch (e: Throwable) {
		}
		if (json == null) return
		val h = handler
		h?.sendMessage(h.obtainMessage(SOCKET_EVENT, object : SocketEvent(socket) {
			override fun process(transport: TransportWebSockets) {
				processIncomingMessage(json)
			}
		}))
	}

	/**
	 * Invoked when a binary (type 0x2) message has been received.
	 */
	override fun onMessage(webSocket: WebSocket?, bytes: ByteString?) {
		if (bytes == null || bytes.size() <= 1) return
		val h = handler
		h?.sendMessage(h.obtainMessage(SOCKET_EVENT, object : SocketEvent(socket) {
			override fun process(transport: TransportWebSockets) {
				processIncomingMessage(bytes)
			}
		}))
	}

	/**
	 *  Invoked when the peer has indicated that no more incoming messages will be transmitted.
	 */
	override fun onClosing(webSocket: WebSocket?, code: Int, reason: String?) {
		handleServerDisconnect()
	}

	/**
	 * Invoked when both peers have indicated that no more messages will be transmitted.
	 */
	override fun onClosed(webSocket: WebSocket?, code: Int, reason: String?) {
	}

	/**
	 * Invoked when a web socket has been closed due to an error.
	 */
	override fun onFailure(webSocket: WebSocket?, t: Throwable?, response: Response?) {
		handleServerDisconnect()
	}

	private fun handleServerDisconnect() {
		val h = handler
		h?.sendMessage(h.obtainMessage(SOCKET_EVENT, object : SocketEvent(socket) {
			override fun process(transport: TransportWebSockets) {
				if (connected) {
					events?.onDisconnected()
				} else {
					events?.onConnectFailed()
				}
				disconnect()
			}
		}))
	}

	private fun processIncomingMessage(json: JSONObject) {
		val command: String? = json.optString(Command.keyCommand, null)
		val seq: Long = json.optLong(Command.keySeq, -1)
		if (command == null) {
			val sentCommand = findAndRemoveSentCommand(seq) ?: return
			if (sentCommands.isEmpty()) {
				stopSentCommandsTimer()
			}
			sentCommand.onResponse(json)
		} else {
			var ack: TransportReadAck? = null
			if (seq >= 0) {
				ack = object : TransportReadAck {
					override fun onResponse(json: JSONObject) {
						json.put(Command.keySeq, seq)
						socket?.send(json.toString())
					}
				}
			}
			events?.onIncomingCommand(command, json, ack)
		}
	}

	private fun processIncomingMessage(bytes: ByteString) {
		val type = bytes.getByte(0)
		when (type) {
			PACKET_TYPE_STREAM -> if (bytes.size() > 9) {
				val data = bytes.toByteArray()
				val ntoh = ByteBuffer.wrap(data, 1, 8).order(ByteOrder.BIG_ENDIAN)
				val streamId = ntoh.int
				val packetId = ntoh.int
				events?.onIncomingVoiceStreamData(streamId, packetId, data.copyOfRange(9, data.size))
			}
		}
	}

	// Returns true if there are commands remaining
	private fun checkSentCommands(): Boolean {
		var i = 0
		while (i < sentCommands.size) {
			val sentCommand = sentCommands[i]
			if (sentCommand.getReplyTimedOut()) {
				sentCommand.onError()
				sentCommands.remove(sentCommand) // Avoid removeAt in case there's a race and it's already been removed
			} else {
				++i
			}
		}
		return !sentCommands.isEmpty()
	}

	private fun findAndRemoveSentCommand(seq: Long): SentCommand? {
		var i = 0
		while (i < sentCommands.size) {
			val sentCommand = sentCommands[i]
			if (sentCommand.seq == seq) {
				sentCommands.removeAt(i)
				return sentCommand
			} else {
				++i
			}
		}
		return null
	}

	private fun startSentCommandsTimer() {
		var timer = sentCommandsTimer
		if (timer == null) {
			timer = Timer(this)
			sentCommandsTimer = timer
		}
		handler?.postDelayed(timer, TIMER_TIMEOUT_MS)
	}

	private fun stopSentCommandsTimer() {
		val timer = sentCommandsTimer
		if (timer != null) {
			handler?.removeCallbacks(timer)
		}
	}

	/**
	 * Constants
	 */
	companion object {
		private const val CODE_NORMAL = 1000
		private const val SOCKET_EVENT = 1
		private const val TIMER_TIMEOUT_MS = 1000L

		private const val WS_PING_INTERVAL_SEC = 230L

		private const val PACKET_TYPE_STREAM: Byte = 1
	}

	/**
	 * A class to move the processing of network events in to the UI thread
	 */
	private abstract class SocketEvent(private val socket: WebSocket?) {

		abstract fun process(transport: TransportWebSockets)

		fun run(transport: TransportWebSockets) {
			if (socket != transport.socket) return
			process(transport)
		}

	}

	/**
	 * A class to track outgoing commands
	 */
	private class SentCommand(val seq: Long, private val replyTimeoutMs: Long, private val ack: TransportSendAck) {

		private val startTime = Utils.getTickCount()

		fun getReplyTimedOut(): Boolean {
			return Utils.getTickCount() - startTime >= replyTimeoutMs
		}

		fun onResponse(json: JSONObject) {
			ack.onResponse(json)
		}

		fun onError() {
			ack.onError()
		}
	}

	/**
	 * A class implementing timer functionality that tracks timed out outgoing commands
	 */
	private class Timer(transport: TransportWebSockets) : Runnable {

		private val transport = WeakReference<TransportWebSockets>(transport)

		override fun run() {
			val transport: TransportWebSockets = transport.get() ?: return
			// Keep the timer active for as long as there are incomplete commands
			if (transport.checkSentCommands()) {
				transport.handler?.postDelayed(this, TIMER_TIMEOUT_MS)
			}
		}

	}

}
