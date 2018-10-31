package com.zello.channel.sdk.platform;

@SuppressWarnings("WeakerAccess")
class AudioConverter {

	private int _sampleRate;

	/**
	 * Creates an AudioConverter that converts *to* sampleRate
	 * @param sampleRate the destination sample rate to convert to
	 */
	AudioConverter(int sampleRate) {
		_sampleRate = sampleRate;
	}

	/**
	 * Converts a buffer of data from sampleRate to _sampleRate in the dirtiest way possible, by
	 * just dropping or multiplying samples
	 * @param data
	 * @param offset
	 * @param length
	 * @param sampleRate
	 * @return
	 */
	short[] convert(short[] data, int offset, int length, int sampleRate) {
		if (data != null && offset >= 0 && length > 0 && offset + length <= data.length && sampleRate > 0 && _sampleRate > 0) {
			int n = (int) ((long) length * _sampleRate / sampleRate);
			short[] a = Algorithms.createShortArray(n);
			int nn = length - 1;
			int ii = n - 1;
			for (int i = 0; i < n; ++i) {
				a[i] = data[offset + (int) ((long) i * nn / ii)];
			}
			return a;
		}
		return null;
	}

}
