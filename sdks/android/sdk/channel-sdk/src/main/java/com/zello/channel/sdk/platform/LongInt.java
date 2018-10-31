package com.zello.channel.sdk.platform;

class LongInt {

	private long _value = 0;

	public LongInt() {
	}

	public LongInt(long value) {
		_value = value;
	}

	public long get() {
		return _value;
	}

	public void set(long value) {
		_value = value;
	}

	public String toString() {
		return Long.toString(_value);
	}

}
