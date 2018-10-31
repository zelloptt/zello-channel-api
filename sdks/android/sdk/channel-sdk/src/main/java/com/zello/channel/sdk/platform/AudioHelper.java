package com.zello.channel.sdk.platform;

import android.media.AudioRecord;
import android.media.AudioTrack;

@SuppressWarnings("WeakerAccess")
class AudioHelper {

	static void audioTrackStop(AudioTrack audioTrack) {
		try {
			audioTrack.stop();
		} catch (Throwable t) {
		}
	}

	static void audioTrackPlay(AudioTrack audioTrack) {
		try {
			audioTrack.play();
		} catch (Throwable t) {
		}
	}

	static void audioTrackPause(AudioTrack audioTrack) {
		try {
			audioTrack.pause();
		} catch (Throwable t) {
		}
	}

	static void audioTrackFlush(AudioTrack audioTrack) {
		try {
			audioTrack.flush();
		} catch (Throwable t) {
		}
	}

	static void audioTrackRelease(AudioTrack audio) {
		if (audio != null) {
			try {
				audio.release();
			} catch (Throwable t) {
			}
		}
	}

	static void audioRecordStop(AudioRecord audio) {
		if (audio != null) {
			try {
				audio.stop();
			} catch (Throwable t) {
			}
		}
	}

	static void audioRecordRelease(AudioRecord audio) {
		if (audio == null) {
			return;
		}

		try {
			audio.release();
		} catch (Throwable t) {
		}
	}

}
