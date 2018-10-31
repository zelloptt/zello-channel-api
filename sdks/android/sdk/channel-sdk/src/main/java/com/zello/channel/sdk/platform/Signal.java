package com.zello.channel.sdk.platform;

class Signal {

	private boolean b;

	public Signal() {
	}

	public synchronized void setSync() {
		b = true;
		eventNotifyNoSync();
	}

	public void setNoSync() {
		b = true;
		eventNotifyNoSync();
	}


	public void eventWait(long timeMs) {
		if (timeMs >= 0) {
			synchronized (this) {
				eventWaitNoSync(timeMs);
			}
		}
	}

	public void eventWaitNoSync(long timeMs) {
		if (timeMs >= 0) {
			try {
				this.wait(timeMs);
			} catch (Throwable ignore) {
			}
		}
	}

	public synchronized void eventNotifySync() {
		eventNotifyNoSync();
	}

	public void eventNotifyNoSync() {
		try {
			this.notifyAll();
		} catch (Throwable ignore) {
		}
	}

	public synchronized void resetSync() {
		b = false;
	}

	public boolean isSetNoSync() {
		return b;
	}

}
