package com.zello.channel.sdk

import com.zello.channel.sdk.transport.Transport

/**
 * Outgoing and incoming message manager.
 * Only one outgoing message a time is allowed.
 * Normally there can only be a single incoming message, but it's possible that
 * there are two or even more incoming messages co-existing at the same time due to network
 * lag and/or playback optimizations. When that happens, several messages play simultaneously.
 */
internal class VoiceManager(private val context: SessionContext) {

	// Current outgoing voice message, if it exists
	var activeOutgoing: OutgoingVoiceStream? = null
		private set
	// The most recent incoming voice message, if it exists
	var activeIncoming: IncomingVoiceStream? = null
		private set

	// All active incoming message
	private val incoming: HashMap<Int, IncomingVoiceStream> = HashMap()

	// I may want to just store a map containing both incoming and outgoing streams and have this
	// return the values instead
	val activeStreams: Collection<VoiceStream>
		get() {
			val s = HashSet<VoiceStream>()
			val outgoing = activeOutgoing
			if (outgoing != null) {
				s.add(outgoing)
			}
			val incoming = incoming.values
			for (stream in incoming) {
				s.add(stream)
			}
			return s
		}

	/**
	 * Start an outgoing voice message.
	 * Must be called on the main UI thread.
	 */
	internal fun startVoiceOut(session: Session, events: SessionListener?, transport: Transport, voiceConfiguration: OutgoingVoiceConfiguration? = null): OutgoingVoiceStream? {
		if (activeOutgoing != null) return null
		val out = object : OutgoingVoiceStream(session, events, context, transport, voiceConfiguration) {
			override fun onStateChanged(state: VoiceStreamState) {
				if (activeOutgoing != this) return
				events?.onOutgoingVoiceStateChanged(session, this)
			}

			override fun onError(error: OutgoingVoiceStreamError) {
				if (activeOutgoing != this) return
				events?.onOutgoingVoiceError(session, this, error)
			}

			override fun onStopped() {
				if (activeOutgoing == this) {
					activeOutgoing = null
				}
			}
		}
		activeOutgoing = out
		out.start()
		return out
	}

	/**
	 * Start an incoming message.
	 * Must be called on the main UI thread.
	 */
	internal fun startVoiceIn(session: Session, events: SessionListener?, streamId: Int, codec: String?, header: ByteArray?, packetDuration: Int, channel: String, sender: String, receiverConfig: IncomingVoiceConfiguration?): Boolean {
		val existing = incoming[streamId]
		if (existing != null) return false
		val message = object : IncomingVoiceStream(session, events, context, streamId, receiverConfig) {
			override fun onDone() {
				// Always called on the UI thread
				incoming.remove(streamId)
				updateLastIncomingVoice()
				stop()
			}

			override fun onStart() {
				if (!incoming.containsKey(streamId)) return
				activeIncoming = this
			}
		}
		if (!message.start(codec, header, packetDuration, channel, sender)) return false
		incoming[streamId] = message
		return true
	}

	/**
	 * Find an incoming message.
	 * Must be called on the main UI thread.
	 */
	internal fun findIncomingVoice(streamId: Int): IncomingVoiceStream? {
		return incoming[streamId]
	}

	/**
	 * Stop all messages.
	 * Must be called on the main UI thread.
	 */
	internal fun reset() {
		activeOutgoing?.stop()
		activeOutgoing = null
		for (entry in incoming) {
			entry.value.stop()
		}
		incoming.clear()
		activeIncoming = null
	}

	private fun updateLastIncomingVoice() {
		var latest: IncomingVoiceStream? = null
		for (entry in incoming) {
			if (latest == null || latest.startTimestamp > entry.value.startTimestamp) {
				latest = entry.value
			}
		}
		activeIncoming = latest
	}

}
