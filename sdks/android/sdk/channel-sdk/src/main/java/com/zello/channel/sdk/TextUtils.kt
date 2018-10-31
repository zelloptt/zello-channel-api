package com.zello.channel.sdk

internal class TextUtils {

	companion object {
		fun isEmpty(str: CharSequence?): Boolean {
			return str == null || str.isEmpty()
		}
	}

}
