package com.zello.channel.sdk.platform;

import android.annotation.SuppressLint;
import android.content.Context;
import android.media.AudioFormat;
import android.media.AudioRecord;
import android.media.AudioTrack;
import android.media.MediaRecorder;
import android.os.Build;
import android.os.Process;
import android.os.SystemClock;

import com.zello.channel.sdk.SessionLogger;

@SuppressWarnings("WeakerAccess")
public class RecorderMicrophone implements AudioSource {

	private int _samplerate;
	private int _bufferSampleCount; // Number of samples in every buffer returned from recorder
	private ThreadEx _audioThread = null;
	private Signal _audioStartedSignal = new Signal();
	private Signal _audioResumedSignal = new Signal();
	private int _audioLevel;
	private boolean _levelMeter;
	private AudioFx _audioFx;
	private static final Signal _threadIsRunning = new Signal();
	private volatile AudioSourceEvents _events;
	private SessionLogger _logger;

	private Context _context;
	private AudioTrack _audioTrack;
	private short[] _playerBuffer;
	private long _nextPowerWakeTime;

	static private boolean _failed;
	static private boolean _autoReportDone;
	static private boolean _use44100;
	static public final String threadName = "Audio record thread";

	static public boolean getFailed() {
		return _failed;
	}

	public RecorderMicrophone(Context context, SessionLogger logger, AudioSourceEvents events) {
		_context = context.getApplicationContext();
		_logger = logger;
		_events = events;
	}

	@Override
	public boolean prepare(int sampleRate, int bufferSampleCount, boolean levelMeter, boolean noiseSuppression, boolean useAGC) {
		final AudioSourceEvents events = _events;
		if (events == null || sampleRate < 1 || bufferSampleCount < 1) {
			return false;
		}
		synchronized (this) {
			if (_audioThread == null) {
				_samplerate = sampleRate;
				_bufferSampleCount = bufferSampleCount;
				_levelMeter = levelMeter;
				if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN && (noiseSuppression || useAGC)) {
					audioFxCreate(noiseSuppression, useAGC);
				}
				_audioThread = new ThreadEx(threadName) {
					Signal signal = getExitSignal();

					@Override
					protected void run() {
						pump(signal, events);
					}
				};
				_audioResumedSignal.resetSync();
				_audioThread.start();
			}
		}
		return true;
	}

	@Override
	public void start() {
		_audioResumedSignal.setSync();
	}

	@Override
	public void stop() {
		ThreadEx thread;
		synchronized (this) {
			thread = _audioThread;
			_audioThread = null;
		}
		if (thread != null) {
			thread.getExitSignal().setSync();
			_audioResumedSignal.setSync();
			// thread.join();
		}
		// Signal
		AudioSourceEvents events = _events;
		_events = null;
		if (events != null) {
			events.onAudioSourceEnd();
		}
	}

	@Override
	public int getLevel() {
		return _audioLevel;
	}

	protected boolean audioStart(AudioRecord audio, AudioSourceEvents events) {
		final AudioRecord a = audio;
		final Bool audioStarted = new Bool(false);
		final Bool audioError = new Bool(false);
		long timer = PowerManager.get(_context).startOneShotTimer(5000, 0, new PowerManager.PowerManagerCallbackEx() {
			@Override
			public void onTimerTick(final long id) {
			}

			@Override
			public void onTimerDone(final long id) {
				if (!audioStarted.get()) {
					_logger.logError("Recorder is deadlocked", null);
					audioError.set(true);
					synchronized (a) {
						a.notifyAll();
					}
				}
			}
		}, "recorder pampers");
		try {
			audio.startRecording();
			audioFxStart(audio);
		} catch (Throwable t) {
			AudioHelper.audioRecordRelease(audio);
			audio = null;
			_logger.logError("Recorder threw", t);
			PowerManager.get(_context).stopTimer(timer);
			audioError.set(true);
		} finally {
			if (audioError.get()) {
				AudioHelper.audioRecordRelease(audio);
				events.onAudioSourceError();
			} else {
				audioStarted.set(true);
				PowerManager.get(_context).stopTimer(timer);
			}
		}
		return !audioError.get();
	}

	/**
	 * Create a dummy audio track object that will be used to keep the microphone awake.
	 * This is necessary for a number of devices, namely Samsung SM-T377W.
	 */

	private int timeBetweenPowerWakes;
	private final static int standardTimeBetweenPowerWakes = 1000;
	private final static int powerWakeSampleRate = 8000;

	private void startPowerWake() {
		int playerChannelConfig = AudioFormat.CHANNEL_OUT_MONO;
		int playerBufferSize = AudioTrack.getMinBufferSize(powerWakeSampleRate, playerChannelConfig, AudioFormat.ENCODING_PCM_16BIT);
		try {
			_audioTrack = new AudioTrack(android.media.AudioManager.STREAM_VOICE_CALL, powerWakeSampleRate, playerChannelConfig, AudioFormat.ENCODING_PCM_16BIT, playerBufferSize, AudioTrack.MODE_STREAM);
		} catch (Throwable ignore) {
		}
		if (_audioTrack != null) {
			int bufferSize = Math.min(playerBufferSize, powerWakeSampleRate / 10);
			timeBetweenPowerWakes = standardTimeBetweenPowerWakes;
			if (bufferSize > powerWakeSampleRate / 2) {
				timeBetweenPowerWakes = (bufferSize * standardTimeBetweenPowerWakes * 2) / powerWakeSampleRate;
			}
			_playerBuffer = new short[bufferSize];
			keepPowerWake();
			AudioHelper.audioTrackPlay(_audioTrack);
		}
	}

	private void keepPowerWake() {
		if (_audioTrack != null) {
			long time = SystemClock.elapsedRealtime();
			if (_nextPowerWakeTime > 0) {
				if (_nextPowerWakeTime <= time) {
					try {
						_audioTrack.write(_playerBuffer, 0, _playerBuffer.length);
					} catch (Throwable ignore) {
					}
					_nextPowerWakeTime = time + timeBetweenPowerWakes;
				}
			} else {
				_nextPowerWakeTime = time + 500;
			}
		}
	}

	private void stopPowerWake() {
		AudioTrack audio = _audioTrack;
		if (audio == null) {
			return;
		}
		_audioTrack = null;
		_playerBuffer = null;
		_nextPowerWakeTime = 0;
		AudioHelper.audioTrackPause(audio);
		AudioHelper.audioTrackFlush(audio);
		AudioHelper.audioTrackStop(audio);
		AudioHelper.audioTrackRelease(audio);
	}

	@SuppressLint("InlinedApi")
	@SuppressWarnings("deprecation")
	private void pump(Signal exit, AudioSourceEvents events) {
		for (int i = 0; !exit.isSetNoSync(); ++i) {
			synchronized (_threadIsRunning) {
				if (!_threadIsRunning.isSetNoSync()) {
					_threadIsRunning.setNoSync();
					break;
				}
			}
			if (i == 20) {
				_logger.logError("Previous recorder thread is still running", null);
				_audioStartedSignal.eventNotifySync();
				events.onAudioSourceInitError();
				return;
			} else {
				++i;
				ThreadEx.sleep(100);
			}
		}

		int sampleRate = _samplerate;
		short[] packetBuffer = null;
		int packetSamplesTotal = 0;
		int packetSamplesWritten = 0;

		try {
			Process.setThreadPriority(Process.THREAD_PRIORITY_URGENT_AUDIO);
		} catch (Exception ignored) {
		}

		Signal startSignal = _audioResumedSignal;
		AudioRecord audio = null;
		AudioConverter converter = null;
		final int api = Build.VERSION.SDK_INT;

		if (!exit.isSetNoSync()) {

			Audio.Companion.get(_context, _logger).acquireRecording();

			if (sampleRate > 0) {
				int channelConfig = AudioFormat.CHANNEL_IN_MONO;
				int format = AudioFormat.ENCODING_PCM_16BIT;
				for (int f = _use44100 ? 1 : 0; f < 2 && audio == null; ++f) {
					int useSampleRate = f == 0 ? sampleRate : (sampleRate == 44100 ? 8000 : 44100);
					String error = null;
					int block = 0;
					try {
						block = AudioRecord.getMinBufferSize(useSampleRate, channelConfig, format);
					} catch (Throwable t) {
						error = t.getClass().getName() + "; " + t.getMessage();
					}
					int source = -1;
					if (block > 0) {
						for (int i = 0; i < 2 && audio == null; ++i) {
							if (source < 0) {
								source = Audio.Companion.get(_context, _logger).getRecordStreamType();
							} else {
								source = source == MediaRecorder.AudioSource.DEFAULT ? MediaRecorder.AudioSource.MIC : MediaRecorder.AudioSource.DEFAULT;
							}
							// We would like to have 1000 ms device buffer.
							// Higher values are likely to fail to be allocated.
							// Round up requested buffer size to blocks.
							int buffer = block * ((useSampleRate + block - 1) / block);
							if (buffer < block) {
								buffer = block;
							}
							while (buffer >= block) {
								try {
									// AudioRecord will throw IllegalArgumentException if there's a problem with selected mode
									audio = new AudioRecord(source, useSampleRate, channelConfig, format, buffer);
									if (audio.getState() == AudioRecord.STATE_INITIALIZED) {
										_logger.log("Created recorder: source " + source + "; mono; " + useSampleRate + " Hz; " + block + "/" + buffer + " bytes");
										packetSamplesTotal = _bufferSampleCount;
										// Temporary buffer size can't be zero
										if (packetSamplesTotal < 1) {
											packetSamplesTotal = buffer / 4;
										}
										packetBuffer = Algorithms.createShortArray(packetSamplesTotal);
										if (sampleRate != useSampleRate) {
											converter = new AudioConverter(sampleRate);
											_use44100 = true;
										}
										break;
									} else {
										error = "device can't initialize";
									}
								} catch (Throwable t) {
									error = t.getClass().getName() + "; " + t.getMessage();
								}
								if (audio != null) {
									AudioHelper.audioRecordRelease(audio);
									audio = null;
								}
								_logger.logError("Failed to create recorder: source " + source + "; mono; " + useSampleRate + " Hz; " + block + "/" + buffer + " bytes (" + error + ")", null);
								buffer -= block;
								if (buffer <= 0) {
									break;
								}
							}
							// If first attempt failed with DEFAULT source, there's no need in trying it again
							if (source == MediaRecorder.AudioSource.DEFAULT) {
								break;
							}
						}
					} else {
						_logger.logError("Failed to create recorder: " + "mono; " + useSampleRate + " Hz (can't get min buffer size; " + error + ")", null);
					}
				}
			}
			if (audio == null) {
				Audio.Companion.get(_context, _logger).releaseRecording();
			}
		}

		_audioStartedSignal.eventNotifySync();

		if (audio == null) {
			synchronized (_threadIsRunning) {
				_threadIsRunning.resetSync();
			}
			if (!exit.isSetNoSync()) {
				_failed = true;
				events.onAudioSourceInitError();
				if (!_autoReportDone) {
					_autoReportDone = true;
					// TODO
				}
			}
			return;
		}
		// ZelloBase.get().getClient().submitReport("Auto-report: failed to create recorder\n" + SystemInformation.logAudioFormats());

		events.onAudioSourceReady(sampleRate);
		while (!startSignal.isSetNoSync()) {
			startSignal.eventWait(1000);
		}

		if (!exit.isSetNoSync()) {
			//AudioManager.get().applyMode();
			if (audioStart(audio, events)) {
				startPowerWake();
				events.onAudioSourceStart();
				boolean stopped = false;
				boolean bell;
				int canRead;
				long readStartTime = SystemClock.elapsedRealtime();
				short tmp[] = null; // Only used when running on Android 5.0.1-5.0.2 and the destination array offset is different from 0

				while (true) {
					int nextRead;
					do {
						bell = exit.isSetNoSync();
						if (bell && !stopped) {
							AudioHelper.audioRecordStop(audio);
							audioFxStop();
							stopped = true;
						}
						canRead = packetSamplesTotal - packetSamplesWritten;
						if (packetSamplesWritten > 0 && api == 21) {
							// Android 5.0.1-5.0.2 doesn't handle the offset parameter properly
							if (tmp == null || tmp.length < canRead) {
								tmp = new short[canRead];
							}
							nextRead = audio.read(tmp, 0, canRead);
							if (nextRead > 0) {
								System.arraycopy(tmp, 0, packetBuffer, packetSamplesWritten, nextRead);
							}
						} else {
							nextRead = audio.read(packetBuffer, packetSamplesWritten, canRead);
						}
						if (nextRead < 0) {
							if (!stopped) {
								_logger.logError("Recorder error: " + nextRead + " packetSamplesWritten: " + packetSamplesWritten + " canRead: " + canRead + " state: " + audio.getState(), null);
								AudioHelper.audioRecordRelease(audio);
								synchronized (_threadIsRunning) {
									_threadIsRunning.resetSync();
								}
								Audio.Companion.get(_context, _logger).releaseRecording();
								events.onAudioSourceError();
								stopPowerWake();
								return;
							}
						} else if (nextRead == 0) {
							if (readStartTime > 0 && SystemClock.elapsedRealtime() - readStartTime >= 2000) {
								AudioHelper.audioRecordRelease(audio);
								synchronized (_threadIsRunning) {
									_threadIsRunning.resetSync();
								}
								if (!stopped) {
									_logger.logError("Recorder is not giving any data", null);
									events.onAudioSourceError();
								}
								Audio.Companion.get(_context, _logger).releaseRecording();
								stopPowerWake();
								return;
							}
						} else {
							readStartTime = 0;
						}
						if (nextRead > 0) {
							if (_levelMeter) {
								int level = Short.MIN_VALUE;
								for (int i = packetSamplesWritten; i < packetSamplesWritten + nextRead; ++i) {
									level = Math.max(level, packetBuffer[i]);
								}
								_audioLevel = (int) (100.0 * level / Short.MAX_VALUE);
							}
							packetSamplesWritten += nextRead;
							if (packetSamplesWritten == packetSamplesTotal) {
								events.onAudioSourceHasData(converter == null ? packetBuffer : converter.convert(packetBuffer, 0, packetSamplesWritten, audio.getSampleRate()));
								packetSamplesWritten = 0;
								keepPowerWake();
							}
						}
					} while (nextRead > 0);
					if (bell) {
						break;
					} else {
						exit.eventWait(20);
					}
				}

				if (packetSamplesWritten > 0) {
					events.onAudioSourceHasData(converter == null ? Arrays.chunk(packetBuffer, 0, packetSamplesWritten) : converter.convert(packetBuffer, 0, packetSamplesWritten, audio.getSampleRate()));
				}
			}
		}
		stopPowerWake();
		// Release native resources
		AudioHelper.audioRecordRelease(audio);
		synchronized (_threadIsRunning) {
			_threadIsRunning.resetSync();
		}
		Audio.Companion.get(_context, _logger).releaseRecording();
	}

	private void audioFxStart(AudioRecord audio) {
		if (_audioFx == null || audio == null) {
			return;
		}
		try {
			_audioFx.start(audio);
		} catch (Throwable t) {
			_logger.logError("Failed to start audio fx", t);
		}
	}

	private void audioFxCreate(boolean noiseSuppression, boolean useAGC) {
		try {
			_audioFx = (AudioFx) Class.forName("com.loudtalks.client.ui.RecorderAudioFx16").newInstance();
			if (_audioFx == null) {
				return;
			}
			_audioFx.enableNoiseSuppression(noiseSuppression);
			_audioFx.enableAGC(useAGC);
		} catch (Throwable t) {
			_logger.logError("Failed to create audio fx", t);
		}
	}

	private void audioFxStop() {
		if (_audioFx == null) {
			return;
		}
		try {
			_audioFx.stop();
		} catch (Throwable t) {
			_logger.logError("Failed to stop audio fx", t);
		}
	}

}
