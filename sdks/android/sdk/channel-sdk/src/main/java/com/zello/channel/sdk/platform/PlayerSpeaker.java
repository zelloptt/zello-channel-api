package com.zello.channel.sdk.platform;

import android.annotation.SuppressLint;
import android.content.Context;
import android.media.AudioFormat;
import android.media.AudioTrack;
import android.os.Build;
import android.os.Process;
import android.os.SystemClock;

import com.zello.channel.sdk.SessionLogger;

import java.util.Arrays;
import java.util.Locale;

/*
 * Android's AudioTrack object has several peculiarities:
 * 1. It doesn't start playing until it's buffer is 100% full.
 *    To start playing audio as soon as possible we have to trick it:
 *    -log a lot of silent dummy data into it
 *    -set playback position to point at the end of dummy data
 *    -log a piece of real data to fill the buffer up to 100%
 *    -at this stage AudioTrack starts playing the real data
 * 2. It often stops working properly after setPlaybackHeadPosition is called for the second time.
 *    As a result, when there's not enough data, it's not an option to pause playback and
 *    resume it later using the same trick with setPlaybackHeadPosition.
 *    Audio device recreation is required to be able to use setPlaybackHeadPosition again.
 */

/**
 * @exclude Not for public use
 */
public class PlayerSpeaker implements AudioReceiver {

	private Context _context;
	private AudioReceiverEvents _events;
	private int _streamType = android.media.AudioManager.STREAM_MUSIC;
	private boolean _paused;
	//	private long _dataPos; // Frames written into device
	private long _playPos; // Frames played by device
	private long _lastReportedPlayPos; // Last reported time, 50-millisecond units
	private int _channels;
	private int _sampleRate;
	private int _bitsPerSample;
	//	private int _packetDuration; // Milliseconds
	private ThreadEx _audioThread;
	private final Signal _audioStartedSignal = new Signal();
	private final Signal _audioResumedSignal = new Signal();
	//	private long _totalBufferedSeconds;
	private boolean _startError;
	private PlayerListener _playerListener;
	private Object _cbObject;
	private int _deviceVolume = 100;
	private boolean _muted;
	private boolean _setVolume;
	private boolean _flush;
	private SessionLogger _logger;

	public PlayerSpeaker(Context context, SessionLogger logger, AudioReceiverEvents events) {
		_context = context;
		_logger = logger;
		_events = events;
	}

	@Override
	public boolean prepare(int channels, int sampleRate, int bitsPerSample, int packetDuration) {

		_streamType = Audio.Companion.get(_context, _logger).getPlaybackStreamType();
		if ((channels != 1 && channels != 2) || (bitsPerSample != 8 && bitsPerSample != 16) || sampleRate < 1 || packetDuration < 1) {
			return false;
		}
		// synchronized (this) {
		if (_audioThread == null || !_audioThread.isAlive()) {
			_channels = channels;
			_sampleRate = sampleRate;
			_bitsPerSample = bitsPerSample;
//			_packetDuration = packetDuration;
			_audioThread = new ThreadEx("Audio playback thread") {
				@Override
				protected void run() {
					ThreadEx t = _audioThread;
					if (t != null) {
						pump(t.getExitSignal());
					} else {
						_audioStartedSignal.eventNotifySync();
						AudioReceiverEvents events = _events;
						if (events != null) {
							events.onPlaybackEnd();
						}
					}
				}
			};
			_audioResumedSignal.resetSync();
			_startError = false;
			synchronized (_audioStartedSignal) {
				_audioThread.start();
				_audioStartedSignal.eventWaitNoSync(Long.MAX_VALUE);
			}
			return !_startError;
		}
		// }
		return false;
	}

	@Override
	public void start() {
		_audioResumedSignal.setSync();
	}

	@Override
	public void stop() {
		ThreadEx thread;
		// synchronized (this) {
		thread = _audioThread;
		_audioThread = null;
		// }
		if (thread != null) {
			thread.getExitSignal().setSync();
			_audioResumedSignal.setSync();
			// thread.stop();
		}
	}

	@Override
	public void pause() {
		_paused = true;
		_flush = true;
	}

	@Override
	public void resume() {
		_paused = false;
	}

	@Override
	public void setStreamVolume(int percent) {
		if (percent < 0) {
			percent = 0;
		}
		if (percent > 100) {
			percent = 100;
		}
		android.media.AudioManager audioManager = (android.media.AudioManager) _context.getSystemService(Context.AUDIO_SERVICE);
		if (audioManager != null) {
			int volumeMax = audioManager.getStreamMaxVolume(_streamType);
			int volumeStep = 100 / volumeMax;
			int val = Math.min(volumeMax, Math.max(0, (percent + volumeStep - 1) * volumeMax / 100));
			audioManager.setStreamVolume(_streamType, val, 0);
		}
	}

	@Override
	public void setDeviceVolume(int percent) {
		if (percent < 0) {
			percent = 0;
		}
		if (percent > 100) {
			percent = 100;
		}
		if (percent != _deviceVolume) {
			_deviceVolume = percent;
			_setVolume = true;
		}
	}

	@Override
	public void setMuted(boolean muted) {
		if (muted != _muted) {
			_muted = muted;
			_setVolume = true;
		}
	}

	@Override
	public int getPosition() {
		int sampleRate_ = _sampleRate;
		if (sampleRate_ > 0) {
			return (int) (_playPos * 1000 / sampleRate_);
		}
		return 0;
	}

	@Override
	public void setPlayerListener(PlayerListener listener, Object object) {
		_cbObject = object;
		_playerListener = listener;
	}

	@Override
	public void reset() {
		_playerListener = null;
		_cbObject = null;
		_events = null;
	}

	@Override
	public boolean isPlaying() {
		ThreadEx t = _audioThread;
		return t != null && t.isAlive();
	}

	private void updatePlayPos(long pos, int sampleRate) {
		if (_playPos == pos) {
			return;
		}
		long actual = currentActualPosition(pos, sampleRate);
		_playPos = pos;
		long t0 = _lastReportedPlayPos / 2;
		long t1 = actual / 2;
		if (t0 != t1) {
			_lastReportedPlayPos = actual;
			Object o = _cbObject;
			PlayerListener l = _playerListener;
			if (l != null) {
				l.onPlayerPositionChanged((int) (t1 * 100), o);
			}
		}
	}

	private long currentActualPosition(long pos, int sampleRate) {
		return (sampleRate < 1) ? 0 : ((pos * 20) / sampleRate);
	}

	@SuppressLint("InlinedApi")
	@SuppressWarnings("deprecation")
	private void pump(Signal exit) {
		int dataPos = 0;
		_playPos = 0;
		int channels = _channels;
		int sampleRate = _sampleRate;
		int bitsPerSample = _bitsPerSample;
		boolean paused = false;
		int bufferSize = 0;

		Audio.Companion.get(_context, _logger).acquirePlayback();

		AudioTrack audio = null;
		String error;
		int block;
		int buffer;
		int bytesPerSample = bitsPerSample / 8;
		if ((channels == 1 || channels == 2) && (bitsPerSample == 8 || bitsPerSample == 16) && sampleRate > 0) {
			int api = Build.VERSION.SDK_INT;
			int channelConfig;
			if (channels == 1) {
				channelConfig = api > 4 ? AudioFormat.CHANNEL_OUT_MONO : AudioFormat.CHANNEL_CONFIGURATION_MONO;
			} else {
				channelConfig = api > 4 ? AudioFormat.CHANNEL_OUT_STEREO : AudioFormat.CHANNEL_CONFIGURATION_STEREO;
			}
			int format = (bitsPerSample == 8) ? AudioFormat.ENCODING_PCM_8BIT : AudioFormat.ENCODING_PCM_16BIT;
			block = AudioTrack.getMinBufferSize(sampleRate, channelConfig, format);
			// Some crappy devices report 0 thus causing division by zero below
			if (block < 1) {
				block = 1;
			}
			// We would like to have 100 ms device buffer.
			// Higher values are likely to fail to be allocated.
			int amount = sampleRate * channels * bytesPerSample / 2;
			for (int mult = 1; audio == null; mult *= 2) {
				// Round up to blocks
				buffer = Math.max(block, ((amount / mult) / block) * block);
				try {
					// AudioTrack will throw IllegalArgumentException if there's a problem with selected mode
					audio = new AudioTrack(_streamType, sampleRate, channelConfig, format, buffer, AudioTrack.MODE_STREAM);
					// AudioTrack will throw IllegalStateException here if there's a problem with buffer allocation
					if (audio != null && audio.getState() == AudioTrack.STATE_INITIALIZED) {
						audio.getPlaybackHeadPosition();
						float volume = _muted ? 0 : DecoderBase.scaleVolumePercent(_deviceVolume);
						audio.setVolume(volume);
						bufferSize = buffer / bytesPerSample;
						_logger.log("Created player: " + (channels == 1 ? "mono " : "stereo ") + sampleRate + " Hz; " + block + "/" + buffer + " bytes; max gain " + formatDouble(AudioTrack.getMaxVolume(), 1) + "; volume " + formatDouble(volume, 3));
						break;
					} else {
						error = "device can't initialize";
					}
				} catch (Throwable e) {
					error = e.getClass().getName() + "; " + e.getMessage();
				}
				if (audio != null) {
					AudioHelper.audioTrackRelease(audio);
					audio = null;
				}
				_logger.logError("Failed to create player: " + (channels == 1 ? "mono " : "stereo ") + sampleRate + " Hz; " + block + "/" + buffer + " bytes (" + error + ")", null);
				if (buffer == block) {
					break;
				}
			}
		}

		_startError = audio == null;
		_audioStartedSignal.eventNotifySync();
		AudioReceiverEvents events = _events;
		if (events == null) {
			_logger.logError("Speaker player logic error: events object is null", null);
		}
		if (audio == null) {
			Audio.Companion.get(_context, _logger).releasePlayback();
			_audioThread = null;
			if (events != null) {
				events.onPlaybackInitError();
			}
			return;
		}

		short[] data16bit;
		byte[] data8bit;
		int wrote;
		boolean eos = false;
		boolean tailWritten = false;
		long duration, totalDuration = 0;
		long startTime = 0, endTime = 0, curTime;

		while (!_audioResumedSignal.isSetNoSync()) {
			_audioResumedSignal.eventWait(1000);
		}

		int outBufferSize = sampleRate * bytesPerSample / 20;
		boolean firstPositionChange = true;
		long pauseStartTime = 0;
		long newPlayPos, oldPlayPos = 0;

		// Some devices (Amazon Kindle Fire HDX) reset playback cursor position to zero
		// when playback reached the end of the buffer for the first time.
		// Workaround for this is to add lost playback position to all further cursor readings.
		long playPosWorkaround = 0;

		try {
			Process.setThreadPriority(Process.THREAD_PRIORITY_URGENT_AUDIO);
		} catch (Throwable ignored) {
		}

		if (events != null) {
			while (!exit.isSetNoSync()) {
				if (_flush) {
					AudioHelper.audioTrackPause(audio);
					AudioHelper.audioTrackFlush(audio);
					dataPos = 0;
					_playPos = 0;
					playPosWorkaround = 0;
					_flush = false;
					eos = false;
				}
				{
					newPlayPos = audio.getPlaybackHeadPosition();
					if (playPosWorkaround > 0) {
						newPlayPos += playPosWorkaround;
					} else if (newPlayPos < oldPlayPos) {
						playPosWorkaround = oldPlayPos;
						newPlayPos += playPosWorkaround;
					}
					oldPlayPos = newPlayPos;
					updatePlayPos(newPlayPos, sampleRate);
				}
				// When audio device is started, it takes a lot of time (up to 500ms) for playback to actually start
				// This causes playback to be stopped prematurely by a watchdog timer
				// To avoid this, fix startup time when first playback cursor takes place
				if (firstPositionChange && _playPos > 0) {
					firstPositionChange = false;
					long time = SystemClock.elapsedRealtime() - _playPos * 1000 / sampleRate;
					if (time > startTime) {
						startTime = time;
					}
				}
				if (_setVolume) {
					float volume = _muted ? 0 : DecoderBase.scaleVolumePercent(_deviceVolume);
					audio.setVolume(volume);
					_setVolume = false;
				}
				if (paused != _paused) {
					if (paused) {
						AudioHelper.audioTrackPlay(audio);
						paused = false;
						startTime += SystemClock.elapsedRealtime() - pauseStartTime;
					} else {
						pauseStartTime = SystemClock.elapsedRealtime();
						AudioHelper.audioTrackPause(audio);
						paused = true;
					}
				}

				if (eos) {
					if (!tailWritten && dataPos < bufferSize) {
						tailWritten = true;
						int count = bufferSize - dataPos;
						if (bitsPerSample == 8) {
							byte[] silence = Algorithms.createByteArray(count);
							Arrays.fill(silence, (byte) 0);
							audio.write(silence, 0, count);
						} else {
							short[] silence = Algorithms.createShortArray(count);
							Arrays.fill(silence, (short) 0);
							audio.write(silence, 0, count);
						}
					}
					curTime = SystemClock.elapsedRealtime();
					// Playback is complete when either of these is satisfied:
					// 1. Playback cursor reaches last written sample
					// 2. Time enough to play all written buffers has passed and
					// time enough to play last written buffer has passed
					long position = audio.getPlaybackHeadPosition();
					if (/*position >= dataPos || */(/*position == 0 && */curTime >= endTime && curTime >= startTime + totalDuration)) {
						break;
					} else {
						exit.eventWait(50);
						continue;
					}
				}
				if (paused) {
					exit.eventWait(200);
				} else {
					wrote = 0;
					// Split large chunks into small 50 ms sub-chunks
					if (bitsPerSample == 8) {
						data8bit = events.onGet8BitData();
						if (data8bit == null || data8bit.length == 0) {
							eos = true;
							continue;
						}

						int left = data8bit.length;
						while (left > 0 && !exit.isSetNoSync() && !_paused && !_flush) {
							int n = left > outBufferSize ? outBufferSize : left;
							int i = audio.write(data8bit, wrote, n);
							if (i <= 0) {
								break;
							} else {
								newPlayPos = audio.getPlaybackHeadPosition();
								if (playPosWorkaround > 0) {
									newPlayPos += playPosWorkaround;
								} else if (newPlayPos < oldPlayPos) {
									playPosWorkaround = oldPlayPos;
									newPlayPos += playPosWorkaround;
								}
								oldPlayPos = newPlayPos;
								updatePlayPos(newPlayPos, sampleRate);
								wrote += n;
							}
							left -= n;
						}
					} else {
						data16bit = events.onGet16BitData();
						if (data16bit == null || data16bit.length == 0) {
							eos = true;
							continue;
						}

						int left = data16bit.length;
						while (left > 0 && !exit.isSetNoSync() && !_paused && !_flush) {
							int n = left > outBufferSize ? outBufferSize : left;
							int i = audio.write(data16bit, wrote, n);
							if (i <= 0) {
								break;
							} else {
								newPlayPos = audio.getPlaybackHeadPosition();
								if (playPosWorkaround > 0) {
									newPlayPos += playPosWorkaround;
								} else if (newPlayPos < oldPlayPos) {
									playPosWorkaround = oldPlayPos;
									newPlayPos += playPosWorkaround;
								}
								oldPlayPos = newPlayPos;
								updatePlayPos(newPlayPos, sampleRate);
								wrote += n;
							}
							left -= n;
						}
					}

					if (_paused || _flush) {
						continue;
					}

					if (wrote > 0) {
						wrote /= channels;
						duration = wrote * 1000 / sampleRate;
						totalDuration += duration;
						if (dataPos == 0) {
							AudioHelper.audioTrackPlay(audio);
							events.onPlaybackStart();
						}
						dataPos += wrote;
						endTime = SystemClock.elapsedRealtime();
						if (startTime == 0) {
							startTime = endTime;
						}
						endTime += duration + 200;
					} else {
						events.onPlaybackInitError();
						break;
					}
				}

			}
		} else {
			_logger.logError("Speaker player logic error #2: events object is null", null);
		}
		_audioThread = null;
		if (events != null) {
			events.onPlaybackEnd();
		}
		// Flushing works in paused state only
		AudioHelper.audioTrackPause(audio);
		AudioHelper.audioTrackFlush(audio);
		AudioHelper.audioTrackStop(audio);
		// Release native resources
		AudioHelper.audioTrackRelease(audio);
		Audio.Companion.get(_context, _logger).releasePlayback();
	}

	private static boolean _formatFails = false;

	private static String formatDouble(double x, int precision) {
		if (precision >= 0) {
			if (!_formatFails) {
				try {
					return String.format(Locale.US, "%." + precision + "f", x);
				} catch (Throwable ignored) {
					// NullPointerException, UnknownFormatConversionException according to some google play reports
					_formatFails = true;
				}
			}
			String s = x < 0 ? "-" : "";
			if (x < 0) {
				x = -x;
			}
			int n = (int) x;
			s += Integer.toString((int) x);
			if (precision > 0) {
				s += ".";
				double d = x - n;
				for (int i = 0; i < precision; ++i) {
					d *= 10;
				}
				s += Integer.toString((int) d);
			}
			return s;
		} else {
			return Double.toString(x);
		}
	}

}
