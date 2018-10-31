package com.zello.channel.sdk

/**
 * Events callback interface.
 * Implemented by the clients of the SDK.
 */
interface SessionListener {

	/**
	 * Called after the Session has started connecting to the Zello Channels server, but before a
	 * connection has been established
	 *
	 * @param session the session that has started connecting
	 */
	fun onConnectStarted(session: Session)

	/**
	 * Called if an error is encountered before the session has connected to the channel
	 *
	 * @param session the session that failed to connect
	 * @param error object describing why the session failed to connect
	 */
	fun onConnectFailed(session: Session, error: SessionConnectError)

	/**
	 * Called when the session finishes connecting to the server and channel. When onConnectSucceeded
	 * is called, the connection to the server is fully established. You can now call [startVoiceMessage][Session.startVoiceMessage]
	 * to start speaking to the channel, and will receive incoming messages when other users speak
	 * to the channel.
	 *
	 * onConnectSucceeded *is* called after an automatic reconnect, so be aware that your listener
	 * may see onConnectSucceeded called multiple times without [onDisconnected] being called. See
	 * [onSessionWillReconnect] for more about automatic reconnection.
	 */
	fun onConnectSucceeded(session: Session)

	/**
	 * Called when the session finishes disconnecting from the server. If the session is disconnected
	 * due to a network change or other unexpected event, this method is *not* called, and [onSessionWillReconnect]
	 * is called instead. In that case, the session automatically attempts to reconnect. You can
	 * prevent automatic reconnect attempts by implementing [onSessionWillReconnect] and returning
	 * false.
	 */
	fun onDisconnected(session: Session)

	/**
	 * Called when the session has become unexpectedly disconnected. If the SessionListener returns
	 * true, the session will attempt to reconnect to the Zello Channels server.
	 *
	 * @param session the session that has disconnected
	 * @param reason the reason the session was disconnected
	 * @return true to allow the session to attempt to reconnect to the Zello Channels server, and
	 * false to stay disconnected
	 */
	fun onSessionWillReconnect(session: Session, reason: ReconnectReason): Boolean = true

	/**
	 * Called if an outgoing stream closes with an error
	 *
	 * @param session the session containing the stream
	 * @param stream the stream that has just closed
	 * @param error object describing the error that occurred
	 */
	fun onOutgoingVoiceError(session: Session, stream: OutgoingVoiceStream, error: OutgoingVoiceStreamError)

	/**
	 * Called whenever the state of an outgoing stream changes
	 *
	 * @param session the session containing the stream
	 * @param stream the stream whose state has changed. Its [state][OutgoingVoiceStream.state] property reflects
	 * the new state of the stream.
	 */
	fun onOutgoingVoiceStateChanged(session: Session, stream: OutgoingVoiceStream)

	/**
	 * Called periodically while transmitting audio to report the progress of the stream. This
	 * method is called frequently, so avoid doing heavy processing work in it. The position reported
	 * is in media time from the beginning of the stream, not wall time.
	 *
	 * @param session the session containing the stream that is reporting progress
	 * @param stream the stream that is reporting its progress
	 * @param positionMs time in milliseconds of voice since the stream started. This may not match
	 * wall time, especially if the stream has a custom voice source that is providing voice data
	 * from a file or another source that does not run in real-time.
	 */
	fun onOutgoingVoiceProgress(session: Session, stream: OutgoingVoiceStream, positionMs: Int)

	/**
	 * Implement this method to perform custom handling of incoming voice data. If this method is
	 * implemented by your SessionListener, you can override the Zello Channels SDK's default
	 * processing of incoming voice streams.
	 *
	 * This method is called when another user begins speaking on the channel. The streamInfo object
	 * describes the channel and the user who has begun speaking. Your implementation can return
	 * null to tell the Zello Channels SDK to play the incoming stream through the device speaker.
	 * If you want to perform different handling of the audio, you can return an [IncomingVoiceConfiguration],
	 * with a reference to a custom [VoiceReceiver].
	 *
	 * @param session the session that is about to open a new incoming voice stream
	 * @param streamInfo an object describing the voice source. You can use this information to
	 * determine whether to override the default audio handling.
	 * @return a configuration object specifying a custom voice receiver to handle incoming voice
	 * data. If you return null instead of a configuration object, the stream will play through the
	 * current audio output route as normal.
	 */
	fun onIncomingVoiceWillStart(session: Session, streamInfo: IncomingVoiceStreamInfo): IncomingVoiceConfiguration? = null

	/**
	 * When another user begins speaking in the channel, this method is called to provide your app
	 * with the new incoming voice stream.
	 *
	 * @param session the session containing the new stream
	 * @param stream the new stream
	 */
	fun onIncomingVoiceStarted(session: Session, stream: IncomingVoiceStream)

	/**
	 * This method is called when a user that was speaking on the channel stops speaking, and the
	 * stream containing their voice data closes.
	 *
	 * @param session the session containing the stream that just stopped
	 * @param stream the stream that just stopped
	 */
	fun onIncomingVoiceStopped(session: Session, stream: IncomingVoiceStream)

	/**
	 * This method is called periodically while receiving audio. This method is called frequently,
	 * so avoid doing heaving processing work in it. positionMs is in media time from the beginning
	 * of the stream, not in wall time.
	 *
	 * @param session the session containing the stream that is reporting progress
	 * @param stream the stream that is reporting its progress
	 * @param positionMs time in milliseconds since the stream started. This may not match wall time,
	 * especially if the stream has a custom voice receiver that is not passing audio through to the
	 * device speaker.
	 */
	fun onIncomingVoiceProgress(session: Session, stream: IncomingVoiceStream, positionMs: Int)

}
