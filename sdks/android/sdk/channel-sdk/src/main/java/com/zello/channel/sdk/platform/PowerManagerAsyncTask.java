package com.zello.channel.sdk.platform;

import android.annotation.SuppressLint;
import android.os.AsyncTask;

@SuppressWarnings("WeakerAccess")
@SuppressLint("NewApi")
abstract class PowerManagerAsyncTask extends AsyncTask<Object, Void, Void> {

	private PowerManager _pm;
	private String _name;

	abstract protected void run();

	abstract protected String getType();


	PowerManagerAsyncTask(PowerManager pm, String name) {
		super();
		_pm = pm;
		_name = name;
		acquire();
	}

	public void acquire() {
		_pm.acquireCpuLock(toString());
	}

	public void release() {
		_pm.releaseCpuLock(toString());
	}

	void executeEx(Object... params) {
		try {
			executeOnExecutor(THREAD_POOL_EXECUTOR, params);
		} catch (Throwable ignore) {
			try {
				super.execute(params);
			} catch (Throwable t) {
				release();
			}
		}
	}

	@Override
	protected Void doInBackground(Object[] cb) {
		try {
			run();
		} catch (Throwable ignore) {
		} finally {
			release();
		}
		return null;
	}

	@Override
	public String toString() {
		return getType() + ": " + _name;
	}

}
