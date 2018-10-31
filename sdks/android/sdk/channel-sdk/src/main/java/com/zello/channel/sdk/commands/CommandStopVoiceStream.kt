package com.zello.channel.sdk.commands

import com.zello.channel.sdk.transport.Transport
import org.json.JSONObject

internal class CommandStopVoiceStream(transport: Transport, private val streamId: Int) : Command(transport, false) {

	override fun read(json: JSONObject) {
	}

	override fun error() {
	}

	override fun getCommandName(): String {
		return Command.commandStopStream
	}

	override fun getCommandBody(): JSONObject {
		val json = JSONObject()
		json.put(Command.keyStreamId, streamId)
		return json
	}

}
