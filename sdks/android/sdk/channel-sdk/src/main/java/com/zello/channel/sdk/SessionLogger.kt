package com.zello.channel.sdk

/**
 * Abstract logger for the events reported by the SDK.
 */
interface SessionLogger {

	/**
	 * Add a regular entry to the log.
	 * @param text Log entry.
	 */
	fun log(text: String)

	/**
	 * Add an error entry to the log.
	 * @param text Log entry.
	 * @param throwable An optional exception object.
	 */
	fun logError(text: String, throwable: Throwable?)

	/**
	 * Add an error entry to the log.
	 *
	 * By default, this method calls [logError] with a null throwable parameter
	 * @param text Log entry.
	 */
	fun logError(text: String) {
		logError(text, null)
	}

	companion object {
		/**
		 * A SessionLogger object that writes SDK log output to the ADB log
		 */
		val ADB: SessionLogger by lazy {
			SessionLoggerAdb("ZelloChannels")
		}

		/**
		 * A SessionLogger object that suppresses all logging from the SDK
		 */
		val NONE: SessionLogger by lazy {
			SessionLoggerNull()
		}
	}

}
