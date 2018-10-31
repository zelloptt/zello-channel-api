package com.zello.channel.sdk

/**
 * Describes an incoming voice stream. The stream has not yet opened, but you can use this information
 * to determine whether to provide a custom voice receiver or let the Zello channels SDK play the
 * voice through the device speaker by default.
 *
 * @property sender The username of the sender
 *
 * @property channel The name of the channel that the stream is originating from
 */
class IncomingVoiceStreamInfo(val sender: String, val channel: String)
