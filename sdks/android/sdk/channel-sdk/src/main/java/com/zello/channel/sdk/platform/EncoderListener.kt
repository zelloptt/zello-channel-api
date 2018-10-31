package com.zello.channel.sdk.platform

internal interface EncoderListener {

    /**
     * onEncoderData receives reference to the internal buffer and should copy data from it.
     *
     * @param buffer reference to the internal recording buffer
     */
    fun onEncoderData(buffer: ByteArray)

	fun onEncoderReady()

    fun onEncoderStart()

    //void onEncoderStop();

    fun onEncoderErrorUnknown()

    fun onEncoderErrorControlledAccess()

    fun onEncoderErrorMicrophoneDevice()

    fun onEncoderErrorCodecImplementation()

}
