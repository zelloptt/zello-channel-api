package com.zello.channel.sdk.platform;

/**
 * @exclude Not for public use
 */
public interface Decoder extends AudioReceiverEvents {

	void init(AudioReceiver receiver);

	String getName();

	void setListener(com.zello.channel.sdk.platform.DecoderListener listener);

	void setPlayerListener(com.zello.channel.sdk.platform.PlayerListener listener, Object object);

	void setPacketDuration(int count);

	byte[] getMissingPacket();

	void prepareAsync(byte[] header, int amplifierGain, boolean levelMeter);

	void start();

	void stop();

	void pause();

	void resume();

	void setAudioVolume(int value);

	void setGain(int gain);

	void setMuted(boolean muted);

	int getPosition();

	boolean getStarted();

}
