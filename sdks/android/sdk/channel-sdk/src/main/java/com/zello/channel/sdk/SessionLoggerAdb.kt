package com.zello.channel.sdk

import com.zello.channel.sdk.platform.Utils

/**
 * A simple logger implementation that writes the messages to the ADB log.
 */
class SessionLoggerAdb(val tag: String) : SessionLogger {

	/**
	 * Add a regular entry to the log.
	 * @param text Log entry.
	 */
	override fun log(text: String) {
		Utils.log(tag, text)
	}

	/**
	 * Add an error entry to the log.
	 * @param text Log entry.
	 * @param throwable An optional exception object.
	 */
	override fun logError(text: String, throwable: Throwable?) {
		Utils.logError(tag, text, throwable)
	}

}
