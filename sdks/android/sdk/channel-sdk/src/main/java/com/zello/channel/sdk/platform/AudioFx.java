package com.zello.channel.sdk.platform;

import android.media.AudioRecord;

interface AudioFx {

	void enableNoiseSuppression(boolean enable);

	void enableAGC(boolean enable);

	void start(AudioRecord audio);

	void stop();

}
