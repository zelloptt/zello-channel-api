package com.zello.sample.ride

import android.content.res.AssetFileDescriptor
import android.media.MediaCodec
import android.media.MediaExtractor
import android.media.MediaFormat
import android.os.AsyncTask
import java.nio.ByteBuffer

class WavReader(private val fd: AssetFileDescriptor) {
	enum class ReadStatus {
		Done,
		More,
		Error
	}

	val sampleRate: Int by lazy {
		val extractor = MediaExtractor()
		extractor.setDataSource(fd.fileDescriptor, fd.startOffset, fd.length)
		val format = extractor.getTrackFormat(0)
		format.getInteger(MediaFormat.KEY_SAMPLE_RATE)
	}

	private class ReadTaskParams(val extractor: MediaExtractor)
	private class ReadTaskCallbackParams(val status: ReadStatus, val samples: ShortArray?)
	private class ReadTask(private val callback: (ReadStatus, ShortArray?) -> Unit) : AsyncTask<ReadTaskParams, ReadTaskCallbackParams, Unit>() {

		@Suppress("DEPRECATION")
		override fun doInBackground(vararg paramses: ReadTaskParams?) {
			val extractor = paramses[0]?.extractor ?: return

			val format = extractor.getTrackFormat(0)
			extractor.selectTrack(0)

			val codec = MediaCodec.createDecoderByType(format.getString(MediaFormat.KEY_MIME))
			codec.configure(format, null, null, 0)
			codec.start()

			var eof = false
			do {
				var readyInputIndex = codec.dequeueInputBuffer(0)

				while (readyInputIndex < 0) {
					val bufferInfo = MediaCodec.BufferInfo()
					var readyOutputIndex = codec.dequeueOutputBuffer(bufferInfo, 0)
					if (readyOutputIndex == MediaCodec.INFO_OUTPUT_FORMAT_CHANGED) {
						readyOutputIndex = codec.dequeueOutputBuffer(bufferInfo, 0)
					}
					if (readyOutputIndex >= 0) {
						processOutputBuffer(codec.outputFormat, codec.outputBuffers[readyOutputIndex], bufferInfo)
						codec.releaseOutputBuffer(readyOutputIndex, false)
						readyInputIndex = codec.dequeueInputBuffer(0)
						continue
					} else {
						readyInputIndex = codec.dequeueInputBuffer(300)
					}
				}
				val inputBuffer = codec.inputBuffers[readyInputIndex]

				val samplesRead = extractor.readSampleData(inputBuffer, 0)
				if (samplesRead == -1) {
					codec.queueInputBuffer(readyInputIndex, 0, 0, 0, MediaCodec.BUFFER_FLAG_END_OF_STREAM)
					break
				}
				inputBuffer.limit(samplesRead)
				inputBuffer.position(0)
				if (!extractor.advance()) {
					eof = true
				}

				codec.queueInputBuffer(readyInputIndex, 0, samplesRead, 0, 0)

				val bufferInfo = MediaCodec.BufferInfo()
				var readyOutputIndex = codec.dequeueOutputBuffer(bufferInfo, 0)
				if (readyOutputIndex == MediaCodec.INFO_OUTPUT_FORMAT_CHANGED) {
					readyOutputIndex = codec.dequeueOutputBuffer(bufferInfo, 0)
				}
				if (readyOutputIndex >= 0) {
					processOutputBuffer(codec.outputFormat, codec.outputBuffers[readyOutputIndex], bufferInfo)
					codec.releaseOutputBuffer(readyOutputIndex, false)
				}
			} while (!eof)

			var done = false
			flushingCodec@ while (!done) {
				val bufferInfo = MediaCodec.BufferInfo()
				val readyOutputIndex = codec.dequeueOutputBuffer(bufferInfo, 100)
				when (readyOutputIndex) {
					MediaCodec.INFO_OUTPUT_FORMAT_CHANGED, MediaCodec.INFO_TRY_AGAIN_LATER -> {
						continue@flushingCodec
					}

					MediaCodec.INFO_OUTPUT_BUFFERS_CHANGED -> {
						// Irrelevant
						// What do I do here?
						// Same as else block, but I don't think I can combine them. Thanks, Kotlin.
						if (bufferInfo.flags and MediaCodec.BUFFER_FLAG_END_OF_STREAM != 0) {
							done = true
						}
						if (bufferInfo.size > 0) {
							processOutputBuffer(codec.outputFormat, codec.outputBuffers[readyOutputIndex],bufferInfo)
						}
						codec.releaseOutputBuffer(readyOutputIndex, false)
					}

					else -> {
						if (bufferInfo.flags and MediaCodec.BUFFER_FLAG_END_OF_STREAM != 0) {
							done = true
						}
						if (bufferInfo.size > 0) {
							processOutputBuffer(codec.outputFormat, codec.outputBuffers[readyOutputIndex], bufferInfo)
						} else {
							publishProgress(ReadTaskCallbackParams(ReadStatus.Done, null))
						}
						codec.releaseOutputBuffer(readyOutputIndex, false)
					}
				}
			}
		}

		override fun onProgressUpdate(vararg paramses: ReadTaskCallbackParams?) {
			val params = paramses[0] ?: return
			callback(params.status, params.samples)
		}

		private fun processOutputBuffer(format: MediaFormat, buffer: ByteBuffer, info: MediaCodec.BufferInfo) {
			if (info.size == 0)
				return
			if (info.offset > 0) {
				buffer.compact()
			}
			buffer.position(0)

			val readStatus = if (info.flags and MediaCodec.BUFFER_FLAG_END_OF_STREAM != 0) ReadStatus.Done else ReadStatus.More
			if (format.getInteger(MediaFormat.KEY_CHANNEL_COUNT) == 2) {
				// Deinterleave
				val interleaved = ShortArray(info.size / 2) // Two bytes per short
				buffer.asShortBuffer().get(interleaved, 0, interleaved.size)
				val firstChannel = Utils.deinterleaveArray(interleaved, 2, 0)
				publishProgress(ReadTaskCallbackParams(readStatus, firstChannel))
			} else {
				val samples = ShortArray(info.size / 2) // Two bytes per short
				buffer.asShortBuffer().get(samples, 0, samples.size)
				publishProgress(ReadTaskCallbackParams(readStatus, samples))
			}
		}
	}
	private var readTask: ReadTask? = null

	fun read(callback: (status: ReadStatus, samples: ShortArray?) -> Unit) {
		val extractor = MediaExtractor()
		extractor.setDataSource(fd.fileDescriptor, fd.startOffset, fd.length)
		fd.close()

		readTask = ReadTask(callback)
		readTask?.execute(ReadTaskParams(extractor))
	}

}
