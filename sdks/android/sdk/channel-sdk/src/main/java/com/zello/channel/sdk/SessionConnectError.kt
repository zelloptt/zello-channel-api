package com.zello.channel.sdk

import org.json.JSONObject

/**
 * Error object describing why the session was unable to connect to the server or channel
 *
 * @property code code describing the specific reason for the failure to connect
 *
 * @property info stores additional information about the error. Individual code values describe the
 * contents of the associated info maps
 */
class SessionConnectError @JvmOverloads constructor(val code: Code, val info: Map<String, Any>? = null) {

	/**
	 * Error type
	 */
	enum class Code {
		/**
		 * Session was unable to connect for some other reason
		 */
		UNKNOWN {
			override fun toString(): String {
				return "unknown error"
			}
		},

		/**
		 * The address the session tried to connect to does not point to a Zello channels server
		 */
		INVALID_ADDRESS {
			override fun toString(): String {
				return "invalid address"
			}
		},

		/**
		 * The session was unable to open a websockets connection to the server
		 */
		CONNECT_FAILED {
			override fun toString(): String {
				return "connect failed"
			}
		},

		/**
		 * The server send an unexpected message to the client.
		 *
		 * The [info] map contains the [JSONObject] value of the server's response under the key
		 * [infoKeyResponse].
		 */
		BAD_RESPONSE {
			override fun toString(): String {
				return "bad response"
			}
		},

		/**
		 * The connection attempt timed out with no response from the server
		 */
		NO_RESPONSE {
			override fun toString(): String {
				return "no response"
			}
		},

		/**
		 * The authentication token, username, or password were invalid
		 */
		BAD_CREDENTIALS {
			override fun toString(): String {
				return "bad credentials"
			}
		}
	}

	override fun toString(): String {
		return when (code) {
			Code.BAD_RESPONSE -> {
				"$code: ${info?.get(infoKeyResponse)}"
			}

			else -> {
				code.toString()
			}
		}
	}

	companion object {
		@JvmStatic internal val UNKNOWN = SessionConnectError(Code.UNKNOWN)
		@JvmStatic internal val INVALID_ADDRESS = SessionConnectError(Code.INVALID_ADDRESS)
		@JvmStatic internal val CONNECT_FAILED = SessionConnectError(Code.CONNECT_FAILED)
		@JvmStatic internal fun BAD_RESPONSE(response: JSONObject) = SessionConnectError(Code.BAD_RESPONSE, mapOf(Pair(infoKeyResponse, response)))
		@JvmStatic internal val NO_RESPONSE = SessionConnectError(Code.NO_RESPONSE)
		@JvmStatic internal val BAD_CREDENTIALS = SessionConnectError(Code.BAD_CREDENTIALS)

		/**
		 * For [BAD_RESPONSE][SessionConnectError.Code.BAD_RESPONSE] errors, the [info] map stores
		 * the [JSONObject] representation of the server's response under this key
		 */
		const val infoKeyResponse = "response"
	}
}
