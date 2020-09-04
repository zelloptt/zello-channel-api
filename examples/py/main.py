import os
import asyncio
import base64
import json
import time
import aiohttp
import socket
import configparser
import opus_file_stream

WS_ENDPOINT = "wss://zello.io/ws"

ZelloWS = None
ZelloStreamID = None


def main():
    global ZelloWS, ZelloStreamID

    try:
        os.chdir("../")
        config = configparser.ConfigParser()
        config.read('stream.conf')
        username = config['zello']['username']
        password = config['zello']['password']
        token = config['zello']['token']
        channel = config['zello']['channel']
        filename = config['media']['filename']
    except KeyError as error:
        print("Check config file. Missing key:", error)
        return

    loop = asyncio.get_event_loop()
    try:
        loop.run_until_complete(zello_stream_audio_to_channel(username, password,
            token, channel, filename))
    except KeyboardInterrupt:
        try:
            if ZelloWS and ZelloStreamID:
                loop.run_until_complete(zello_stream_stop(ZelloWS, ZelloStreamID))

        except aiohttp.client_exceptions.ClientError as error:
            print("Error during stopping. ", error)

        def shutdown_exception_handler(loop, context):
            if "exception" in context and isinstance(context["exception"], asyncio.CancelledError):
                return
            loop.default_exception_handler(context)

        loop.set_exception_handler(shutdown_exception_handler)
        tasks = asyncio.gather(*asyncio.all_tasks(loop=loop), return_exceptions=True)
        tasks.add_done_callback(lambda t: loop.stop())
        tasks.cancel()
        while not tasks.done() and not loop.is_closed():
            loop.run_forever()
        print("Stopped by user")
    finally:
        loop.close()


async def zello_stream_audio_to_channel(username, password, token, channel, opusfile):
    # Pass out the opened WebSocket and StreamID to handle synchronous keyboard interrupt
    global ZelloWS, ZelloStreamID
    try:
        opus_stream = opus_file_stream.OpusFileStream(opusfile)
        conn = aiohttp.TCPConnector(family = socket.AF_INET, ssl = False)
        async with aiohttp.ClientSession(connector = conn) as session:
            async with session.ws_connect(WS_ENDPOINT) as ws:
                ZelloWS = ws
                await authenticate(ws, username, password, token, channel)
                stream_id = await zello_stream_start(ws, opus_stream)
                ZelloStreamID = stream_id
                await zello_stream_send_audio(session, ws, stream_id, opus_stream)
                await zello_stream_stop(ws, stream_id)
    except (NameError, aiohttp.client_exceptions.ClientError, IOError) as error:
            print(error)


async def authenticate(ws, username, password, token, channel):
    # https://github.com/zelloptt/zello-channel-api/blob/master/AUTH.md
    await ws.send_str(json.dumps({
        "command": "logon",
        "seq": 1,
        "auth_token": token,
        "username": username,
        "password": password,
        "channel": channel
    }))

    is_authorized = False
    is_channel_available = False
    async for msg in ws:
        if msg.type == aiohttp.WSMsgType.TEXT:
            data = json.loads(msg.data)
            if "refresh_token" in data:
                is_authorized = True
            elif "command" in data and "status" in data and data["command"] == "on_channel_status":
                is_channel_available = data["status"] == "online"
            if is_authorized and is_channel_available:
                break

    if not is_authorized or not is_channel_available:
        raise NameError('Authentication failed')


async def zello_stream_start(ws, opus_stream):
    sample_rate = opus_stream.sample_rate
    frames_per_packet = opus_stream.frames_per_packet
    packet_duration = opus_stream.packet_duration

    # Sample_rate is in little endian.
    # https://github.com/zelloptt/zello-channel-api/blob/409378acd06257bcd07e3f89e4fbc885a0cc6663/sdks/js/src/classes/utils.js#L63
    codec_header = base64.b64encode(sample_rate.to_bytes(2, "little") + \
        frames_per_packet.to_bytes(1, "big") + packet_duration.to_bytes(1, "big")).decode()

    await ws.send_str(json.dumps({
        "command": "start_stream",
        "seq": 2,
        "type": "audio",
        "codec": "opus",
        "codec_header": codec_header,
        "packet_duration": packet_duration
        }))

    async for msg in ws:
        if msg.type == aiohttp.WSMsgType.TEXT:
            data = json.loads(msg.data)
            if "success" in data and "stream_id" in data and data["success"]:
                return data["stream_id"]
            else:
                break

    raise NameError('Failed to create Zello audio stream')


async def zello_stream_stop(ws, stream_id):
    await ws.send_str(json.dumps({
        "command": "stop_stream",
        "stream_id": stream_id
        }))


async def send_audio_packet(ws, packet):
    # Once the data has been sent - listen on websocket, connection may be closed otherwise.
    await ws.send_bytes(packet)
    await ws.receive()


def generate_zello_stream_packet(stream_id, packet_id, data):
    # https://github.com/zelloptt/zello-channel-api/blob/master/API.md#stream-data
    return (1).to_bytes(1, "big") + stream_id.to_bytes(4, "big") + \
        packet_id.to_bytes(4, "big") + data


async def zello_stream_send_audio(session, ws, stream_id, opus_stream):
    packet_duration_sec = opus_stream.packet_duration / 1000
    start_ts_sec = time.time_ns() / 1000000000
    time_streaming_sec = 0
    packet_id = 0
    while True:
        data = opus_stream.get_next_opus_packet()

        if not data:
            print("No more audio packets")
            break

        if session.closed:
            raise NameError("Session is closed!")

        packet_id += 1
        packet = generate_zello_stream_packet(stream_id, packet_id, data)
        try:
            # Once wait_for() is timed out - it takes additional operational time.
            # Recalculate delay and sleep at the end of the loop to compensate this delay.
            await asyncio.wait_for(
                send_audio_packet(ws, packet), packet_duration_sec * 0.8
            )
        except asyncio.TimeoutError:
            pass

        time_streaming_sec += packet_duration_sec
        time_elapsed_sec = (time.time_ns() / 1000000000) - start_ts_sec
        sleep_delay_sec = time_streaming_sec - time_elapsed_sec

        if sleep_delay_sec > 0.001:
            time.sleep(sleep_delay_sec)


if __name__ == "__main__":
    main()
