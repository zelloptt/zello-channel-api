package com.zello.channel.sdk

/**
 * Return an IncomingVoiceConfiguration object from [onIncomingVoiceWillStart][SessionListener.onIncomingVoiceWillStart]
 * to provide custom handling of the incoming audio data.
 *
 * @property receiver Custom voice receiver object. Its methods will be called when new voice data
 * arrives from the Zello Channels system.
 *
 * @property playThroughSpeaker Whether the incoming voice stream should be played through the
 * speaker as well as sent to the custom voice receiver object.
 */
class IncomingVoiceConfiguration(val receiver: VoiceReceiver, val playThroughSpeaker: Boolean)
