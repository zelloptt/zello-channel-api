package com.zello.channel.sdk.platform;

import android.annotation.SuppressLint;
import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.net.wifi.WifiManager;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.os.Message;
import android.os.SystemClock;
import android.text.TextUtils;

import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;
import java.util.Map.Entry;
import java.util.Set;

@SuppressWarnings({"SynchronizationOnLocalVariableOrMethodParameter", "WeakerAccess"})
class PowerManager {

	/**
	 * Callback interface for timers.
	 */
	interface PowerManagerTimerCallback {
		void onTimerTick(long id);

		void onTimerDone(long id);
	}

	/**
	 * Callback interface for async tasks.
	 */
	interface PowerManagerAsyncCallback {
		void onAsyncRun();
	}

	public static abstract class PowerManagerCallbackEx implements PowerManagerTimerCallback {
		private Object _object;

		public PowerManagerCallbackEx() {
		}

		public PowerManagerCallbackEx(Object object) {
			_object = object;
		}

		public Object getObject() {
			return _object;
		}
	}

	private static class TimerCb {
		private PowerManagerTimerCallback _cb;
		private long _counter;

		public TimerCb(PowerManagerTimerCallback cb) {
			_cb = cb;
		}

		public PowerManagerTimerCallback getCb() {
			return _cb;
		}

		public long getCounter() {
			return _counter;
		}

		public void advance() {
			++_counter;
		}

		public boolean verify(long counter) {
			return counter == _counter;
		}

		public void reset() {
			_counter = 0;
			_cb = null;
		}
	}

	private static class TimerRunnable implements Runnable {
		private static final ArrayList<TimerRunnable> _runnables = new ArrayList<>();
		private static final int _poolSize = 5;
		private PowerManager _pm;
		private Object _debug;

		public static TimerRunnable get(PowerManager pm, String debug) {
			TimerRunnable r = null;
			synchronized (_runnables) {
				int n = _runnables.size();
				if (n > 0) {
					r = _runnables.get(n - 1);
					_runnables.remove(n - 1);
				}
				if (r == null) {
					r = new TimerRunnable();
				}
			}
			r._pm = pm;
			r._debug = debug == null ? "" : null;
			return r;
		}

		@SuppressWarnings("unchecked")
		public synchronized boolean add(String debug) {
			if (_debug != null) {
				ArrayList<String> array;
				if (_debug instanceof String) {
					array = new ArrayList<>();
					array.add((String) _debug);
					_debug = array;
				} else {
					array = (ArrayList<String>) _debug;
				}
				array.add(debug == null ? "" : null);
				return true;
			} else {
				return false;
			}
		}

		@SuppressWarnings("unchecked")
		@Override
		public void run() {
			Object debug;
			synchronized (this) {
				debug = _debug;
				_debug = null;
			}
			if (debug != null) {
				if (debug instanceof String) {
					_pm.doReleaseCpuLock((String) debug);
				} else {
					ArrayList<String> array = (ArrayList<String>) debug;
					for (int i = 0; i < array.size(); ++i) {
						_pm.doReleaseCpuLock(array.get(i));
					}
				}
			}
			_pm = null;
			_debug = null;
			synchronized (_runnables) {
				if (_runnables.size() < _poolSize) {
					_runnables.add(this);
				}
			}
		}
	}

	public static Context _context;
	private static PowerManager _manager;

	private android.os.PowerManager.WakeLock _cpuLock;
	private long _counter;
	private WifiManager.WifiLock _wifiLock;
	private long _timerCounter;
	@SuppressLint("UseSparseArrays")
	private final Map<Long, TimerCb> _timers = new HashMap<>();
	private final ThreadEx _looper;
	private TimerHandler _handler;
	private TimerRunnable _pendingTimer;

	private static final String timerIntentAction = "TIMER";
	private static final String timerIntentName = "name";
	private static final String timerIntentTimeout = "timeout";
	private static final String timerIntentCounter = "counter";
	private static final String timerIntentTick = "tick";

	private static final int lockReleaseTimeout = 1000;
	private static final int messageTimer = 1;
	private static final int messageTick = 2;

	private static final boolean _debug = false;//SystemInformation.isDebug();

	private final HashMap<String, LongInt> _map = new HashMap<>();

	public static PowerManager get(Context context) {
		if (_manager == null) {
			_context = context.getApplicationContext();
			synchronized (PowerManager.class) {
				if (_manager == null) {
					_manager = new PowerManager();
				}
			}
		}
		return _manager;
	}

	public PowerManager() {
		_looper = new ThreadEx("java timers") {
			@Override
			protected void run() {
				Looper.prepare();
				synchronized (_looper) {
					_handler = new TimerHandler(_timers);
					try {
						notifyAll();
					} catch (Throwable ignore) {
					}
				}
				Looper.loop();
			}
		};
		_looper.start();
	}

	private static class TimerHandler extends Handler {

		private final Map<Long, TimerCb> _timers;

		public TimerHandler(Map<Long, TimerCb> timers) {
			_timers = timers;
		}

		@Override
		public void handleMessage(Message msg) {
			if (msg == null) {
				return;
			}
			if (msg.what != messageTimer && msg.what != messageTick) {
				return;
			}
			Intent intent = (Intent) msg.obj;
			Uri data = intent.getData();
			if (data == null) {
				return;
			}
			String scheme = data.getScheme();
			String host = data.getHost();
			if (TextUtils.isEmpty(scheme) || TextUtils.isEmpty(host)) {
				return;
			}
			long id = 0;
			try {
				id = Long.parseLong(host);
			} catch (NumberFormatException ignore) {
			}
			if (id == 0) {
				return;
			}
			if (msg.what == messageTimer) {
				doTimer(_timers, id, intent, _context, this);
			} else {
				// Periodic ticking that does not wake the cpu
				TimerCb timer;
				synchronized (_timers) {
					timer = _timers.get(id);
				}
				if (timer != null) {
					PowerManagerTimerCallback cb = timer.getCb();
					if (cb != null) {
						long timeout = intent.getLongExtra(timerIntentTick, 0);
						if (timeout > 0) {
							sendMessageDelayed(obtainMessage(messageTick, intent), timeout);
						}
						String name = intent.getStringExtra(timerIntentName);
						new PowerManagerAsyncTaskTimerTick(_manager, id, name, cb).executeEx();
					}
				}
			}
		}
	}

	public Handler getHandler() {
		if (_handler == null) {
			synchronized (_looper) {
				if (_handler == null) {
					try {
						_looper.wait();
					} catch (Throwable ignore) {
					}
				}
			}
		}
		return _handler;
	}

	@SuppressLint("NewApi")
	public void onTimerBroadcast(Intent intent) {
		if (intent != null) {
			String action = intent.getAction();
			// Try to match the intent to one of registered timers.
			// Cancel timer if there are no matching timers; this may happen after application crashes.
			if (action != null && action.equals(timerIntentAction)) {
				Uri data = intent.getData();
				if (data != null) {
					String scheme = data.getScheme();
					String host = data.getHost();
					if (!TextUtils.isEmpty(scheme) && !TextUtils.isEmpty(host)) {
						long id = 0;
						try {
							id = Long.parseLong(host);
						} catch (NumberFormatException ignore) {
						}
						if (id != 0) {
							doTimer(_timers, id, intent, _context, getHandler());
						}
					}
				}
			}
		}
	}

	private static void doTimer(Map<Long, TimerCb> timers, long id, Intent intent, Context context, Handler handler) {
		TimerCb timer;
		long timeout = intent.getLongExtra(timerIntentTimeout, 0);
		String name = intent.getStringExtra(timerIntentName);
		synchronized (timers) {
			if (timeout < 1) {
				timer = timers.remove(id);
			} else {
				timer = timers.get(id);
				if (timer != null) {
					if (!timer.verify(intent.getLongExtra(timerIntentCounter, 0))) {
						timer = null;
					} else {
						timer.advance();
					}
				}
			}
		}
		if (timer != null) {
			if (timeout > 0) {
				// Schedule a regular handler-based timer
				intent.putExtra(timerIntentCounter, timer.getCounter());
				handler.sendMessageDelayed(handler.obtainMessage(messageTimer, intent), timeout);
				// Schedule an alarm manager timer
				PendingIntent pendingIntent = PendingIntent.getBroadcast(context, 0, intent, 0);
				setExactTimer(getAlarmManager(context), AlarmManager.ELAPSED_REALTIME_WAKEUP, SystemClock.elapsedRealtime() + timeout, pendingIntent);
			}
			// If thread pool for AsycTask is full, this throws java.util.concurrent.RejectedExecutionException
			// A crash log showed 128 threads x 10 tasks queue were full, which is extreme
			// most likely all those tasks locked up
			new PowerManagerAsyncTaskTimerDone(PowerManager.get(context), id, name, timer.getCb()).executeEx();
		}
	}

	private static AlarmManager getAlarmManager(Context context) {
		return (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
	}

	private Intent createTimerIntent(long id) {
		Uri uri = Uri.parse("id://" + id);
		Intent intent = new Intent(timerIntentAction, uri);
		intent.setClass(_context, PowerManagerReceiver.class);
		return intent;
	}

	public void initialize() {
		initialize(_context);
	}

	@SuppressLint("WakelockTimeout")
	public void acquireCpuLock(String debug) {
		final android.os.PowerManager.WakeLock lock = _cpuLock;
		if (lock != null) {
			try {
				synchronized (lock) {
					if (_counter == 0) {
						lock.acquire();
					}
					++_counter;
				}
			} catch (Throwable ignore) {
			}
			if (_debug) {
				synchronized (_map) {
					LongInt l = _map.get(debug);
					if (l == null) {
						l = new LongInt(1);
						_map.put(debug, l);
					} else {
						l.set(l.get() + 1);
					}
				}
			}
		}
	}

	public void releaseCpuLock(String debug) {
		final android.os.PowerManager.WakeLock lock = _cpuLock;
		if (lock != null) {
			TimerRunnable pending = _pendingTimer;
			if (pending == null || !pending.add(debug)) {
				TimerRunnable timer = TimerRunnable.get(this, debug);
				Handler handler = _handler;
				if (handler != null) {
					_handler.postDelayed(timer, lockReleaseTimeout);
					_pendingTimer = timer;
				} else {
					timer.run();
				}
			}
			if (_debug) {
				boolean error = false;
				synchronized (_map) {
					LongInt l = _map.get(debug);
					if (l == null) {
						error = true;
						l = new LongInt(-1);
						_map.put(debug, l);
					} else {
						if (l.get() == 1) {
							_map.remove(debug);
						} else {
							l.set(l.get() - 1);
						}
					}
				}
			}
		}
	}

	public void acquireWifiLock() {
		if (_wifiLock != null) {
			try {
				_wifiLock.acquire();
			} catch (Throwable ignore) {
			}
		}
	}

	public void releaseWifiLock() {
		if (_wifiLock != null) {
			try {
				_wifiLock.release();
			} catch (Throwable ignore) {
			}
		}
	}

	protected void doReleaseCpuLock(String debug) {
		final android.os.PowerManager.WakeLock lock = _cpuLock;
		if (lock != null) {
			try {
				synchronized (lock) {
					--_counter;
					if (_counter == 0) {
						lock.release();
					}
				}
			} catch (Throwable ignore) {
			}
		}
	}

	/*
		public void runAsync(PowerManagerAsyncCallback cb, String name) {
			new PowerManagerAsyncTaskAsync(name, cb).executeEx();
		}
	*/

	public long startRepeatingTimer(long timeout, PowerManagerTimerCallback cb, String name) {
		if (timeout > 0 && cb != null) {
			TimerCb timer = new TimerCb(cb);
			timer.advance();
			long id;
			synchronized (_timers) {
				id = ++_timerCounter;
				_timers.put(id, timer);
			}
			Intent intent = createTimerIntent(id);
			intent.putExtra(timerIntentTimeout, timeout);
			intent.putExtra(timerIntentCounter, timer.getCounter());
			intent.putExtra(timerIntentName, name);
			// Schedule a regular handler-based timer
			Handler h = getHandler();
			h.sendMessageDelayed(h.obtainMessage(messageTimer, intent), timeout);
			// Schedule an alarm manager timer
			PendingIntent pendingIntent = PendingIntent.getBroadcast(_context, 0, intent, 0);
			setExactTimer(getAlarmManager(_context), AlarmManager.ELAPSED_REALTIME_WAKEUP, SystemClock.elapsedRealtime() + timeout, pendingIntent);
			return id;
		}
		return 0;
	}

	public long startOneShotTimer(long timeout, long tickTimeout, PowerManagerTimerCallback cb, String name) {
		if (timeout > 0 && cb != null) {
			TimerCb timer = new TimerCb(cb);
			long id;
			synchronized (_timers) {
				id = ++_timerCounter;
				_timers.put(id, timer);
			}
			Intent intent = createTimerIntent(id);
			intent.putExtra(timerIntentName, name);
			Handler h = getHandler();
			if (tickTimeout > 0 && tickTimeout < timeout) {
				intent.putExtra(timerIntentTick, tickTimeout);
				h.sendMessageDelayed(h.obtainMessage(messageTick, intent), tickTimeout);
			}
			// Schedule a regular handler-based timer
			h.sendMessageDelayed(h.obtainMessage(messageTimer, intent), timeout);
			// Schedule an alarm manager timer
			PendingIntent pendingIntent = PendingIntent.getBroadcast(_context, 0, intent, 0);
			setExactTimer(getAlarmManager(_context), AlarmManager.ELAPSED_REALTIME_WAKEUP, SystemClock.elapsedRealtime() + timeout, pendingIntent);
			return id;
		}
		return 0;
	}

	public void stopTimer(long id) {
		// Should also remove a corresponding message from the handler
		// But there's no obvious way to do it because the Intent is not at hand
		TimerCb timer;
		synchronized (_timers) {
			timer = _timers.remove(id);
			if (timer != null) {
				timer.reset();
			}
		}
		stopTimer(id, timer);
	}

	public void stopAllTimers() {
		Object[] timers;
		synchronized (_timers) {
			timers = _timers.entrySet().toArray();
			_timers.clear();
		}
		int n = timers.length;
		if (n > 0) {
			for (Object entry : timers) {
				@SuppressWarnings("unchecked") Entry<Long, TimerCb> timer = (Entry<Long, TimerCb>) entry;
				stopTimer(timer.getKey(), timer.getValue());
			}
		}
	}

	private void stopTimer(long id, TimerCb timer) {
		if (timer == null) {
			return;
		}
		Intent intent = createTimerIntent(id);
		try {
			getAlarmManager(_context).cancel(PendingIntent.getBroadcast(_context, 0, intent, 0));
		} catch (Throwable ignore) {
			// SecurityException in Google Play reports
		}
	}

	private abstract static class PowerManagerAsyncTaskTimer extends PowerManagerAsyncTask {
		protected long _id;
		protected PowerManagerTimerCallback _cb;

		protected PowerManagerAsyncTaskTimer(PowerManager pm, long id, String name, PowerManagerTimerCallback cb) {
			super(pm, name);
			_id = id;
			_cb = cb;
		}
	}

	private static class PowerManagerAsyncTaskTimerDone extends PowerManagerAsyncTaskTimer {

		protected PowerManagerAsyncTaskTimerDone(PowerManager pm, long id, String name, PowerManagerTimerCallback cb) {
			super(pm, id, name, cb);
		}

		@Override
		protected void run() {
			PowerManagerTimerCallback cb = _cb;
			if (cb != null) {
				cb.onTimerDone(_id);
			}
		}

		@Override
		protected String getType() {
			return "timer done";
		}

	}

	private static class PowerManagerAsyncTaskTimerTick extends PowerManagerAsyncTaskTimer {

		protected PowerManagerAsyncTaskTimerTick(PowerManager pm, long id, String name, PowerManagerTimerCallback cb) {
			super(pm, id, name, cb);
		}

		@Override
		protected void run() {
			_cb.onTimerTick(_id);
		}

		@Override
		protected String getType() {
			return "timer tick";
		}

	}

	private static class PowerManagerAsyncTaskAsync extends PowerManagerAsyncTask {

		private PowerManagerAsyncCallback _cb;

		public PowerManagerAsyncTaskAsync(PowerManager pm, String name, PowerManagerAsyncCallback cb) {
			super(pm, name);
			_cb = cb;
		}

		@Override
		protected void run() {
			_cb.onAsyncRun();
		}

		@Override
		protected String getType() {
			return "async";
		}

	}

	@SuppressWarnings("unused")
	public void reportBugs() {
		if (_debug) {
			synchronized (_map) {
				StringBuilder s = new StringBuilder("(POWER) CPU lock stats:");
				Set<Entry<String, LongInt>> set = _map.entrySet();
				if (set.isEmpty()) {
					s.append("\n             * empty");
				} else {
					for (Entry<String, LongInt> entry : set) {
						s.append("\n             * ").append(entry.getValue()).append(" \t").append(entry.getKey());
					}
				}
			}
		}
	}

	public long getCpuLockCount() {
		final android.os.PowerManager.WakeLock lock = _cpuLock;
		if (lock != null) {
			synchronized (lock) {
				return _counter;
			}
		}
		return -1;
	}

	public void initialize(Context context) {
		final android.os.PowerManager.WakeLock lock = ((android.os.PowerManager) context.getSystemService(Context.POWER_SERVICE)).newWakeLock(android.os.PowerManager.PARTIAL_WAKE_LOCK, "com.loudtalks.cpu");
		lock.setReferenceCounted(false);
		_cpuLock = lock;
		try {
			_wifiLock = ((WifiManager) context.getApplicationContext().getSystemService(Context.WIFI_SERVICE)).createWifiLock(WifiManager.WIFI_MODE_FULL, "com.loudtalks.wifi");
		} catch (Throwable ignored) {
			// VerifyError on some devices (Fly) according to crash reports
		}
		if (_wifiLock != null) {
			_wifiLock.setReferenceCounted(true);
		}
	}

	private static Method _methodSetExact = null;
	private static boolean _triedSetExact = false;

	public static void setExactTimer(AlarmManager am, int type, long triggerAtMillis, PendingIntent operation) {
		if (!_triedSetExact) {
			if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
				try {
					_methodSetExact = AlarmManager.class.getMethod(Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? "setExactAndAllowWhileIdle" : "setExact", Integer.TYPE, Long.TYPE, PendingIntent.class);
				} catch (Throwable ignored) {
				}
			}
			_triedSetExact = true;
		}
		if (_methodSetExact != null) {
			try {
				_methodSetExact.invoke(am, type, triggerAtMillis, operation);
			} catch (Throwable t) {
			}
		} else {
			am.set(type, triggerAtMillis, operation);
		}
	}

}
