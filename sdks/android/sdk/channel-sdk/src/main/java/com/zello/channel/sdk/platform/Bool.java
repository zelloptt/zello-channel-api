package com.zello.channel.sdk.platform;

/**
 * Acts as a mutable box for boolean values so we can "pass by reference"
 */
class Bool {

	protected boolean value;

	Bool(boolean value) {
		this.value = value;
	}

	boolean get() {
		return value;
	}

	void set(boolean value) {
		this.value = value;
	}

}
