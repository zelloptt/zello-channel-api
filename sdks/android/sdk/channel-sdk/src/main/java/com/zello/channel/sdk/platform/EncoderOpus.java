package com.zello.channel.sdk.platform;

import android.content.Context;

import com.zello.channel.sdk.SessionLogger;

/**
 * @exclude Not for public use
 */
@SuppressWarnings("WeakerAccess")
public class EncoderOpus extends EncoderBase {

	private native int nativeStart(int sampleRate, int framesInPacket, int frameSize, int bitrate);

	private native byte[] nativeStop(int id);

	private native byte[] nativeEncode(int id, short[] data, int amplifierGain);

	private native static byte[] nativeGetHeader(int sampleRate, int framesInPacket, int sampleSize);

	private static class Config {

		private int _framesPerPacket;
		private int _frameSize;
		private int _sampleRate;
		private int _bitrate;
		private String _info;

		@Override
		public String toString() {
			return _info;
		}
	}

	public static final String name = "opus";
	public static final int _defFramesPerPacket = 2; // [1, ∞] but not more than 120 ms per packet
	public static final int _defFrameSize = 60; // [2.5 | 5 | 10 | 20 | 40 | 60] ms
	public static int _defBitrate = -1; // [1000, ∞]
	public static int _defSampleRate = 8000; // [8000 | 12000 | 16000 | 24000 | 48000 ]; [NB | MB | WB | SWB | FB]

	private int _frameSize = _defFrameSize; // ms
	private byte[] _header = null;

	public EncoderOpus(Context context, SessionLogger logger) {
		super(context, logger);
		_framesPerPacket = _defFramesPerPacket;
		_sampleRate = _defSampleRate;
		_bitrate = 0; // Only used when > 0
	}

	public EncoderOpus(Context context, SessionLogger logger, Object config) {
		this(context, logger);
		if (config != null && config instanceof Config) {
			setFramesPerPacket(((Config) config)._framesPerPacket);
			setFrameSize(((Config) config)._frameSize);
			setSampleRate(((Config) config)._sampleRate);
			setBitrate(((Config) config)._bitrate);
		}
	}

	public void setFramesPerPacket(int framesInPacket) {
		super.setFramesPerPacket(framesInPacket);
		_header = null;
	}

	public void setFrameSize(int frameSize) {
		if (frameSize <= 5) {
			frameSize = 5;
		} else if (frameSize <= 10) {
			frameSize = 10;
		} else if (frameSize <= 20) {
			frameSize = 20;
		} else if (frameSize <= 40) {
			frameSize = 40;
		} else {
			frameSize = 60;
		}
		_frameSize = frameSize;
		_header = null;
	}

	public void setSampleRate(int sampleRate) {
		// OPUS supports five sample rates (NB/MB/WB/SWB/FB)
		if (sampleRate == 8000 || sampleRate == 12000 || sampleRate == 16000 || sampleRate == 24000 || sampleRate == 48000) {
			_sampleRate = sampleRate;
			_header = null;
		}
	}

	@Override
	public byte[] getHeader() {
		if (_header == null) {
			try {
				_header = nativeGetHeader(_sampleRate, _framesPerPacket, _frameSize);
			} catch (Throwable t) {
				_logger.logError("Failed to get opus header", t);
			}
		}
		return _header;
	}

	@Override
	public String getName() {
		return name;
	}

	@Override
	public int getFrameDuration() {
		return _frameSize; // Doesn't work for 2.5 ms frames, but we intentionally don't support 2.5 ms frames
	}

	@Override
	public boolean prepareAsync(int amplifierGain, boolean levelMeter) {
		super.prepareAsync(amplifierGain, levelMeter);
		synchronized (this) {
			int stage = 0;
			try {
				stage++;
				// Opus repacketizer only allows packets of up to 120 ms duration
				int maxFramesInPacket = Math.max(1, 120 / _frameSize);
				if (_framesPerPacket > maxFramesInPacket) {
					_framesPerPacket = maxFramesInPacket;
				}
				_id = nativeStart(_sampleRate, _framesPerPacket, _frameSize, _bitrate);
				int packetDur = getPacketDuration();
				if (_id > 0) {
					stage++;
					if (_audioSource.prepare(_sampleRate, getBufferSampleCount(), levelMeter, _enableNoiseSuppression, _enableAGC)) {
						return true;
					} else {
						_logger.logError("Failed to start opus encoder stage " + stage + "; " + _sampleRate + " Hz; " + ((packetDur > 0) ? 1000 / packetDur : 0)
								+ " packets/second; frame size " + _frameSize + " ms", null);
					}
				} else {
					_logger.logError("Failed to start opus encoder stage " + stage + "; " + _sampleRate + " Hz; " + ((packetDur > 0) ? 1000 / packetDur : 0) + " packets/second; frame size "
							+ _frameSize + " ms", null);
				}
			} catch (Throwable t) {
				_logger.logError("Failed to start opus encoder stage " + stage, t);
			}
		}
		_listener.onEncoderErrorCodecImplementation();
		return false;
	}

	@Override
	public void stop() {
		super.stop();
		byte[] enc = null;
		synchronized (this) {
			if (_id > 0) {
				try {
					enc = nativeStop(_id);
				} catch (Throwable t) {
					_logger.logError("Failed to stop opus encoder", t);
				}
				_id = 0;
			}
		}
		if (enc != null) {
			_listener.onEncoderData(enc);
		}
		_header = null;
	}

	@Override
	public Object saveConfig() {
		Config config = new Config();
		config._framesPerPacket = _framesPerPacket;
		config._frameSize = _frameSize;
		config._sampleRate = _sampleRate;
		config._bitrate = _bitrate;
		config._info = toString();
		return config;
	}

	// Opus packet can't hold more than 120 ms total sound
	public static int normalizeFramesPerPacket(int framesPerPacket, int frameSize) {
		if (framesPerPacket < 1) {
			return 1;
		} else {
			int max = 120 / frameSize;
			return max >= framesPerPacket ? framesPerPacket : max;
		}
	}

	@Override
	protected byte[] encode(int id, short[] data, int amplifierGain) {
		return nativeEncode(_id, data, _amplifierGain);
	}

}
