package com.zello.sample.ride

import android.Manifest
import android.annotation.SuppressLint
import android.app.Fragment
import android.content.Context
import android.content.pm.PackageManager
import android.content.res.Resources
import android.graphics.BitmapFactory
import android.os.Bundle
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.appcompat.widget.VectorEnabledTintResources
import android.util.Log
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.view.inputmethod.InputMethodManager
import com.google.android.gms.maps.CameraUpdateFactory
import com.google.android.gms.maps.GoogleMap
import com.google.android.gms.maps.OnMapReadyCallback
import com.google.android.gms.maps.model.LatLng
import com.google.android.gms.maps.model.MarkerOptions
import com.zello.channel.sdk.SentLocationCallback
import com.zello.channel.sdk.Session
import com.zello.channel.sdk.SessionState
import kotlinx.android.synthetic.main.driver_rider.*

interface DriverRiderFragmentListener {
	val mayRecordAudio: Boolean
	fun onCancel()
}

class DriverRiderFragment: Fragment(), OnMapReadyCallback, PttButton.PttButtonListener {

	var listener: DriverRiderFragmentListener? = null

	var role: Role = Role.NONE
	private var savedInstanceState: Bundle? = null
	private var mapReady: Boolean = false
	private var map: GoogleMap? = null
	private var mapConfigured: Boolean = false

	private var mResources: Resources? = null
	@SuppressLint("RestrictedApi")
	private fun getAppResources(): Resources? {
		if (mResources == null && VectorEnabledTintResources.shouldBeUsed()) {
			mResources = VectorEnabledTintResources(activity, getResources())
		}
		return if (mResources == null) getResources() else mResources
	}

	// region Fragment lifecycle

	override fun onAttach(context: Context?) {
		super.onAttach(context)

		// Get listener for callbacks
		listener = (context as? MainActivity)?.driverRiderListener
	}

	override fun onCreateView(inflater: LayoutInflater?, container: ViewGroup?, savedInstanceState: Bundle?): View? {
		if (inflater == null) {
			return super.onCreateView(inflater, container, savedInstanceState)
		}
		this.savedInstanceState = savedInstanceState

		return inflater.inflate(R.layout.driver_rider, container)
	}

	override fun onViewCreated(view: View?, savedInstanceState: Bundle?) {
		super.onViewCreated(view, savedInstanceState)

		// Attach event listeners
		rideActionCancel?.setOnClickListener {
			listener?.onCancel()
		}
		honkButtonPortrait.setOnClickListener { Zello.instance.honk(getAppResources()) }
		sendFeedbackButton.setOnClickListener {
			sendFeedback(sendFeedbackField.text.toString())
			sendFeedbackField.text.clear()
			val imm = activity.getSystemService(Context.INPUT_METHOD_SERVICE) as InputMethodManager
			imm.hideSoftInputFromWindow(sendFeedbackField.windowToken, 0)
		}
		carImageButton.setOnClickListener { sendCarImage() }
		rideActionNavigatePortrait.setOnClickListener { sendLocation() }

		// View touchup
		talkButtonPortrait.listener = this
		talkButtonPortrait.textAppearance = R.style.TextAppearance_Button_Ptt
		talkButtonPortrait.imageResourceId = R.drawable.ptt_icon

	}

	override fun onDestroyView() {
		super.onDestroyView()

		(talkButtonPortrait as PttButton).listener = null
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

	fun requestLayout() {
		rideBottomPanel.requestLayout()
	}

	private fun initMap(savedInstanceState: Bundle?, resume: Boolean) {
		if (!Utils.areGooglePlayServicesEnabled(activity)) {
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

	private fun sendCarImage() {
		val image = BitmapFactory.decodeResource(resources, R.drawable.smolcar)
		Zello.instance.sendImage(image)
	}

	private fun sendFeedback(message: String) {
		Zello.instance.sendText(message)
	}

	private var pendingSendLocation: Boolean = false
	private fun sendLocation() {
		if (pendingSendLocation) return

		pendingSendLocation = true
		// Check if we have location permission
		if (ContextCompat.checkSelfPermission(activity, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_DENIED
			&& ContextCompat.checkSelfPermission(activity, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_DENIED) {
			// Prompt for location permission
			ActivityCompat.requestPermissions(activity, arrayOf(Manifest.permission.ACCESS_FINE_LOCATION), 0)
			return
		}

		sendLocationMessage()
	}

	fun sendLocationMessage() {
		Zello.instance.sendLocation(SentLocationCallback { _, error ->
			if (error != null) {
				Log.w(TAG, "Failed to send location: ${error.errorMessage}")
			}
			pendingSendLocation = false
		})
	}

	// endregion

	fun updatePttButton() {
		if (role == Role.DRIVER) {
			honkButtonPortrait.visibility = View.VISIBLE
		}

		(talkButtonPortrait as PttButton).update(role, Zello.instance.outgoingStream, Zello.instance.incomingStream)
	}

	// region MapReadyCallback

	override fun onMapReady(googleMap: GoogleMap?) {
		map = googleMap
		configureMap()
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

	// endregion

	// region PttButtonListener

	override fun onPttButtonDown() {
		if (listener?.mayRecordAudio == true) {
			Zello.instance.startVoiceMessage()
		}
	}

	override fun onPttButtonUp(cancelled: Boolean) {
		Zello.instance.outgoingStream?.stop()
	}

	// endregion

	// Called to set up the screen when the driver mode is activated
	fun setupDriver() {
		Zello.instance.establishSession(activity, "", "")

		updatePttButton()
		rideText1.text = resources.getString(R.string.ride_driver_text1)
		rideText2.text = resources.getString(R.string.ride_driver_text2)
		rideActionNavigatePortrait.visibility = View.VISIBLE
		rideActionCancel.visibility = View.GONE
		rideBottomDriverPanel.visibility = View.VISIBLE
		rideBottomRiderPanel.visibility = View.GONE
		talkButtonPortraitContainer.visibility = View.VISIBLE
		sendFeedbackContainer.visibility = View.GONE
	}

	// Called to set up the screen when the rider mode is activated
	fun setupRider() {
		Zello.instance.establishSession(activity, "", "")

		updatePttButton()
		val portrait = true
		rideText1.text = resources.getString(R.string.ride_rider_text1)
		rideText2.text = resources.getString(R.string.ride_rider_text2)
		rideActionNavigatePortrait.visibility = View.GONE
		rideActionCancel.visibility = View.VISIBLE
		rideBottomDriverPanel.visibility = View.GONE
		rideBottomRiderPanel.visibility = View.VISIBLE
		talkButtonPortraitContainer.visibility = if (portrait) View.VISIBLE else View.GONE
		sendFeedbackContainer.visibility = View.VISIBLE
	}


	fun showMark(position: LatLng, title: String) {
		map?.addMarker(MarkerOptions().position(position).title(title))
		map?.moveCamera(CameraUpdateFactory.newLatLng(position))
		map?.animateCamera(CameraUpdateFactory.newLatLngZoom(position, mapZoomLevel), mapZoomAnimationDuration, null)
	}

	companion object {
		private val TAG = "DriverRiderFragment"

		/**
		 * Austin
		 */
		private val latlng = LatLng(30.2672, -97.7431)
		private val mapZoomLevel = 10f
		private val mapZoomAnimationDuration = 1
	}
}
