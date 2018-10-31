package com.zello.channel.sdk.platform;

import android.content.Context;

import com.zello.channel.sdk.SessionLogger;

@SuppressWarnings({"WeakerAccess", "unused"})
abstract class EncoderBase implements Encoder {

	protected Context _context;
	protected int _id;
	protected EncoderListener _listener;
	protected int _amplifierGain;
	protected double _amplifierGainFactor = 1.0;
	protected AudioSource _audioSource;
	protected int _framesPerPacket;
	protected int _sampleRate;
	protected int _bitrate; // Only used when > 0
	protected boolean _enableNoiseSuppression;
	protected boolean _enableAGC;
	protected SessionLogger _logger;

	protected abstract byte[] encode(int id, short[] data, int amplifierGain);

	public EncoderBase(Context context, SessionLogger log) {
		_context = context;
		_logger = log;
	}

	@Override
	public void init(AudioSource audioSource) {
		_audioSource = audioSource;
	}

	@Override
	public byte[] getHeader() {
		return null;
	}

	@Override
	public int getPacketDuration() {
		return getFrameDuration() * _framesPerPacket;
	}

	@Override
	public int getSampleRate() {
		return _sampleRate;
	}

	@Override
	public void setListener(EncoderListener listener) {
		_listener = listener;
	}

	@Override
	public boolean prepareAsync(int amplifierGain, boolean levelMeter) {
		_amplifierGain = amplifierGain;
		_amplifierGainFactor = Math.pow(10.0, amplifierGain / 20.0);
		return true;
	}

	public void enableNoiseSuppression(boolean enable) {
		_enableNoiseSuppression = enable;
	}

	public void enableAGC(boolean enable) {
		_enableAGC = enable;
	}

	@Override
	public void start() {
		AudioSource audioSource = _audioSource;
		if (audioSource != null) {
			audioSource.start();
		}
	}

	@Override
	public void stop() {
		AudioSource audioSource = _audioSource;
		if (audioSource != null) {
			audioSource.stop();
		}
	}

	@Override
	public int getLevel() {
		AudioSource audioSource = _audioSource;
		return audioSource != null ? (int) (audioSource.getLevel() * _amplifierGainFactor) : 0;
	}

	@Override
	public int getPacketsPerSecond() {
		int d = getPacketDuration();
		return d > 0 ? 1000 / d : 0;
	}

	@Override
	public void onAudioSourceHasData(short[] data) {
		if (_id < 1) {
			return;
		}
		try {
			byte[] enc = encode(_id, data, _amplifierGain);
			if (enc != null) {
				_listener.onEncoderData(enc);
			}
			return;
		} catch (Throwable ignored) {
		}
		_listener.onEncoderErrorUnknown();
	}

	@Override
	public void onAudioSourceReady(int sampleRate) {
		_sampleRate = sampleRate;
		_listener.onEncoderReady();
	}

	@Override
	public void onAudioSourceError() {
		_listener.onEncoderErrorMicrophoneDevice();
	}

	@Override
	public void onAudioSourceInitError() {
		_logger.logError("Failed to start opus recorder " + _sampleRate + " Hz; " + _framesPerPacket + " frames/packet; frame size " + getFrameDuration() + " ms", null);
		_listener.onEncoderErrorMicrophoneDevice();
	}

	@Override
	public void onRecordPermissionError() {
		_listener.onEncoderErrorControlledAccess();
	}

	@Override
	public void onAudioSourceStart() {
		_listener.onEncoderStart();
	}

	@Override
	public void onAudioSourceEnd() {
		// listener.onEncoderStop();
	}

	public void setFramesPerPacket(int framesInPacket) {
		if (framesInPacket < 1) {
			framesInPacket = 1;
		}
		if (framesInPacket > 10) {
			framesInPacket = 10;
		}
		_framesPerPacket = framesInPacket;
	}

	public void setBitrate(int bitrate) {
		_bitrate = bitrate;
	}

	protected int getBufferSampleCount() {
		return (int) (((long) _sampleRate * _framesPerPacket * getFrameDuration()) / 1000);
	}

	@Override
	public String toString() {
		StringBuilder sb = new StringBuilder();
		int duration = getPacketDuration();
		return "opus, " + getSampleRate() + " Hz, " + (duration > 0 ? 1000 / duration : 0) + " packets/second";
	}

}
