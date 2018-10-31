package com.zello.channel.sdk

/**
 * A no-op logger implementation.
 */
class SessionLoggerNull : SessionLogger {

	/**
	 * SessionLoggerNull doesn't log anything
	 * @param text Log entry. Ignored.
	 */
	override fun log(text: String) {
	}

	/**
	 * SessionLoggerNull doesn't log anything
	 * @param text Log entry. Ignored.
	 * @param throwable An optional exception object. Ignored.
	 */
	override fun logError(text: String, throwable: Throwable?) {
	}

}
