package com.zello.channel.sdk.platform;

import android.content.Context;

import com.zello.channel.sdk.SessionLogger;

@SuppressWarnings("WeakerAccess")
abstract class DecoderBase implements Decoder {

	protected Context _context;
	protected int _id;
	protected DecoderListener _listener;
	protected int _framesInPacket;
	protected Thread _thread;
	protected boolean _started;
	protected int _amplifierGain;
	protected AudioReceiver _player;
	protected SessionLogger _logger;

	protected abstract short[] getSamples();

	public DecoderBase(Context context, SessionLogger logger) {
		_context = context;
		_logger = logger;
	}

	@Override
	public void init(AudioReceiver receiver) {
		// This may be called multiple times when used by the history player
		synchronized (this) {
			if (_player == null) {
				_player = receiver;
			}
		}
	}

	@Override
	public void setListener(DecoderListener listener) {
		_listener = listener;
	}

	@Override
	public void setPlayerListener(PlayerListener listener, Object object) {
		_player.setPlayerListener(listener, object);
	}

	@Override
	public void setPacketDuration(int count) {
	}

	@Override
	public void prepareAsync(byte[] header, final int amplifierGain, final boolean levelMeter) {
	}

	@Override
	public void start() {
		_player.start();
	}

	@Override
	public void stop() {
		_started = false;
	}

	@Override
	public void pause() {
		_player.pause();
	}

	@Override
	public void resume() {
		_player.resume();
	}

	@Override
	public void setAudioVolume(int value) {
		if (value >= 0) {
			_player.setStreamVolume(value);
		}
	}

	@Override
	public void setGain(int gain) {
		_amplifierGain = gain < -40 ? -40 : (gain > 40 ? 40 : gain);
	}

	@Override
	public int getPosition() {
		return _player.getPosition();
	}

	@Override
	public void setMuted(boolean muted) {
		_player.setMuted(muted);
	}

	@Override
	public boolean getStarted() {
		return _started;
	}

	@Override
	public byte[] onGet8BitData() {
		return null;
	}

	@Override
	public short[] onGet16BitData() {
		return getSamples();
	}

	@Override
	public void onPlaybackInitError() {
		DecoderListener l = _listener;
		if (l != null) {
			l.onDecoderError();
		}
	}

	@Override
	public void onPlaybackEnd() {
		DecoderListener l = _listener;
		if (l != null) {
			l.onDecoderStop();
		}
	}

	@Override
	public void onPlaybackStart() {
		DecoderListener l = _listener;
		if (l != null) {
			l.onDecoderStart();
		}
	}

	public static float scaleVolumePercent(int percent) {
		return (float) Math.pow(10, ((double) percent * 0.4 - 40) / 20);
	}

}
