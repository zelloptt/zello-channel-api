package com.zello.channel.sdk

import com.zello.channel.sdk.platform.Utils

/**
 * Base class for voice streams between the Zello Channels SDK and the Zello Channels server
 */
abstract class VoiceStream internal constructor(
		protected val session: Session, protected val events: SessionListener?,
		protected val context: SessionContext, protected var streamId: Int) {

	/**
	 * The name of the channel this stream is connected to
	 */
	open val channel = session.channel

	/**
	 * Time in milliseconds that has passed since the message has started playing or recording.
	 * Roughly matches the amount of data played or recorded, but in the case of an incoming message
	 * may be significantly higher than the amount of data received and played because of network
	 * delays and packet losses.
	 */
	val position: Long
		get() {
			return if (startTimestamp > 0) Utils.getTickCount() - startTimestamp else 0
		}

	/**
	 * The stream's current state
	 */
	var state = VoiceStreamState.STOPPED
		protected set

	internal var createdTime: Long = System.currentTimeMillis()

	internal var startTimestamp: Long = 0

}
