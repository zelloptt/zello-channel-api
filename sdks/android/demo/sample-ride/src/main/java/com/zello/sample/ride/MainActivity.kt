package com.zello.sample.ride

import android.Manifest
import android.animation.Animator
import android.animation.AnimatorListenerAdapter
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.content.res.Configuration
import android.media.AudioManager
import android.os.Build
import android.os.Bundle
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import android.view.Gravity
import android.view.KeyEvent
import android.view.MenuItem
import android.view.View
import android.widget.Toast
import com.google.android.gms.maps.model.LatLng
import com.zello.channel.sdk.ImageInfo
import com.zello.channel.sdk.ReconnectReason
import com.zello.channel.sdk.IncomingVoiceConfiguration
import com.zello.channel.sdk.IncomingVoiceStream
import com.zello.channel.sdk.IncomingVoiceStreamInfo
import com.zello.channel.sdk.Location
import com.zello.channel.sdk.OutgoingVoiceStream
import com.zello.channel.sdk.OutgoingVoiceStreamError
import com.zello.channel.sdk.Session
import com.zello.channel.sdk.SessionConnectError
import com.zello.channel.sdk.SessionListener
import com.zello.channel.sdk.SessionState
import kotlinx.android.synthetic.main.activity_main.*
import kotlinx.android.synthetic.main.image_message_dialog_contents.view.*
import java.util.Date

@Suppress("NON_EXHAUSTIVE_WHEN")
class MainActivity : AppCompatActivity(), SessionListener {

	private val session: Session? get() = Zello.instance.session
	private var role: Role = Role.NONE
		set(value) {
			if (field == Role.QA && value != Role.QA) {
				qaFragment?.reset()
			}
			field = value
			driverRiderFragment?.role = value
		}
	private var savedInstanceState: Bundle? = null
	private var orientation = Configuration.ORIENTATION_PORTRAIT

	private var pendingSendLocation: Boolean = false

	private val driverRiderFragment
		get() = fragmentManager.findFragmentById(R.id.driverRiderFragment) as? DriverRiderFragment
	private val qaFragment
		get() = fragmentManager.findFragmentById(R.id.qaFragment) as? QaMonitorFragment

	override fun onCreate(savedInstanceState: Bundle?) {
		super.onCreate(savedInstanceState)

		setContentView(R.layout.activity_main)
		this.savedInstanceState = savedInstanceState

		setSupportActionBar(toolbar)
		volumeControlStream = AudioManager.STREAM_MUSIC
		orientation = resources.configuration.orientation

		if (savedInstanceState != null) {
			selectRole(Role.fromInt(savedInstanceState.getInt(extraRole, SessionState.DISCONNECTED.ordinal)), true)
			if (session == null || session?.state == SessionState.DISCONNECTED) {
				if (savedInstanceState.getBoolean(extraConnected, false)) {
					attemptLogin()
				}
			}
		}
		Zello.instance.listener = this

		riderButton.setOnClickListener {
			selectRole(Role.RIDER, false)
			attemptLogin()
		}
		driverButton.setOnClickListener {
			selectRole(Role.DRIVER, false)
			attemptLogin()
		}
		qaButton.setOnClickListener {
			selectRole(Role.QA, false)
			attemptLogin()
		}
		progressCancelButton.setOnClickListener { disconnect() }

		update()
	}

	override fun onDestroy() {
		super.onDestroy()
		Zello.instance.disconnect()
	}


	override fun onSaveInstanceState(outState: Bundle) {
		super.onSaveInstanceState(outState)
		outState.putInt(extraRole, role.ordinal)
		outState.putBoolean(extraConnected, session?.state != SessionState.DISCONNECTED)
	}

	override fun onRetainCustomNonConfigurationInstance(): Any? {
		return session
	}

	override fun onConfigurationChanged(newConfig: Configuration) {
		super.onConfigurationChanged(newConfig)
		if (orientation != newConfig.orientation) {
			orientation = newConfig.orientation
			update()
			when (role) {
				Role.RIDER -> driverRiderFragment?.setupRider()
				Role.DRIVER -> driverRiderFragment?.setupDriver()
				Role.QA -> setupQa()
			}
		}
	}

	override fun onOptionsItemSelected(menuItem: MenuItem): Boolean {
		if (menuItem.itemId == android.R.id.home) {
			if (handleBackButton()) return true
		}
		return super.onOptionsItemSelected(menuItem)
	}

	override fun onKeyDown(keyCode: Int, event: KeyEvent): Boolean {
		if (keyCode == KeyEvent.KEYCODE_BACK) {
			if (handleBackButton()) return true
		}
		return super.onKeyDown(keyCode, event)
	}

	override fun onWindowFocusChanged(hasFocus: Boolean) {
		super.onWindowFocusChanged(hasFocus)

		val roleButtonSize = Utils.getRoleButtonSize(this)
		riderLayout.layoutParams?.width = roleButtonSize
		driverLayout.layoutParams?.width = roleButtonSize
		riderButton.layoutParams.height = roleButtonSize
		driverButton.layoutParams.height = roleButtonSize

		riderLayout.requestLayout()
		driverLayout.requestLayout()
		driverRiderFragment?.requestLayout()
	}

	//region SessionListener

	/**
	 * Connection process to the server has started.
	 */
	override fun onConnectStarted(session: Session) {
		update()
	}

	/**
	 * Server connection was successfully established.
	 */
	override fun onConnectSucceeded(session: Session) {
		update()
	}

	/**
	 * Server connection was ended.
	 */
	override fun onDisconnected(session: Session) {
		role = Role.NONE
		update()
		showToast(this, R.string.error_disconnected)
	}

	/**
	 * We've been disconnected, but will automatically reconnect
	 */
	override fun onSessionWillReconnect(session: Session, reason: ReconnectReason): Boolean {
		driverRiderFragment?.updatePttButton()
		return true
	}

	/**
	 * Failed to connect to the server.
	 */
	override fun onConnectFailed(session: Session, error: SessionConnectError) {
		role = Role.NONE
		update()
		showToast(this, getConnectErrorText(error, this))
	}

	/**
	 * An outgoing message failed to start.
	 */
	override fun onOutgoingVoiceError(session: Session, stream: OutgoingVoiceStream, error: OutgoingVoiceStreamError) {
		driverRiderFragment?.updatePttButton()
		showToast(this, getVoiceStreamErrorText(error, this))
	}

	/**
	 * An outgoing message state has changed.
	 */
	override fun onOutgoingVoiceStateChanged(session: Session, stream: OutgoingVoiceStream) {
		driverRiderFragment?.updatePttButton()
	}

	/**
	 * An incoming message recording progress has changed.
	 */
	override fun onOutgoingVoiceProgress(session: Session, stream: OutgoingVoiceStream, positionMs: Int) {
		driverRiderFragment?.updatePttButton()
	}

	/**
	 * Optionally route incoming audio to another destination besides the device speaker
	 */
	override fun onIncomingVoiceWillStart(session: Session, streamInfo: IncomingVoiceStreamInfo): IncomingVoiceConfiguration? {
		if (role == Role.QA) {
			val message = ChannelMessageVoice(streamInfo.sender, Date())
			qaFragment?.onNewMessage(message)
			return IncomingVoiceConfiguration(message, qaFragment?.isRealtimeMonitorEnabled ?: false)
		}

		return null
	}

	/**
	 * A new incoming message has started playing.
	 */
	override fun onIncomingVoiceStarted(session: Session, stream: IncomingVoiceStream) {
		driverRiderFragment?.updatePttButton()
	}

	/**
	 * Incoming message playback has finished.
	 */
	override fun onIncomingVoiceStopped(session: Session, stream: IncomingVoiceStream) {
		driverRiderFragment?.updatePttButton()
		if (role == Role.QA) {
			handleQaMessageEnded(stream)
		}
	}

	/**
	 * Incoming message playback progress changed.
	 */
	override fun onIncomingVoiceProgress(session: Session, stream: IncomingVoiceStream, positionMs: Int) {
		driverRiderFragment?.updatePttButton()
	}

	override fun onTextMessage(session: Session, message: String, sender: String) {
		if (role == Role.QA) {
			qaFragment?.onTextMessage(message = message, sender = sender)
		}
	}

	override fun onImageMessage(session: Session, imageInfo: ImageInfo) {
		if (imageInfo.image == null) {
			// Ignoring thumbnail
			return
		}

		val builder = AlertDialog.Builder(this)
		builder.setTitle("From ${imageInfo.sender}")
		val imageView = layoutInflater.inflate(R.layout.image_message_dialog_contents, null)
		imageView.imageView.setImageBitmap(imageInfo.image)
		builder.setView(imageView)
		builder.setPositiveButton("OK") { _, _ ->
			// Just close the dialog
		}

		val dialog = builder.create()
		dialog.show()
	}

	override fun onLocationMessage(session: Session, sender: String, location: Location) {
		if (role == Role.RIDER) {
			driverRiderFragment?.showMark(LatLng(location.latitude, location.longitude), sender)
		}
	}

	//endregion

	// region DriverRiderFragmentListener

	val driverRiderListener: DriverRiderFragmentListener by lazy {
		object : DriverRiderFragmentListener {
			override fun onCancel() {
				this@MainActivity.disconnect()
			}

			override val mayRecordAudio: Boolean
				get() = this@MainActivity.mayRecordAudio
		}
	}

	// endregion

	private fun handleQaMessageEnded(stream: IncomingVoiceStream) {
		qaFragment?.onMessageEnd(stream)
	}

	val mayRecordAudio: Boolean
		get() {
			if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
				return true
			}
			if (checkSelfPermission(android.Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
				return true
			}
			val pref = getSharedPreferences(preferencesName, 0)
			if (!pref.getBoolean(keyMicPermissionRequested, false) || shouldShowRequestPermissionRationale(android.Manifest.permission.RECORD_AUDIO)) {
				val editor = pref.edit()
				editor.putBoolean(keyMicPermissionRequested, true)
				editor.apply()
				requestPermissions(arrayOf(android.Manifest.permission.RECORD_AUDIO), REQUEST_RECORD_AUDIO)
			} else {
				showToast(this, R.string.error_voice_mic_premission)
			}
			return false
		}

	/**
	 * Callback received when a permissions request has been completed.
	 */
	override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<String>, grantResults: IntArray) {
		if (permissions.contains(Manifest.permission.ACCESS_FINE_LOCATION)) {
			val locationIndex = permissions.indexOf(Manifest.permission.ACCESS_FINE_LOCATION)
			if (grantResults[locationIndex] == PackageManager.PERMISSION_GRANTED) {
				driverRiderFragment?.sendLocationMessage()
			} else {
				pendingSendLocation = false
			}
		}
	}

	private fun attemptLogin() {
		Zello.instance.listener = this
		Zello.instance.session?.connect()
	}

	private fun selectRole(role: Role, initial: Boolean) {
		this.role = role
		when (role) {
			Role.DRIVER -> driverRiderFragment?.setupDriver()
			Role.RIDER -> driverRiderFragment?.setupRider()
			Role.QA -> setupQa()
		}
		if (!initial) {
			update()
		}
	}

	/**
	 * Shows the progress UI and hides the login form.
	 */
	private fun showScreen(view: View, show: Boolean) {
		val oldVisibility = view.visibility
		val newVisibility: Int
		newVisibility = if (oldVisibility != View.VISIBLE && show) {
			View.VISIBLE
		} else if (oldVisibility != View.GONE && !show) {
			View.GONE
		} else {
			return
		}
		view.visibility = newVisibility
		view.animate().setDuration(resources.getInteger(android.R.integer.config_shortAnimTime).toLong()).alpha((if (show) 1 else 0).toFloat()).setListener(object : AnimatorListenerAdapter() {
			override fun onAnimationEnd(animation: Animator) {
				view.visibility = newVisibility
			}
		})
	}

	@SuppressLint("RestrictedApi")
	private fun update() {
		updateTitle()
		supportActionBar?.setShowHideAnimationEnabled(false)
		val state: SessionState = Zello.instance.session?.state ?: SessionState.DISCONNECTED
		val error = state == SessionState.ERROR
		supportActionBar?.setHomeAsUpIndicator(if (state == SessionState.CONNECTED) R.mipmap.icon_cancel else 0)
		// Show the back button when anything but the first screen is shown
		supportActionBar?.setDisplayHomeAsUpEnabled(!error && (state != SessionState.DISCONNECTED || role != Role.NONE))
		// The driver sees both action bar and toolbar
		supportActionBar?.elevation = getToolbarElevation(state == SessionState.CONNECTED && role == Role.DRIVER, this)
		// The rider does not see the action bar
		if (state == SessionState.CONNECTED && (role == Role.RIDER)) {
			supportActionBar?.hide()
		} else {
			supportActionBar?.show()
		}

		showScreen(errorForm, error)
		showScreen(roleForm, !error && state == SessionState.DISCONNECTED)
		showScreen(progressForm, !error && state == SessionState.CONNECTING)
		showScreen(driverRiderForm, !error && state == SessionState.CONNECTED && role != Role.QA)
		showScreen(qaForm, !error && state == SessionState.CONNECTED && role == Role.QA)
	}

	private fun updateTitle() {
		val state: SessionState = session?.state ?: SessionState.DISCONNECTED
		val title = when (state) {
			SessionState.ERROR -> resources.getString(R.string.app_name)
			SessionState.DISCONNECTED -> resources.getString(R.string.role_form_title)
			SessionState.CONNECTED -> if (role == Role.DRIVER) resources.getString(R.string.ride_form_driver_title) else resources.getString(R.string.qa_form_title)
			SessionState.CONNECTING -> resources.getString(R.string.progress_form_title)
		}
		setTitle(title)
	}

	private fun handleBackButton(): Boolean {
		val state: SessionState = session?.state ?: SessionState.DISCONNECTED
		when (state) {
			SessionState.DISCONNECTED -> {
				if (role != Role.NONE) {
					role = Role.NONE
					update()
					return true
				}
			}
			else -> return disconnect()
		}
		return false
	}

	private fun disconnect(): Boolean {
		role = Role.NONE
		Zello.instance.disconnect()
		update()
		return true
	}

	private fun setupQa() {
		Zello.instance.establishSession(this, "", "")
	}

	companion object {
		private val TAG = "demo"

		/**
		 * ID to identity READ_CONTACTS permission request
		 */
		private val REQUEST_RECORD_AUDIO = 0

		/**
		 * Instance save related consts
		 */
		private val extraRole = "role"
		private val extraConnected = "connected"

		/**
		 * Shared preference strings
		 */
		private val preferencesName = "preferences"
		private val keyMicPermissionRequested = "mic_permission_requested"

		fun getConnectErrorText(error: SessionConnectError, context: Context): String {
			val id = when (error.code) {
				SessionConnectError.Code.CONNECT_FAILED -> R.string.error_connect_failed
				SessionConnectError.Code.BAD_CREDENTIALS -> R.string.error_connect_credentials
				SessionConnectError.Code.INVALID_ADDRESS -> R.string.error_invalid_address
				else -> null
			}
			if (id != null) {
				return context.resources.getString(id)
			} else {
				return error.toString()
			}
		}

		fun getVoiceStreamErrorText(error: OutgoingVoiceStreamError, context: Context): String {
			val id = when (error) {
				OutgoingVoiceStreamError.BUSY -> R.string.error_voice_channel_busy
				OutgoingVoiceStreamError.DEVICE_PROBLEM -> R.string.error_voice_device_problem
				OutgoingVoiceStreamError.NO_MIC_PERMISSION -> R.string.error_voice_mic_premission
				OutgoingVoiceStreamError.LISTEN_ONLY -> R.string.error_voice_listen_only
				else -> R.string.error_voice_unknown
			}
			return context.resources.getString(id)
		}

		fun getToolbarElevation(shallow: Boolean, context: Context): Float {
			return context.resources.getDimension(if (shallow) {
				R.dimen.actionbar_separator_width
			} else {
				R.dimen.actionbar_elevation
			})
		}

		fun showToast(context: Context, text: CharSequence) {
			val toast = Toast.makeText(context, text, Toast.LENGTH_SHORT)
			toast.setGravity(Gravity.CENTER, 0, 0)
			toast.show()
		}

		fun showToast(context: Context, stringId: Int) {
			showToast(context, context.resources.getString(stringId))
		}
	}

}
