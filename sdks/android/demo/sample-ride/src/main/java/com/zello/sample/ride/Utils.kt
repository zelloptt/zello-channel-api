package com.zello.sample.ride

import android.app.Activity
import android.content.Context
import android.view.View
import android.view.ViewGroup

import android.widget.ImageView
import com.google.android.gms.common.ConnectionResult
import com.google.android.gms.common.GooglePlayServicesUtil
import com.google.android.gms.maps.MapView
import java.lang.StringBuilder
import kotlin.math.min

class Utils {

	companion object {

		fun getRoleButtonSize(activity: Activity): Int {
			val view = activity.window?.peekDecorView() ?: return 0
			val size = min(view.width, view.height)
			return (size - 3 * activity.resources.getDimensionPixelOffset(R.dimen.form_margin)) / 2
		}

		@Suppress("DEPRECATION")
		fun areGooglePlayServicesEnabled(context: Context): Boolean {
			try {
				val resultCode = GooglePlayServicesUtil.isGooglePlayServicesAvailable(context)
				return resultCode == ConnectionResult.SUCCESS
			} catch (ignored: Throwable) {
				// ExceptionInInitializerError in Google Play
			}
			return false
		}

		fun hideMapLogo(map: MapView) {
			val logo = findImageView(map) ?: return
			logo.visibility = View.GONE
		}

		private fun findImageView(view: View): ImageView? {
			if (view is ImageView) {
				return view
			}
			if (view is ViewGroup) {
				for (i in 0 until view.childCount) {
					val image = findImageView(view.getChildAt(i))
					if (image != null) {
						return image
					}
				}
			}
			return null
		}

		fun formatTalkTime(timeMs: Long): CharSequence {
			val s = StringBuilder(if (timeMs >= 0) "" else "-")
			val duration = if (timeMs < 0) -timeMs else timeMs
			val ss = duration / 1000
			val hours = ss / 3600
			val minutes = ss / 60 % 60
			val seconds = ss % 60
			val millis = duration - ss * 1000
			if (hours > 0) {
				s.append(hours).append(":")
				if (minutes <= 9) {
					s.append("0")
				}
			}
			s.append(minutes)
			s.append(":")
			if (seconds <= 9) {
				s.append("0")
			}
			s.append(seconds)
			s.append(".")
			s.append(millis / 100)
			return s.toString()
		}

		fun measureView(view: View) {
			val p = ViewGroup.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT)
			val childWidthSpec: Int
			val childHeightSpec: Int
			val viewParent = view.parent
			if (p.width > 0) {
				childWidthSpec = View.MeasureSpec.makeMeasureSpec(p.width, View.MeasureSpec.EXACTLY)
			} else {
				var w = 0
				if (viewParent != null && viewParent is View) {
					w = (viewParent as View).width
				}
				childWidthSpec = if (w > 0) {
					View.MeasureSpec.makeMeasureSpec(w, View.MeasureSpec.AT_MOST)
				} else {
					View.MeasureSpec.makeMeasureSpec(0, View.MeasureSpec.UNSPECIFIED)
				}
			}
			if (p.height > 0) {
				childHeightSpec = View.MeasureSpec.makeMeasureSpec(p.height, View.MeasureSpec.EXACTLY)
			} else {
				var h = 0
				if (viewParent != null && viewParent is View) {
					h = (viewParent as View).height
				}
				childHeightSpec = if (h > 0) {
					View.MeasureSpec.makeMeasureSpec(h, View.MeasureSpec.AT_MOST)
				} else {
					View.MeasureSpec.makeMeasureSpec(0, View.MeasureSpec.UNSPECIFIED)
				}
			}
			view.measure(childWidthSpec, childHeightSpec)
		}

		fun deinterleaveArray(array: ShortArray, stride: Int, offset: Int): ShortArray {
			val retval = ShortArray(array.size / stride)
			var indexIn = offset
			var indexOut = 0
			while (indexIn < array.size) {
				retval[indexOut] = array[indexIn]
				indexIn += stride
				++indexOut
			}
			return retval
		}

	}

}
