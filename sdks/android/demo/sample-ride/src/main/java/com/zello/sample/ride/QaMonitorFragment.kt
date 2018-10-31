package com.zello.sample.ride

import android.app.Fragment
import android.content.Context
import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioTrack
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.AdapterView
import android.widget.ArrayAdapter
import android.widget.TextView
import com.zello.channel.sdk.IncomingVoiceStream
import kotlinx.android.synthetic.main.qa_monitor.*

class QaMonitorFragment : Fragment() {

	class ChannelMessageAdapter(context: Context) : ArrayAdapter<ChannelMessage>(context, android.R.layout.simple_list_item_activated_2) {

		override fun getView(position: Int, convertView: View?, parent: ViewGroup?): View {
			val view = convertView ?: LayoutInflater.from(context).inflate(android.R.layout.simple_list_item_activated_2, parent, false)
			val message = getItem(position) ?: return super.getView(position, convertView, parent)

			val titleView = view.findViewById<TextView>(android.R.id.text1)
			titleView.text = message.sender
			val titleColor: Int
			if (message.isRecording) {
				titleColor = 0xffff0000.toInt()
			} else {
				titleColor = context.resources.getColor(android.R.color.primary_text_light)
			}
			titleView.setTextColor(titleColor)
			val subtitleView = view.findViewById<TextView>(android.R.id.text2)
			subtitleView.text = message.receivedDate.toString()
			return view
		}

	}

	private var adapter: ChannelMessageAdapter? = null
	private var player: AudioTrack? = null

	val isRealtimeMonitorEnabled
		get() = monitorSwitch.isChecked

	fun onNewMessage(message: ChannelMessage) {
		message.listener = object: ChannelMessage.Events {
			override fun onRecordingChanged(message: ChannelMessage, isRecording: Boolean) {
				// Manually setting the visual recording state because onNotifyDataSetChanged() didn't work
				val messagePosition = adapter?.getPosition(message)
				if (messagePosition != null) {
					val firstVisible = monitorList.firstVisiblePosition
					val lastVisible = firstVisible + monitorList.childCount
					if (messagePosition >= firstVisible && messagePosition <= lastVisible) {
						val messageView = monitorList.getChildAt(messagePosition - firstVisible)
						if (messageView != null) {
							val titleView = messageView.findViewById<TextView>(android.R.id.text1)
							titleView?.setTextColor(if (isRecording) 0xffff0000.toInt() else activity.resources.getColor(android.R.color.primary_text_light))
						}
					}
				}
			}
		}

		// Maintain the checked item when we add this new item
		val selectedPosition = monitorList.checkedItemPosition
		val selectedItem = if (selectedPosition != AdapterView.INVALID_POSITION) adapter?.getItem(selectedPosition) else null
		adapter?.insert(message, 0)
		if (selectedItem != null) {
			val newSelection = adapter?.getPosition(selectedItem) ?: AdapterView.INVALID_POSITION
			monitorList.setItemChecked(newSelection, true)
		}
	}

	fun onMessageEnd(stream: IncomingVoiceStream) {
	}

	fun reset() {
		player?.stop()
		player = null
		adapter?.clear()
	}

	// region Fragment lifecycle
	override fun onCreateView(inflater: LayoutInflater?, container: ViewGroup?, savedInstanceState: Bundle?): View {
		if (inflater == null) {
			return super.onCreateView(inflater, container, savedInstanceState)
		}

		return inflater.inflate(R.layout.qa_monitor, container)
	}

	override fun onViewCreated(view: View?, savedInstanceState: Bundle?) {
		super.onViewCreated(view, savedInstanceState)

		monitorList.setOnItemClickListener { adapterView: AdapterView<*>, itemView: View, position: Int, id: Long ->
			// Play the selected message
			val message = adapterView.getItemAtPosition(position) as? ChannelMessage ?: return@setOnItemClickListener
			if (message.isRecording) {
				return@setOnItemClickListener
			}

			var player = this.player
			if (player != null) {
				player.stop()
				player.release()
			}
			player = AudioTrack(AudioManager.STREAM_VOICE_CALL, message.sampleRate, AudioFormat.CHANNEL_OUT_MONO, AudioFormat.ENCODING_PCM_16BIT, message.audioData.size * 2, AudioTrack.MODE_STATIC)
			player.setStereoVolume(AudioTrack.getMaxVolume(), AudioTrack.getMaxVolume())
			player.write(message.audioData, 0, message.audioData.size)
			player.notificationMarkerPosition = message.audioData.size
			player.setPlaybackPositionUpdateListener(object: AudioTrack.OnPlaybackPositionUpdateListener {
				override fun onMarkerReached(p0: AudioTrack?) {
					// Uncheck the item
					val selectedPosition = monitorList.checkedItemPosition
					if (selectedPosition != AdapterView.INVALID_POSITION) {
						val selectedItem = adapter?.getItem(selectedPosition)
						if (selectedItem === message) {
							monitorList.setItemChecked(selectedPosition, false)
						}
					}
					this@QaMonitorFragment.player = null
				}

				override fun onPeriodicNotification(p0: AudioTrack?) {
					// Don't care
				}
			})

			player.play()
			this.player = player
		}
	}

	override fun onActivityCreated(savedInstanceState: Bundle?) {
		super.onActivityCreated(savedInstanceState)

		adapter = ChannelMessageAdapter(activity)
		monitorList.adapter = adapter
	}
	// endregion

}
