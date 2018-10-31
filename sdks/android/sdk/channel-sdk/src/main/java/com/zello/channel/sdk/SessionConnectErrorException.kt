package com.zello.channel.sdk

internal class SessionConnectErrorException(val error: SessionConnectError) : Exception(error.toString())
