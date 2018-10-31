package com.zello.channel.sdk.platform;

abstract class ThreadEx {

	protected abstract void run();

	private Thread thread = null;
	private Signal exit = new Signal();
	private boolean busy = false, busyForced = false;
	private String name = "";

	public ThreadEx(String name) {
		this.name = name;
	}

	public boolean isBusy() {
		return busyForced;
	}

	public void setExitSignal(Signal exit) {
		this.exit = exit;
	}

	public Signal getExitSignal() {
		return exit;
	}

	public Thread getThreadObject() {
		return thread;
	}

	public void forceBusy(boolean busy) {
		busyForced = busy;
	}

	public boolean isAlive() {
		Thread t = thread;
		return t != null && t.isAlive();
	}

	public boolean start() {
		synchronized (this) {
			if (busy) {
				return false;
			} else {
				busy = true;
				busyForced = busy;
				exit.resetSync();
				final ThreadEx t = this;
				thread = new Thread(new Runnable() {
					public void run() {
						t.run();
						busy = false;
						busyForced = busy;
					}
				}, name);
				thread.start();
				return true;
			}
		}
	}

	public void stopAsync() {
		exit.setSync();
	}

	public void stop() {
		synchronized (this) {
			if (thread != null) {
				exit.setSync();
				try {
					thread.join();
				} catch (InterruptedException e) {
				}
				// thread.stop();
				thread = null;
				busy = false;
				busyForced = busy;
			}
		}
	}

	public void join() {
		Thread t = null;
		synchronized (this) {
			t = thread;
		}
		if (t != null && t.isAlive()) {
			try {
				t.join();
			} catch (InterruptedException e) {
			}
		}
	}

	public void join(long timeout) {
		Thread t = null;
		synchronized (this) {
			t = thread;
		}
		if (t != null && t.isAlive()) {
			try {
				t.join(timeout);
			} catch (InterruptedException e) {
			}
		}
	}

	public void interrupt() {
		Thread t = thread;
		if (t != null) {
			try {
				t.interrupt();
			} catch (Throwable e) {
			}
		}
	}

	public static void sleep(long time) {
		if (time >= 0) {
			try {
				Thread.sleep(time);
			} catch (InterruptedException e) {
			}
		}
	}

}
