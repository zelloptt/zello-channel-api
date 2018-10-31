package com.zello.channel.sdk.platform

import android.util.Base64

internal class Utils {

	companion object {

		fun emptyIfNull(s: String?): String {
			return s ?: ""
		}

		fun getTickCount(): Long {
			return System.nanoTime() / 1000000
		}

		fun log(tag: String, message: String) {
			log(tag, "i", message)
		}

		fun logError(tag: String, message: String, throwable: Throwable?) {
			if (throwable == null) {
				log(tag, "e", message)
			} else {
				log(tag, "e", message + " (" + throwable.javaClass.name + "; " + throwable.message + ")")
			}
		}

		private fun log(tag: String, type: String, message: String) {
			android.util.Log.v(tag, "[$type] $message")
		}

		fun encodeBase64(data: ByteArray?): String? {
			var out: String? = null
			if (data != null) {
				try {
					out = Base64.encodeToString(data, Base64.DEFAULT)
				} catch (ignore: Throwable) {
				}

			}
			return if (out == null) "" else out
		}

		fun decodeBase64(data: String?): ByteArray? {
			var out: ByteArray? = null
			if (data == null || data.isEmpty()) return null
			try {
				out = Base64.decode(data, Base64.DEFAULT)
			} catch (ignore: Throwable) {
			}
			return if (out != null && out.isEmpty()) null else out
		}

	}

}
