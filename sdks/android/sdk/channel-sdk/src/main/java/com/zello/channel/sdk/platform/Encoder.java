package com.zello.channel.sdk.platform;

/**
 * @exclude Not for public use
 */
public interface Encoder extends AudioSourceEvents {

	void init(AudioSource audioSource);

	byte[] getHeader();

	String getName();

	int getPacketDuration();

	int getFrameDuration();

	int getSampleRate();

	void setListener(EncoderListener listener);

	boolean prepareAsync(int amplifierGain, boolean levelMeter);

	void start();

	void stop();

	int getLevel();

	Object saveConfig();

	int getPacketsPerSecond();

}
