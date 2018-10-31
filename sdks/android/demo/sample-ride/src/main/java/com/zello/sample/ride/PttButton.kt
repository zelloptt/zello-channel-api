package com.zello.sample.ride

import android.annotation.SuppressLint
import android.content.Context
import android.text.TextUtils
import android.util.AttributeSet
import android.view.MotionEvent
import android.view.View
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import com.zello.channel.sdk.IncomingVoiceStream
import com.zello.channel.sdk.OutgoingVoiceStream
import com.zello.channel.sdk.VoiceStreamState

/**
 * This class defines the behavior of the PTT button.
 * Two modes are supported: normal and compact.
 * All class methods are expected to be called on the UI thread.
 */
class PttButton : LinearLayout {

	interface PttButtonListener {
		fun onPttButtonDown()

		fun onPttButtonUp(cancelled: Boolean)
	}

	var listener: PttButtonListener? = null

	// Compact attribute defines what the button looks like when it's in the normal state
	var compact = false
		set (value) {
			if (value == field) return
			field = value
			update()
		}
	@Suppress("DEPRECATION")
	var textAppearance = 0
		set(value) {
			field = value
			textView?.setTextAppearance(context, value)
		}
	var imageResourceId = 0
		set(value) {
			field = value
			imageView?.setImageResource(value)
			updateTitle()
		}
	private var touchDown = false
	private var role: Role = Role.DRIVER
	private var outgoing: OutgoingVoiceStream? = null
	private var incoming: IncomingVoiceStream? = null
	private var imageView: ImageView? = null
	private var textView: TextView? = null

	constructor(context: Context) : super(context) {
		init()
	}

	constructor(context: Context, attrs: AttributeSet?) : super(context, attrs) {
		init()
	}

	constructor(context: Context, attrs: AttributeSet?, defStyleAttr: Int) : super(context, attrs, defStyleAttr) {
		init()
	}

	private fun init() {
		orientation = VERTICAL
	}

	@Suppress("DEPRECATION")
	override fun onAttachedToWindow() {
		super.onAttachedToWindow()
		imageView = ImageView(context)
		imageView?.setImageResource(imageResourceId)
		imageView?.layoutParams = LayoutParams(LayoutParams.WRAP_CONTENT, LayoutParams.WRAP_CONTENT)
		addView(imageView)
		textView = TextView(context)
		textView?.setTextAppearance(context, textAppearance)
		textView?.layoutParams = LayoutParams(LayoutParams.WRAP_CONTENT, LayoutParams.WRAP_CONTENT)
		addView(textView)
		updateTitle()
	}

	override fun onDetachedFromWindow() {
		super.onDetachedFromWindow()
		removeAllViews()
		imageView?.setImageDrawable(null)
		textView?.text = null
		textView = null
		imageView = null
		outgoing = null
		incoming = null
	}

	@SuppressLint("ClickableViewAccessibility")
	override fun onTouchEvent(event: MotionEvent): Boolean {
		when (event.action) {
			MotionEvent.ACTION_DOWN -> {
				if (!touchDown) {
					touchDown = true
					onTouchDown()
				}
			}
			MotionEvent.ACTION_CANCEL, MotionEvent.ACTION_UP -> {
				val cancelled = event.action == MotionEvent.ACTION_CANCEL
				if (touchDown) {
					touchDown = false
					onTouchUp(cancelled)
				}
			}
		}
		return super.onTouchEvent(event)
	}

	override fun setEnabled(enabled: Boolean) {
		super.setEnabled(enabled)
		if (!enabled && touchDown) {
			touchDown = false
			onTouchUp(true)
		}
	}

	fun update(role: Role, outgoing: OutgoingVoiceStream?, incoming: IncomingVoiceStream?) {
		this.role = role
		this.outgoing = outgoing
		this.incoming = incoming
		update()
	}

	private fun update() {
		isActivated = outgoing == null && incoming?.state == VoiceStreamState.ACTIVE
		updateTitle()
	}

	private fun onTouchDown() {
		val clickable = isClickable && isEnabled
		if (clickable) {
			listener?.onPttButtonDown()
		}
	}

	private fun onTouchUp(cancelled: Boolean) {
		listener?.onPttButtonUp(cancelled)
	}

	private fun updateTitle() {
		val title = createTitle()
		imageView?.visibility = if (imageView?.drawable != null && (!compact || TextUtils.isEmpty(title))) View.VISIBLE else View.GONE
		textView?.visibility = if (TextUtils.isEmpty(title)) View.GONE else View.VISIBLE
		textView?.text = title
	}

	@Suppress("NON_EXHAUSTIVE_WHEN")
	private fun createTitle(): CharSequence? {
		when (outgoing?.state) {
			VoiceStreamState.STARTING -> return createConnectingTitle()
			VoiceStreamState.ACTIVE   -> return createTalkingTitle(outgoing?.position ?: 0)
		}
		when (incoming?.state) {
			VoiceStreamState.ACTIVE -> return createPlayingTitle(incoming?.position ?: 0)
		}
		return createNormalTitle()
	}

	@Suppress("DEPRECATION")
	private fun createNormalTitle(): CharSequence? {
		return if (compact) null else getNormalText()
	}

	@Suppress("DEPRECATION")
	private fun createConnectingTitle(): CharSequence? {
		return if (compact) null else getConnectingText()
	}

	private fun createTalkingTitle(timeMs: Long): CharSequence? {
		return Utils.formatTalkTime(timeMs)
	}

	private fun createPlayingTitle(timeMs: Long): CharSequence? {
		return Utils.formatTalkTime(timeMs)
	}

	private fun getNormalText(): CharSequence? {
		return resources.getString(if (role == Role.DRIVER) R.string.talk_to_rider else R.string.talk_to_driver)
	}

	private fun getConnectingText(): CharSequence? {
		return resources.getString(R.string.talk_connecting)
	}

}
