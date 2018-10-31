package com.zello.channel.sdk.platform

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

internal class PowerManagerReceiver : BroadcastReceiver() {

	override fun onReceive(context: Context, intent: Intent) {
		PowerManager.get(context).onTimerBroadcast(intent)
	}

}
