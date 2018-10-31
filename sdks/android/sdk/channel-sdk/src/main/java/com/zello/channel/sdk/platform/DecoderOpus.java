package com.zello.channel.sdk.platform;

import android.content.Context;

import com.zello.channel.sdk.SessionLogger;

/**
 * @exclude Not for public use
 */
public class DecoderOpus extends DecoderBase implements AudioReceiverEvents {

	private native int nativeStart(byte[] header);

	private native void nativeStop(int id);

	private native short[] nativeDecode(int id, byte[] data, int amplifierGain);

	private native int nativeGetSampleRate(int id);

	private native int nativeGetFramesInPacket(int id);

	private native int nativeGetFrameSize(int id);

	private int _frameSize;
	private int _counter;
	private boolean _decodedLast;

	public static final String name = "opus";
	// Fake missing packet. It will be returned every time a packet is lost. A
	// null byte array can't be used because that would mean EOS. We should
	// detect missing packet condition and feed OPUS decoder with null data to
	// make it generate compensation data.
	private static final byte[] _missingPacket = {0};

	public DecoderOpus(Context context, SessionLogger logger) {
		super(context, logger);
	}

	@Override
	public byte[] getMissingPacket() {
		return _missingPacket;
	}

	@Override
	public void prepareAsync(final byte[] header, final int amplifierGain, final boolean levelMeter) {
		super.prepareAsync(header, amplifierGain, levelMeter);
		_amplifierGain = amplifierGain;
		synchronized (this) {
			if (_thread == null || !_thread.isAlive()) {
				_counter = 0;
				_started = true;
				_thread = new Thread() {
					@Override
					public void run() {
						int stage = 0;
						try {
							stage++;
							_id = nativeStart(header);
							if (_id > 0) {
								stage++;
								int sampleRate = nativeGetSampleRate(_id);
								stage++;
								_framesInPacket = nativeGetFramesInPacket(_id);
								_frameSize = nativeGetFrameSize(_id);
								if (_player.prepare(1, sampleRate, 16, _frameSize * _framesInPacket)) {
									DecoderListener l = _listener;
									if (l != null) {
										l.onDecoderReady();
									}
									return;
								} else {
									_logger.logError("Failed to start opus player " + sampleRate + " Hz; " + _framesInPacket + " frames/packet; frame size " + _frameSize + " ms", null);
								}
							} else {
								_logger.logError("Failed to start opus decoder", null);
							}
						} catch (Throwable t) {
							_logger.logError("Failed to start opus decoder stage " + stage, t);
						}
						DecoderListener l = _listener;
						if (l != null) {
							l.onDecoderError();
						}
					}
				};
				_thread.start();
				return;
			}
		}
		DecoderListener l = _listener;
		if (l != null) {
			l.onDecoderError();
		}
	}

	@Override
	public void stop() {
		super.stop();
		synchronized (this) {
			_thread = null;
			try {
				nativeStop(_id);
			} catch (Throwable t) {
				_logger.logError("Failed to stop opus decoder", t);
			}
			_id = 0;
		}
		_player.stop();
	}

	@Override
	public String getName() {
		return "opus";
	}

	@Override
	protected short[] getSamples() {
		byte[] data = null;
		do {
			while (_started && data == null) {
				DecoderListener l = _listener;
				if (l != null) {
					data = l.onDecoderData();
				} else {
					data = null;
				}
				if (data == null) {
					if (_decodedLast) {
						return null;
					} else {
						_decodedLast = true;
						break;
					}
				}
				if (data.length == 1 && data[0] == _missingPacket[0]) {
					// Lost packet
					if (_counter == 0) {
						// Don't make use of compensation packets until at least
						// one valid packet is received
						continue;
					}
					// OPUS decoder generates compensation data when it
					// receives null packet
					data = null;
					break;
				}
			}
			synchronized (this) {
				if (_started) {
					++_counter;
					try {
						short[] s = nativeDecode(_id, data, _amplifierGain);
						// First nativeDecode will return null because of FEC
						if (_counter > 1) {
							return s;
						}
						data = null;
					} catch (Throwable ignored) {
						break;
					}
				} else {
					return null;
				}
			}
		} while (true);
		DecoderListener l = _listener;
		if (l != null) {
			l.onDecoderError();
		}
		return null;
	}

}
