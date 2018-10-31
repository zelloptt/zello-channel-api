package com.zello.sample.ride

import android.animation.Animator
import android.animation.AnimatorListenerAdapter
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.content.res.Configuration
import android.media.AudioManager
import android.os.Build
import android.os.Bundle
import android.support.v7.app.AppCompatActivity
import android.util.Log
import android.view.Gravity
import android.view.KeyEvent
import android.view.MenuItem
import android.view.View
import android.widget.Toast
import com.google.android.gms.maps.CameraUpdateFactory
import com.google.android.gms.maps.GoogleMap
import com.google.android.gms.maps.OnMapReadyCallback
import com.google.android.gms.maps.model.LatLng
import com.zello.channel.sdk.ReconnectReason
import com.zello.channel.sdk.IncomingVoiceConfiguration
import com.zello.channel.sdk.IncomingVoiceStream
import com.zello.channel.sdk.IncomingVoiceStreamInfo
import com.zello.channel.sdk.OutgoingVoiceConfiguration
import com.zello.channel.sdk.OutgoingVoiceStream
import com.zello.channel.sdk.OutgoingVoiceStreamError
import com.zello.channel.sdk.Session
import com.zello.channel.sdk.SessionConnectError
import com.zello.channel.sdk.SessionListener
import com.zello.channel.sdk.SessionState
import com.zello.channel.sdk.VoiceSink
import com.zello.channel.sdk.VoiceSource
import com.zello.channel.sdk.VoiceStreamState
import kotlinx.android.synthetic.main.activity_main.*
import java.util.Date

@Suppress("NON_EXHAUSTIVE_WHEN")
class MainActivity : AppCompatActivity(), SessionListener, OnMapReadyCallback, PttButton.PttButtonListener {

	private var session: Session? = null
	private var role: Role = Role.NONE
		set(value) {
			if (field == Role.QA && value != Role.QA) {
				qaFragment?.reset()
			}
			field = value
		}
	private var mapReady: Boolean = false
	private var savedInstanceState: Bundle? = null
	private var map: GoogleMap? = null
	private var mapConfigured: Boolean = false
	private var orientation = Configuration.ORIENTATION_PORTRAIT

	private var incomingStream: IncomingVoiceStream? = null
	private var outgoingStream: OutgoingVoiceStream? = null

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
			session = lastCustomNonConfigurationInstance as? Session
			selectRole(Role.fromInt(savedInstanceState.getInt(extraRole, SessionState.DISCONNECTED.ordinal)), true)
			if (session == null || session?.state == SessionState.DISCONNECTED) {
				if (savedInstanceState.getBoolean(extraConnected, false)) {
					attemptLogin()
				}
			} else {
				session?.sessionListener = this
			}
		}

		rideActionCancel.setOnClickListener {
			disconnect()
		}

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
		talkButtonPortrait.listener = this
		talkButtonPortrait.textAppearance = R.style.TextAppearance_Button_Ptt
		talkButtonPortrait.imageResourceId = R.drawable.ptt_icon
		talkButtonLandscape.compact = true
		talkButtonLandscape.listener = this
		talkButtonLandscape.textAppearance = R.style.TextAppearance_Button_Ptt
		talkButtonLandscape.imageResourceId = R.drawable.ptt_icon
		honkButtonPortrait.setOnClickListener { honk() }
		honkButtonLandscape.setOnClickListener { honk() }

		update()
	}

	override fun onDestroy() {
		super.onDestroy()
		(talkButtonPortrait as PttButton).listener = null
		(talkButtonLandscape as PttButton).listener = null
		session?.sessionListener = null
		session?.disconnect()
		if (mapReady) {
			try {
				rideMap.onDestroy()
			} catch (ignore: Throwable) {
			}
		}
	}

	override fun onResume() {
		super.onResume()
		if (mapReady) {
			try {
				rideMap.onResume()
			} catch (ignore: Throwable) {
			}
		} else {
			initMap(savedInstanceState, true)
		}
	}

	override fun onPause() {
		super.onPause()
		if (mapReady) {
			try {
				rideMap?.onPause()
			} catch (ignore: Throwable) {
			}
		}
	}

	override fun onLowMemory() {
		super.onLowMemory()
		if (mapReady) {
			try {
				rideMap.onLowMemory()
			} catch (ignore: Throwable) {
			}
		}
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
				Role.RIDER -> setupRider()
				Role.DRIVER -> setupDriver()
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
		rideBottomPanel.requestLayout()
	}

	override fun onPttButtonDown() {
		if (session?.state != SessionState.CONNECTED) return
		if (mayRecordAudio()) {
			outgoingStream = session?.startVoiceMessage()
		}
	}

	override fun onPttButtonUp(cancelled: Boolean) {
		outgoingStream?.stop()
	}

	fun honk() {
		if (outgoingStream != null) {
			return
		}
		val session = session ?: return

		val voiceSource = object: VoiceSource {
			var stopped = false

			override fun startProvidingAudio(sink: VoiceSink, sampleRate: Int, stream: OutgoingVoiceStream) {
				val honkFd = resources.openRawResourceFd(R.raw.honk)
				val honkReader = WavReader(honkFd)
				fun wavReaderCallback(status: WavReader.ReadStatus, samples: ShortArray?) {
					if (stopped) return

					when (status) {
						WavReader.ReadStatus.Done -> {
							if (samples != null && samples.isNotEmpty()) {
								sink.provideAudio(samples)
							}
							sink.stop()
							outgoingStream?.stop()
						}
						WavReader.ReadStatus.More -> {
							if (samples != null && samples.isNotEmpty()) {
								sink.provideAudio(samples)
							}
						}
						WavReader.ReadStatus.Error -> {
							Log.w(TAG, "Error reading honk.wav")
							sink.stop()
							outgoingStream?.stop()
						}
					}
				}
				honkReader.read(::wavReaderCallback)
			}

			override fun stopProvidingAudio(sink: VoiceSink) {
				stopped = true
			}

		}

		// Read the sample rate from the audio file
		val honkFd = resources.openRawResourceFd(R.raw.honk)
		val honkReader = WavReader(honkFd)
		val sampleRate = honkReader.sampleRate
		honkFd.close()
		outgoingStream = session.startVoiceMessage(OutgoingVoiceConfiguration(voiceSource, sampleRate)) ?: return
	}

	override fun onMapReady(googleMap: GoogleMap?) {
		map = googleMap
		configureMap()
	}

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
		incomingStream = null
		outgoingStream = null
		role = Role.NONE
		update()
		this.session = null
		showToast(this, R.string.error_disconnected)
	}

	/**
	 * We've been disconnected, but will automatically reconnect
	 */
	override fun onSessionWillReconnect(session: Session, reason: ReconnectReason): Boolean {
		incomingStream = null
		outgoingStream = null
		updatePttButton()
		return true
	}

	/**
	 * Failed to connect to the server.
	 */
	override fun onConnectFailed(session: Session, error: SessionConnectError) {
		role = Role.NONE
		update()
		this.session = null
		showToast(this, getConnectErrorText(error, this))
	}

	/**
	 * An outgoing message failed to start.
	 */
	override fun onOutgoingVoiceError(session: Session, stream: OutgoingVoiceStream, error: OutgoingVoiceStreamError) {
		if (outgoingStream == stream) {
			outgoingStream = null
		}
		updatePttButton()
		showToast(this, getVoiceStreamErrorText(error, this))
	}

	/**
	 * An outgoing message state has changed.
	 */
	override fun onOutgoingVoiceStateChanged(session: Session, stream: OutgoingVoiceStream) {
		if (stream == outgoingStream && stream.state == VoiceStreamState.STOPPED) {
			outgoingStream = null
		}
		updatePttButton()
	}

	/**
	 * An incoming message recording progress has changed.
	 */
	override fun onOutgoingVoiceProgress(session: Session, stream: OutgoingVoiceStream, positionMs: Int) {
		updatePttButton()
	}

	/**
	 * Optionally route incoming audio to another destination besides the device speaker
	 */
	override fun onIncomingVoiceWillStart(session: Session, streamInfo: IncomingVoiceStreamInfo): IncomingVoiceConfiguration? {
		if (role == Role.QA) {
			val message = ChannelMessage(streamInfo.sender, Date())
			qaFragment?.onNewMessage(message)
			return IncomingVoiceConfiguration(message, qaFragment?.isRealtimeMonitorEnabled ?: false)
		}

		return null
	}

	/**
	 * A new incoming message has started playing.
	 */
	override fun onIncomingVoiceStarted(session: Session, stream: IncomingVoiceStream) {
		incomingStream = stream
		updatePttButton()
	}

	/**
	 * Incoming message playback has finished.
	 */
	override fun onIncomingVoiceStopped(session: Session, stream: IncomingVoiceStream) {
		incomingStream = null
		updatePttButton()
		if (role == Role.QA) {
			handleQaMessageEnded(stream)
		}
	}

	/**
	 * Incoming message playback progress changed.
	 */
	override fun onIncomingVoiceProgress(session: Session, stream: IncomingVoiceStream, positionMs: Int) {
		if (incomingStream == stream) updatePttButton()
	}

	private fun handleQaMessageEnded(stream: IncomingVoiceStream) {
		qaFragment?.onMessageEnd(stream)
	}

	private fun mayRecordAudio(): Boolean {
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
	}

	private fun attemptLogin() {
		session?.sessionListener = this
		session?.connect()
	}

	private fun selectRole(role: Role, initial: Boolean) {
		this.role = role
		when (role) {
			Role.DRIVER -> setupDriver()
			Role.RIDER -> setupRider()
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
		val state: SessionState = session?.state ?: SessionState.DISCONNECTED
		val error = state == SessionState.ERROR
		supportActionBar?.setHomeAsUpIndicator(if (state == SessionState.CONNECTED) R.mipmap.icon_cancel else 0)
		// Show the back button when anything but the first screen is shown
		supportActionBar?.setDisplayHomeAsUpEnabled(!error && (state != SessionState.DISCONNECTED || role != Role.NONE))
		// The driver sees both action bar and toolbar
		supportActionBar?.elevation = getToolbarElevation(state == SessionState.CONNECTED && role == Role.DRIVER, this)
		// The rider does not see the action bar
		if (state == SessionState.CONNECTED && (role == Role.RIDER || !isPortrait())) {
			supportActionBar?.hide()
		} else {
			supportActionBar?.show()
		}

		showScreen(errorForm, error)
		showScreen(roleForm, !error && state == SessionState.DISCONNECTED)
		showScreen(progressForm, !error && state == SessionState.CONNECTING)
		showScreen(rideForm, !error && state == SessionState.CONNECTED && role != Role.QA)
		showScreen(qaForm, !error && state == SessionState.CONNECTED && role == Role.QA)
	}

	private fun updatePttButton() {
		if (role == Role.DRIVER) {
			if (isPortrait()) {
				honkButtonPortrait.visibility = View.VISIBLE
			} else {
				honkButtonLandscape.visibility = View.VISIBLE
			}
		} else {
			honkButtonPortrait.visibility = View.GONE
			honkButtonLandscape.visibility = View.GONE
		}
		val button = if (isPortrait()) talkButtonPortrait else talkButtonLandscape
		(button as PttButton).update(role, outgoingStream, incomingStream)
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
		session?.sessionListener = null
		session?.disconnect()
		update()
		return true
	}

	private fun initMap(savedInstanceState: Bundle?, resume: Boolean) {
		if (!Utils.areGooglePlayServicesEnabled(this)) {
			return
		}

		try {
			rideMap.onCreate(savedInstanceState)
			rideMap.getMapAsync(this)

			if (resume) {
				rideMap.onResume()
			}
			mapReady = true
		} catch (ignore: Throwable) {
		}
	}

	private fun configureMap() {
		if (mapConfigured || map == null) {
			return
		}

		Utils.hideMapLogo(rideMap)

		map?.isIndoorEnabled = true
		map?.isTrafficEnabled = true
		map?.mapType = com.google.android.gms.maps.GoogleMap.MAP_TYPE_NORMAL
		val settings = map?.uiSettings
		settings?.isCompassEnabled = true
		settings?.isMyLocationButtonEnabled = false
		settings?.isZoomControlsEnabled = false
		settings?.isRotateGesturesEnabled = true
		settings?.isScrollGesturesEnabled = true
		settings?.isTiltGesturesEnabled = false
		settings?.isZoomGesturesEnabled = true

		rideMap.visibility = View.VISIBLE
		map?.moveCamera(CameraUpdateFactory.newLatLng(latlng))
		map?.animateCamera(CameraUpdateFactory.newLatLngZoom(latlng, mapZoomLevel), mapZoomAnimationDuration, null)

		mapConfigured = true
	}

	// Called to set up the screen when the driver mode is activated
	private fun setupDriver() {
		if (session == null) {
			session = Session.Builder(this, serverAddress, devAuthToken, channelName).
					setUsername("", "").build()
		}

		updatePttButton()
		val portrait = isPortrait()
		rideText1.text = resources.getString(R.string.ride_driver_text1)
		rideText2.text = resources.getString(R.string.ride_driver_text2)
		rideActionNavigatePortrait.visibility = if (portrait) View.VISIBLE else View.GONE
		rideActionNavigateLandscape.visibility = if (!portrait) View.VISIBLE else View.GONE
		rideActionCancel.visibility = if (!portrait) View.VISIBLE else View.GONE
		rideBottomDriverPanel.visibility = View.VISIBLE
		rideBottomRiderPanel.visibility = View.GONE
		talkButtonPortraitContainer.visibility = if (portrait) View.VISIBLE else View.GONE
		talkButtonLandscape.visibility = if (!portrait) View.VISIBLE else View.GONE
		honkButtonLandscape.visibility = if (portrait) View.GONE else View.VISIBLE
	}

	// Called to set up the screen when the rider mode is activated
	private fun setupRider() {
		if (session == null) {
			session = Session.Builder(this, serverAddress, devAuthToken, channelName).
					setUsername("", "").build()
		}

		updatePttButton()
		val portrait = isPortrait()
		rideText1.text = resources.getString(R.string.ride_rider_text1)
		rideText2.text = resources.getString(R.string.ride_rider_text2)
		rideActionNavigatePortrait.visibility = View.GONE
		rideActionNavigateLandscape.visibility = View.GONE
		rideActionCancel.visibility = View.VISIBLE
		rideBottomDriverPanel.visibility = View.GONE
		rideBottomRiderPanel.visibility = View.VISIBLE
		talkButtonPortraitContainer.visibility = if (portrait) View.VISIBLE else View.GONE
		talkButtonLandscape.visibility = if (!portrait) View.VISIBLE else View.GONE
		honkButtonLandscape.visibility = View.GONE
	}

	private fun setupQa() {
		if (session == null) {
			session = Session.Builder(this, serverAddress, devAuthToken, channelName).build()
		}
	}

	private fun isPortrait(): Boolean = orientation != Configuration.ORIENTATION_LANDSCAPE

	companion object {
		private val TAG = "demo"

		/**
		 * ID to identity READ_CONTACTS permission request
		 */
		private val REQUEST_RECORD_AUDIO = 0

		/**
		 * Hardcoded server URL
		 */
		// TODO: Clear before shipping
		private val serverAddress = "wss://zellowork.io/ws/mesh"

		// TODO: Remove before shipping
		private val devAuthToken = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJXbGM2YldWemFEb3ouZ2FqbWlhakhnV3ZhS3VNUnJIakdwYnM5SEdTWEZZaGJzZWZxWmVTYlwvMzA9IiwiZXhwIjoxNTM5OTc5Mjc1LCJhenAiOiJkZXYifQ==.DR46Q8lq5U22m3HuUtK+OdMDMchc3eF+4byGEUmgkdJS1ieEBZ5WJKz/p2aEM19qzCV0NXCsWSc6ZlsDxehrhp+XaBzbnFsyJizG0XwKe5lhgyjHv07oF1uEo82CJqE55nax4EKghPuia9Q+WjlGXzSSRG0djCIN+hyUB/8AvAf8TGTgactC0YzgkVKB06ELOu2MLr6x4LHQvmZMFpD+s9IVKaADwwq8sAf45jDuo272//z50+wm9q+XsfiXs1jzALTH/2elVq5xPuSMvinwp1VjYxLdKm9e2K5+Ski0K0VJ7PQAOOk821DNtDATHlM7V5qDmR6LPkmSGkxBnaDtkA=="

		/**
		 * Hardcoded channel name
		 */
		// TODO: Clear before shipping
		private val channelName = "gregTest"

		/**
		 * Austin
		 */
		private val latlng = LatLng(30.2672, -97.7431)
		private val mapZoomLevel = 10f
		private val mapZoomAnimationDuration = 1

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
