import os
import asyncio
import base64
import json
import time
import aiohttp
import socket
import configparser
import opus_file_stream

WS_CONSUMER_ENDPOINT = "wss://zello.io/ws"
WS_WORK_ENDPOINT = "wss://zellowork.io/ws/"
WS_TIMEOUT_SEC = 2

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
        channel = config['zello']['channel']
        filename = config['media']['filename']

        token = None
        network = None
        if 'network' in config['zello']:
            network = config['zello']['network']

        if 'token' in config['zello']:
            token = config['zello']['token']
        elif network is None:
            # Zello Consumer requires an auth token
            print("Check config file. Missing token")
            return

    except KeyError as error:
        print("Check config file. Missing key:", error)
        return
    except Exception as e:
        print("Error loading configuration:", e)
        return

    try:
        asyncio.run(zello_stream_audio_to_channel(username, password, network, token, channel, filename))
    except KeyboardInterrupt:
        if ZelloWS and ZelloStreamID:
            try:
                asyncio.run(zello_stream_stop(ZelloWS, ZelloStreamID))
            except aiohttp.client_exceptions.ClientError as error:
                print("Error during stopping:", error)


async def zello_stream_audio_to_channel(username, password, network, token, channel, opusfile):
    # Pass out the opened WebSocket and StreamID to handle synchronous keyboard interrupt
    global ZelloWS, ZelloStreamID
    wss_url = WS_CONSUMER_ENDPOINT if network is None else WS_WORK_ENDPOINT + network
    try:
        opus_stream = opus_file_stream.OpusFileStream(opusfile)
        conn = aiohttp.TCPConnector(family = socket.AF_INET, ssl = False)
        async with aiohttp.ClientSession(connector = conn) as session:
            async with session.ws_connect(wss_url) as ws:
                ZelloWS = ws
                await asyncio.wait_for(authenticate(ws, username, password, token, channel), WS_TIMEOUT_SEC)
                print(f"User {username} has been authenticated on {channel} channel")
                stream_id = await asyncio.wait_for(zello_stream_start(ws, opus_stream), WS_TIMEOUT_SEC)
                ZelloStreamID = stream_id
                print(f"Started streaming {opusfile}")
                await zello_stream_send_audio(session, ws, stream_id, opus_stream)
                await asyncio.wait_for(zello_stream_stop(ws, stream_id), WS_TIMEOUT_SEC)
    except (NameError, aiohttp.client_exceptions.ClientError, IOError) as error:
        print("Error during streaming:", error)
    except asyncio.TimeoutError:
        print("Communication timeout")


async def authenticate(ws, username, password, token, channel):
    # https://github.com/zelloptt/zello-channel-api/blob/master/AUTH.md
    auth_command = {
        "command": "logon",
        "seq": 1,
        "auth_token": token,
        "username": username,
        "password": password,
        "channel": channel
    }
    if token is None:
        auth_command.pop("auth_token")
    await ws.send_str(json.dumps(auth_command))

    is_authorized = False
    is_channel_available = False
    async for msg in ws:
        if msg.type == aiohttp.WSMsgType.TEXT:
            data = json.loads(msg.data)
            if "seq" in data and data["seq"] == 1 and "success" in data and data["success"]:
                is_authorized = True
            elif "command" in data and "status" in data and data["command"] == "on_channel_status":
                is_channel_available = data["status"] == "online"
            if is_authorized and is_channel_available:
                break

    if not is_authorized or not is_channel_available:
        raise NameError("Authentication failed")


async def zello_stream_start(ws, opus_stream):
    sample_rate = opus_stream.sample_rate
    frames_per_packet = opus_stream.frames_per_packet
    packet_duration = opus_stream.packet_duration
    # Sample_rate is in little endian.
    # https://github.com/zelloptt/zello-channel-api/blob/409378acd06257bcd07e3f89e4fbc885a0cc6663/sdks/js/src/classes/utils.js#L63
    codec_header = base64.b64encode(
        sample_rate.to_bytes(2, "little") +
        frames_per_packet.to_bytes(1, "big") +
        packet_duration.to_bytes(1, "big")
    ).decode()

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
    raise NameError("Failed to create Zello audio stream")


async def zello_stream_send_audio(session, ws, stream_id, opus_stream):
    packet_duration_sec = opus_stream.packet_duration / 1000
    start_ts_sec = time.time_ns() / 1_000_000_000
    time_streaming_sec = 0
    packet_id = 0

    try:
        while True:
            data = opus_stream.get_next_opus_packet()
            if not data:
                break

            if ws.closed:
                raise NameError("WebSocket closed")

            packet = generate_zello_stream_packet(stream_id, packet_id, data)
            await ws.send_bytes(packet)

            packet_id += 1
            time_streaming_sec += packet_duration_sec
            time_elapsed_sec = (time.time_ns() / 1_000_000_000) - start_ts_sec
            sleep_delay_sec = time_streaming_sec - time_elapsed_sec

            if sleep_delay_sec > 0:
                await asyncio.sleep(sleep_delay_sec)
    except Exception:
        raise


def generate_zello_stream_packet(stream_id, packet_id, data):
    return (
        (1).to_bytes(1, "big") +  # Packet type: 1 for audio
        stream_id.to_bytes(4, "big") +
        packet_id.to_bytes(4, "big") +
        data
    )


async def zello_stream_stop(ws, stream_id):
    # If the websocket is already closing/closed, don't try to write.
    if getattr(ws, "closed", False):
        return
    try:
        await ws.send_str(json.dumps({
            "command": "stop_stream",
            "stream_id": stream_id
        }))
    except Exception:
        # Swallow errors like "Cannot write to closing transport"
        # since shutdown may already be in progress.
        pass


if __name__ == "__main__":
    main()
