import asyncio
import base64
import json
import time
import aiohttp
import socket


WS_ENDPOINT="wss://zello.io/ws"


def main():
    loop = asyncio.get_event_loop()
    try:
        loop.run_until_complete(zello_opus_stream(
            "username",
            "password",
            "token",
            "channel",
            "opus_filename"))
    finally:
        loop.close()


async def zello_opus_stream(username, password, token, channel, oggfile):
    stream = OpusFileStream(oggfile)

    conn = aiohttp.TCPConnector(family = socket.AF_INET, verify_ssl = False)
    async with aiohttp.ClientSession(connector=conn) as session:
        async with session.ws_connect(WS_ENDPOINT) as ws:
            await ws.send_str(json.dumps({
                "command": "logon",
                "seq": 1,
                "auth_token": token,
                "username": username,
                "password": password,
                "channel": channel
            }))

            authorized = False
            channel_available = None

            async for msg in ws:
                print(msg)
                if msg.type == aiohttp.WSMsgType.TEXT:
                    res = json.loads(msg.data)
                    if "refresh_token" in res:
                        refresh_token = res["refresh_token"]
                        print("Time:", session.loop.time())
                        print("Token:", refresh_token)
                        authorized = True
                    elif "command" in res and res["command"] == "on_channel_status":
                        channel_available = res["status"] == "online"
                    if authorized and channel_available:
                        print("Starting streaming")
                        break
                else:
                    print("Unexpected message type[{}]".format(msg.type))

            if not authorized:
                print("Authorithation failed")
                return

            if not channel_available:
                print("Channel not available")
                return

            await ws.send_str(start_stream_request(stream))

            async for msg in ws:
                stream_id = get_stream_id(msg)
                if stream_id:
                    break

            stream.set_stream_id(stream_id)

            while True:
                packet = stream.get_next_opus_packet()
                if not packet:
                    print("No more audio packets")
                    break

                if session.closed:
                    print("Session is closed!")
                    break

                await ws.send_bytes(packet)
                # For some reason socket closes in ~1 minute, so do not pause
                # await asyncio.sleep((stream.get_packet_duration() - 10) / 1000)

            await ws.send_str(json.dumps({
                "command": "stop_stream",
                "stream_id": stream_id
            }))


def start_stream_request(stream):
    sample_rate = stream.get_sample_rate()
    frames_per_packet = stream.get_frames_per_packet()
    packet_duration = stream.get_packet_duration()
    codec_header = base64.b64encode(sample_rate.to_bytes(2, "little") + \
        frames_per_packet.to_bytes(1, "big") + packet_duration.to_bytes(1, "big")).decode()
    return json.dumps({
        "command": "start_stream",
        "seq": 2,
        "type": "audio",
        "codec": "opus",
        "codec_header": codec_header,
        "packet_duration": packet_duration
        })


def get_stream_id(msg):
    if msg.type == aiohttp.WSMsgType.TEXT:
        data = json.loads(msg.data)
        if data["success"]:
            return data["stream_id"]
        else:
            print("unexpected message type[{}]".format(msg.type))
    return None


# https://tools.ietf.org/html/rfc7845
class OpusFileStream:
    def __init__(self, filename):
        self.oggfile = open(filename, "rb")
        if not self.oggfile:
            raise NameError('Failed opening {filename}')
        self.segment_sizes = bytes()
        self.stream_id = 0
        self.segment_idx = 0
        self.segments_count = 0
        self.packet_id = 1
        self.sequence_number = -1
        self.opus_headers_count = 0
        self.packet_duration = 0
        self.frames_per_packet = 0
        self.saved_packets = list()
        self.__fill_opus_config()


    def __get_next_ogg_packet_start(self):
        magic = bytes("OggS", "ascii")
        verified_bytes = 0
        while True:
            byte = self.oggfile.read(1)
            if not byte:
                return False

            if byte[0] == magic[verified_bytes]:
                verified_bytes += 1
                if verified_bytes == 4:
                    return True
            else:
                verified_bytes = 0


    def __parse_ogg_packet_header(self):
        version = self.oggfile.read(1)
        header_type = self.oggfile.read(1)
        granule = self.oggfile.read(8)
        serial_num = self.oggfile.read(4)
        self.sequence_number = int.from_bytes(self.oggfile.read(4), "little")
        checksum = int.from_bytes(self.oggfile.read(4), "little")
        self.segments_count = int.from_bytes(self.oggfile.read(1), "little")
        self.segment_idx = 0
        if self.segments_count > 0:
            self.segment_sizes = self.oggfile.read(self.segments_count)


    def __get_ogg_segment_data(self):
        data = bytes()
        continue_needed = False

        while self.segment_idx < self.segments_count:
            segment_size = self.segment_sizes[self.segment_idx]
            segment = self.oggfile.read(segment_size)
            data += segment
            continue_needed = (segment_size == 255)
            self.segment_idx += 1
            if not continue_needed:
                break

        return data, continue_needed


    def __get_stream_packet_header(self):
        header = (1).to_bytes(1, "big") + self.stream_id.to_bytes(4, "big") + \
            self.packet_id.to_bytes(4, "big")
        self.packet_id += 1
        return header


    def __parse_opushead_header(self, data):
        if data.find(bytes("OpusHead", "ascii")) != 0:
            return False
        version = data[8]
        channels = data[9]
        preskip = int.from_bytes(data[10:12], "little")
        self.sample_rate = int.from_bytes(data[12:15], "little")
        print(f"Opus version = {version}")
        print(f"Channel count = {channels}")
        print(f"Pre-skip = {preskip}")
        print(f"Sample rate = {self.sample_rate}")
        return True


    def __parse_opustags_header(self, data):
        return data.find(bytes("OpusTags", "ascii")) == 0


    # https://tools.ietf.org/html/rfc6716#section-3.1
    def __parse_opus_toc(self, data):
        toc_c = data[0] & 0x03
        if toc_c == 0:
            frames_per_packet = 1
        elif toc_c == 1 or toc_c == 2:
            frames_per_packet = 2
        else:
            # API requires predefined number of frames per packet
            frames_per_packet = 2

        configs_ms = {}
        configs_ms[2.5] = [16, 20, 24, 28]
        configs_ms[5] = [17, 21, 25, 29]
        configs_ms[10] = [0, 4, 8, 12, 14, 18, 22, 26, 30]
        configs_ms[20] = [1, 5, 9, 13, 15, 19, 23, 27, 31]
        configs_ms[40] = [2, 6, 10]
        configs_ms[60] = [3, 7, 11]

        durations = [2.5, 5, 10, 20, 40, 60]
        conf = data[0] >> 3 & 0x1f

        for duration in durations:
            if conf in configs_ms[duration]:
                return frames_per_packet, duration

        return frames_per_packet, 20


    def set_stream_id(self, stream_id):
        self.stream_id = stream_id


    def get_frames_per_packet(self):
        return self.frames_per_packet


    def get_sample_rate(self):
        return self.sample_rate


    def get_packet_duration(self):
        return self.packet_duration

    def all_headers_parsed(self):
        return self.opus_headers_count >= 3

    def get_next_opus_packet(self):
        continue_needed = False
        data = bytes()

        if self.all_headers_parsed() and len(self.saved_packets) > 0:
            data = self.saved_packets[0]
            self.saved_packets.remove(self.saved_packets[0])
            return self.__get_stream_packet_header() + data

        while True:
            if self.segment_idx >= self.segments_count:
                last_seq_num = self.sequence_number

                # Move to next Ogg packet
                if self.__get_next_ogg_packet_start():
                    self.__parse_ogg_packet_header()
                else:
                    return None

                # Drop current data if continuation sequence is broken
                if continue_needed and (last_seq_num + 1) != self.sequence_number:
                    self.segments_count = -1
                    print("Skipping frame: continuation sequence is broken")
                    continue

            # Get another chunk of data from the parsed Ogg packet
            segment_data, continue_needed = self.__get_ogg_segment_data()
            data += segment_data
            if continue_needed:
                continue

            # Do not send Opus headers
            if not self.all_headers_parsed():
                self.__parse_opus_headers(data)
                data = bytes()
                continue

            # Verify the Opus TOC is the same as we initially declared
            frames, duration = self.__parse_opus_toc(data)
            if self.frames_per_packet != frames or self.packet_duration != duration:
                data = bytes()
                print("Skipping frame - TOC differs")
                continue

            data = self.__get_stream_packet_header() + data
            return data

        return None

    # Parse OpusHead, OpusTags and TOC byte from the first Opus packet
    def __parse_opus_headers(self, data):
        if self.opus_headers_count < 1:
            if self.__parse_opushead_header(data):
                self.opus_headers_count += 1
        elif self.opus_headers_count < 2:
            if self.__parse_opustags_header(data):
                self.opus_headers_count += 1
        elif self.opus_headers_count < 3:
            frames_per_packet, packet_duration = self.__parse_opus_toc(data)
            self.frames_per_packet = frames_per_packet
            self.packet_duration = packet_duration
            self.opus_headers_count += 1
            self.saved_packets.append(data)


    def __fill_opus_config(self):
        while not self.all_headers_parsed():
            self.get_next_opus_packet()


if __name__ == "__main__":
    main()

