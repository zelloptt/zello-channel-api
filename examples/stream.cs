namespace ZelloStream
{
    using System;
    using System.IO;
    using System.Collections.Generic;
    using System.Net.WebSockets;
    using System.Threading;
    using System.Text.Json;
    using System.Buffers.Binary;
    using System.Diagnostics;
    using Microsoft.Extensions.Configuration;

    // https://tools.ietf.org/html/rfc7845
    // https://tools.ietf.org/html/rfc3533
    class OpusFileStream : IDisposable {

        Stream opusFile;
        byte[] segmentSizes;
        byte segmentIdx;
        byte segmentsCount;
        UInt32 sequenceNumber;
        public UInt32 sampleRate { get; private set; }
        int opusHeadersCount;
        public int packetDuration { get; private set; }
        public int framesPerPacket { get; private set; }
        List<byte[]> savedPackets;

        public OpusFileStream(string filename) {
            try {
                this.opusFile = File.OpenRead(filename);
            } catch {
                throw new Exception("Failed opening " + filename);
            }
            this.segmentSizes = new byte[255];
            this.savedPackets = new List<byte[]>();
            if (!this.fillOpusConfig()) {
                throw new Exception("Failed to fill Opus configuration");    
            }
        }

        public void Dispose() {
            if (this.opusFile is null) {
                return;
            }
            this.opusFile.Dispose();
        }

        private bool getNextOggPacketStart() {
            // Each Ogg page starts with magic bytes "OggS"
            // Stream may be corrupted, so find a first valid magic
            int verifiedBytes = 0;
            byte[] magic = System.Text.Encoding.UTF8.GetBytes("OggS");
            byte[] onebyte = new byte[1];
            try {
                while (this.opusFile.Read(onebyte, 0, 1) == 1) {
                    if (onebyte[0] == magic[verifiedBytes]) {
                        verifiedBytes++;
                        if (verifiedBytes == 4) {
                            return true;
                        }
                    } else {
                        verifiedBytes = 0;
                    }
                }
            } catch {
                Console.WriteLine("Failed reading media while looking for next Ogg packet");
                return false;
            }
            return false;
        }

        private bool parseOggPacketHeader() {
            // The Ogg page has the following format:
            //  0               1               2               3                Byte
            //  0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1| Bit
            // +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
            // | capture_pattern: Magic number for page start "OggS"           | 0-3
            // +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
            // | version       | header_type   | granule_position              | 4-7
            // +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
            // |                                                               | 8-11
            // +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
            // |                               | bitstream_serial_number       | 12-15
            // +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
            // |                               | page_sequence_number          | 16-19
            // +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
            // |                               | CRC_checksum                  | 20-23
            // +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
            // |                               | page_segments | segment_table | 24-27
            // +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
            // | ...                                                           | 28-
            // +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
            byte[] header = new byte[23];
            try {
                if (this.opusFile.Read(header, 0, header.Length) != header.Length) {
                    return false;
                }
            } catch {
                Console.WriteLine("Failed reading media while parsing Ogg packet header");
                return false;
            }

            if (!BitConverter.IsLittleEndian) {
                Array.Reverse(header, 2, 8);
                Array.Reverse(header, 10, 4);
                Array.Reverse(header, 14, 4);
                Array.Reverse(header, 18, 4);
            }

            byte version = header[0];
            byte headerType = header[1];
            UInt64 granule = BitConverter.ToUInt64(header, 2);
            UInt32 serialNum = BitConverter.ToUInt32(header, 10);
            this.sequenceNumber = BitConverter.ToUInt32(header, 14);
            UInt32 checksum = BitConverter.ToUInt32(header, 18);
            this.segmentsCount = header[22];
            this.segmentIdx = 0;
            if (this.segmentsCount > 0) {
                this.segmentSizes = new byte[this.segmentsCount];
                try {
                    if (this.opusFile.Read(this.segmentSizes, 0, this.segmentsCount) != this.segmentsCount) {
                        return false;
                    }
                } catch {
                    Console.WriteLine("Failed reading media while fetching Ogg page segment table");
                    return false;
                }
            }
            return true;
        }

        private (byte[], bool) getOggSegmentData() {
            bool isContinueNeeded = false;
            byte[] data = new byte[0];

            // Read data from the next segment according to the sizes table page_segments.
            // The length of 255 indicates the data requires continuing from the next
            // segment. The data from the last segment may still require continuing.
            // Return the bool isContinueNeeded to accumulate such lacing data.
            while (this.segmentIdx < this.segmentsCount) {
                byte segmentSize = this.segmentSizes[this.segmentIdx];
                byte[] segment = new byte[segmentSize];
                try {
                    if (this.opusFile.Read(segment, 0, segmentSize) != segmentSize) {
                        break;
                    }
                } catch {
                    Console.WriteLine("Failed reading media while fetching Ogg page segment");
                    return (null, false);
                }

                byte[] newdata = new byte[data.Length + segmentSize];
                data.CopyTo(newdata, 0);
                segment.CopyTo(newdata, data.Length);
                data = newdata;
                isContinueNeeded = (segmentSize == 255);
                this.segmentIdx++;
                if (!isContinueNeeded) {
                    break;
                }
            }
            return (data, isContinueNeeded);
        }

        private bool parseOpusheadHeader(byte[] data) {
            // OpusHead header format:
            //  0               1               2               3                Byte
            //  0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1| Bit
            // +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
            // |      'O'      |      'p'      |      'u'      |      's'      | 0-3
            // +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
            // |      'H'      |      'e'      |      'a'      |      'd'      | 4-7
            // +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
            // |  Version = 1  | Channel Count |           Pre-skip            | 8-11
            // +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
            // |                     Input Sample Rate (Hz)                    | 12-15
            // +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
            // |   Output Gain (Q7.8 in dB)    | Mapping Family|               | 16-
            // +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+               :
            // :               Optional Channel Mapping Table...               :
            // +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
            byte[] magic = System.Text.Encoding.UTF8.GetBytes("OpusHead");
            for (int i = 0; i < magic.Length; i++) {
                if (magic[i] != data[i]) {
                    return false;
                }
            }

            byte version = data[8];
            byte channels = data[9];
            if (!BitConverter.IsLittleEndian) {
                Array.Reverse(data, 10, 2);
                Array.Reverse(data, 12, 4);
            }

            UInt16 preskip = BitConverter.ToUInt16(data, 10);
            this.sampleRate = BitConverter.ToUInt32(data, 12);
            Console.WriteLine("Opus version = " + version);
            Console.WriteLine("Channel count = " + channels);
            Console.WriteLine("Pre-skip = " + preskip);
            Console.WriteLine("Sample rate = " + this.sampleRate);
            return true;
        }

        private bool parseOpustagsHeader(byte[] data) {
            //  0               1               2               3                Byte
            //  0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1| Bit
            // +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
            // |      'O'      |      'p'      |      'u'      |      's'      | 0-3
            // +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
            // |      'T'      |      'a'      |      'g'      |      's'      | 4-7
            // +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
            // |                     Vendor String Length                      | 8-11
            // +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
            // :                        Vendor String...                       : 12-
            // +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
            // |                   User Comment List Length                    |
            // +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
            // |                 User Comment #0 String Length                 |
            // +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
            // :                   User Comment #0 String...                   :
            // +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
            // |                 User Comment #1 String Length                 |
            // +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
            byte[] magic = System.Text.Encoding.UTF8.GetBytes("OpusTags");
            for (int i = 0; i < magic.Length; i++) {
                if (magic[i] != data[i]) {
                    return false;
                }
            }
            return true;
        }

        private (int, int) parseOpusToc(byte[] data) {
            // https://tools.ietf.org/html/rfc6716#section-3.1
            // Each Opus packet starts with the Table Of Content Byte:
            // |0 1 2 3 4 5 6 7| Bit
            // +-+-+-+-+-+-+-+-+
            // | config  |s| c |
            // +-+-+-+-+-+-+-+-+
            byte tocC = (byte)(data[0] & 0x03);
            if (tocC == 0) {
                framesPerPacket = 1;
            } else if (tocC == 1 || tocC == 2) {
                framesPerPacket = 2;
            } else {
                // API requires predefined number of frames per packet
                Console.WriteLine("An arbitrary number of frames in the packet - possible audio arifacts");
                framesPerPacket = 1;
            }

            float[] durations = { 2.5F, 5, 10, 20, 40, 60 };
            List<byte[]> configsMS = new List<byte[]>() {
                new byte[] { 16, 20, 24, 28 },
                new byte[] { 17, 21, 25, 29 },
                new byte[] { 0, 4, 8, 12, 14, 18, 22, 26, 30 },
                new byte[] { 1, 5, 9, 13, 15, 19, 23, 27, 31 },
                new byte[] { 2, 6, 10 },
                new byte[] { 3, 7, 11 }
            };

            byte config = (byte)((data[0] >> 3) & 0x1f);
            for (int i = 0; i < configsMS.Count; i++) {
                if (Array.Exists(configsMS[i], conf => (conf == config))) {
                    // The packet duration 2.5ms currently is not supported
                    return (framesPerPacket, (int)durations[i]);
                }
            }
            return (framesPerPacket, 20);
        }

        private bool allHeadersParsed() {
            // There are three mandatory headers. Don't send data until the headers are parsed.
            return (this.opusHeadersCount >= 3);
        }

        public byte[] GetNextOpusPacket() {
            byte[] segmentData;
            byte[] data = new byte[0];
            bool isContinueNeeded = false;

            // The Table Of Contents byte has been read from the first audio data segment
            // stored in the savedPackets list.
            if (this.allHeadersParsed() && this.savedPackets.Count > 0) {
                data = this.savedPackets[0];
                this.savedPackets.RemoveAt(0);
                return data;
            }

            while (true) {
                // Move to the next Ogg packet if the current one has been read completely
                if (this.segmentsCount == 0 || this.segmentIdx >= this.segmentsCount) {
                    UInt32 lastSeqNum = this.sequenceNumber;

                    if (!this.getNextOggPacketStart() || !this.parseOggPacketHeader()) {
                        return null;
                    }

                    // Drop current Ogg packet if continuation sequence is broken
                    if (isContinueNeeded && (lastSeqNum + 1) != this.sequenceNumber) {
                        isContinueNeeded = false;
                        this.segmentsCount = 0;
                        data = new byte[0];
                        Console.WriteLine("Skipping frame: continuation sequence is broken");
                        continue;
                    }
                }

                // Get another chunk of data from the parsed Ogg page
                (segmentData, isContinueNeeded) = this.getOggSegmentData();
                byte[] newdata = new byte[data.Length + segmentData.Length];
                data.CopyTo(newdata, 0);
                segmentData.CopyTo(newdata, data.Length);
                data = newdata;

                // The last data chunk may require continuing in the next Ogg page
                if (isContinueNeeded) {
                    continue;
                }

                // Do not send Opus headers
                if (!this.allHeadersParsed()) {
                    this.parseOpusHeaders(data);
                    data = new byte[0];
                    continue;
                }

                // Verify the Opus TOC is the same as we initially declared
                (int frames, int duration) = this.parseOpusToc(data);
                if (this.framesPerPacket != frames || this.packetDuration != duration) {
                    data = new byte[0];
                    Console.WriteLine("Skipping frame - TOC differs");
                    continue;
                }
                break;
            }    
            return data;        
        }
        
        private void parseOpusHeaders(byte[] data) {
            // Header #1: OpusHead
            // Header #2: OpusTags
            // Header #3: Table Of Contents byte from the first Opus packet
            if (this.opusHeadersCount < 1) {
                if (this.parseOpusheadHeader(data)) {
                    this.opusHeadersCount++;
                }
            } else if (this.opusHeadersCount < 2) {
                if (this.parseOpustagsHeader(data)) {
                    this.opusHeadersCount++;
                }
            } else if (this.opusHeadersCount < 3) {
                (this.framesPerPacket, this.packetDuration) = this.parseOpusToc(data);
                this.opusHeadersCount++;
                this.savedPackets.Add(data);
            }
        }
    
        private bool fillOpusConfig() {
            while (!this.allHeadersParsed()) {
                byte[] packet = this.GetNextOpusPacket();
                if (packet is null) {
                    return false;
                }
            }
            return true;
        }
    }

    class ZelloMediaStream : IDisposable {
        private OpusFileStream opusStream;
        private IConfigurationRoot configuration;
        private CancellationTokenSource networkingCancelation;
        private ClientWebSocket webSocket;
        private UInt32 streamId;
        private UInt32 packetId;
        byte[] rcvBuffer;
        Stopwatch stopWatch;
        const string url = "wss://zello.io/ws";
        const int timeoutMS = 5000;

        public class ResponseJson {
            public string command { get; set; }
            public string status { get; set; }
            public string refresh_token { get; set; }
            public bool success { get; set; }
            public UInt32 stream_id { get; set; }
        };

        public ZelloMediaStream(IConfigurationRoot config) {
            this.configuration = config;
            this.webSocket = new ClientWebSocket();
            this.networkingCancelation = new CancellationTokenSource();
            this.stopWatch = new Stopwatch();
            this.rcvBuffer = new byte[1024];
            this.webSocket.Options.SetBuffer(this.rcvBuffer.Length, this.rcvBuffer.Length,
                this.rcvBuffer);
            this.webSocket.Options.KeepAliveInterval = new TimeSpan(0, 0, 10);
            this.opusStream = new OpusFileStream(config["media:filename"]);
        }

        public void Dispose() {
            if (this.opusStream != null) {
                this.opusStream.Dispose();
            }
            if (this.webSocket.State == WebSocketState.Open) {
                this.stopStream();
                networkingCancelation.Cancel(false);
            }
        }

        public static bool checkConfiguration(IConfigurationRoot config) {
            return config.GetSection("zello:username").Exists() &&
                config.GetSection("zello:password").Exists() &&
                config.GetSection("zello:token").Exists() &&
                config.GetSection("zello:channel").Exists() &&
                config.GetSection("media:filename").Exists();
        }

        public bool authenticate() {
            try {
                if (!this.webSocket.ConnectAsync(new Uri(ZelloMediaStream.url),
                    this.networkingCancelation.Token).Wait(ZelloMediaStream.timeoutMS,
                    this.networkingCancelation.Token))
                {
                    Console.WriteLine("Failed to connect to Zello server");
                    return false;
                }

                var logonJson = new {
                    seq = 1,
                    command = "logon",
                    username = this.configuration["zello:username"],
                    password = this.configuration["zello:password"],
                    auth_token = this.configuration["zello:token"],
                    channel = this.configuration["zello:channel"]
                };
                byte[] logonCmd = System.Text.Encoding.UTF8.GetBytes(JsonSerializer.Serialize(logonJson));
                bool isAuthorized = false;
                bool isChannelAvailable = false;

                webSocket.SendAsync(logonCmd, WebSocketMessageType.Text, true, this.networkingCancelation.Token).
                    Wait(timeoutMS, this.networkingCancelation.Token);
                 
                while (!isAuthorized || !isChannelAvailable) {
                    Array.Clear(this.rcvBuffer, 0, this.rcvBuffer.Length);
                    if (!webSocket.ReceiveAsync(this.rcvBuffer, this.networkingCancelation.Token).
                        Wait(ZelloMediaStream.timeoutMS, this.networkingCancelation.Token))
                    {
                        Console.WriteLine("Failed to get response from server");
                        return false;
                    }

                    string responseStr = System.Text.Encoding.UTF8.GetString(this.rcvBuffer).TrimEnd('\0');
                    ResponseJson responseJson = new ResponseJson();

                    try {
                        responseJson = JsonSerializer.Deserialize<ResponseJson>(responseStr);
                    } catch {
                        Console.WriteLine("Failed to parse json response");
                        continue;
                    }

                    if (!String.IsNullOrEmpty(responseJson.refresh_token)) {
                        isAuthorized = true;
                    } else if (responseJson.command == "on_channel_status" && responseJson.status == "online") {
                        isChannelAvailable = true;
                    }
                }
            } catch {
                Console.WriteLine("Failed to communicate with Zello server");
                return false;
            } 
            return true;
        }

        public bool startStream() {
            byte[] codecHeaderRaw = new byte[4];
            byte packetDuration = (byte)this.opusStream.packetDuration;
            byte framesPerPacket = (byte)this.opusStream.framesPerPacket;
            UInt16 sampleRate = (UInt16)this.opusStream.sampleRate;

            // sampleRate is represented in two bytes in little endian.
            // https://github.com/zelloptt/zello-channel-api/blob/409378acd06257bcd07e3f89e4fbc885a0cc6663/sdks/js/src/classes/utils.js#L63
            BinaryPrimitives.TryWriteUInt16LittleEndian(codecHeaderRaw, sampleRate);
            codecHeaderRaw[2] = (byte)this.opusStream.framesPerPacket;
            codecHeaderRaw[3] = packetDuration;

            string codecHeader = Convert.ToBase64String(codecHeaderRaw);
            var startStreamJson = new {
                seq = 2,
                command = "start_stream",
                type = "audio",
                codec = "opus",
                codec_header = codecHeader,
                packet_duration = packetDuration,
            };
            byte[] startStreamCmd = System.Text.Encoding.UTF8.
                GetBytes(JsonSerializer.Serialize(startStreamJson));

            this.webSocket.
                SendAsync(startStreamCmd, WebSocketMessageType.Text, true, this.networkingCancelation.Token).
                Wait(ZelloMediaStream.timeoutMS, this.networkingCancelation.Token);
            
            Array.Clear(this.rcvBuffer, 0, this.rcvBuffer.Length);
            if (!this.webSocket.
                ReceiveAsync(this.rcvBuffer, this.networkingCancelation.Token).
                Wait(ZelloMediaStream.timeoutMS, this.networkingCancelation.Token))
            {
                Console.WriteLine("Failed to get response from Zello server");
                return false;
            }

            string responseStr = System.Text.Encoding.UTF8.GetString(this.rcvBuffer).TrimEnd('\0');
            ResponseJson responseJson = new ResponseJson();

            try {
                responseJson = JsonSerializer.Deserialize<ResponseJson>(responseStr);
            } catch {
                Console.WriteLine("Failed to parse json response");
                return false;
            }

            if (responseJson.success && responseJson.stream_id != 0) {
                this.streamId = responseJson.stream_id;
                return true;
            }
            return false;            
        }

        private byte[] getNextStreamPacket() {
            byte[] opusData = this.opusStream.GetNextOpusPacket();
            byte[] streamIdRaw = new byte[4];
            byte[] packetIdRaw = new byte[4];

            if (opusData is null) {
                return null;
            }
            this.packetId++;
            byte[] streamPacket = new byte[opusData.Length + 9];
            BinaryPrimitives.TryWriteUInt32BigEndian(streamIdRaw, this.streamId);
            BinaryPrimitives.TryWriteUInt32BigEndian(packetIdRaw, this.packetId);

            streamPacket[0] = 1;
            streamIdRaw.CopyTo(streamPacket, 1);
            packetIdRaw.CopyTo(streamPacket, 5);
            opusData.CopyTo(streamPacket, 9);
            return streamPacket;            
        }

        public bool sendAudio() {
            try {
                // Listen on the opened websocket, connection may be closed otherwise.
                this.webSocket.ReceiveAsync(rcvBuffer, this.networkingCancelation.Token);
            } catch (Exception e) {
                Console.WriteLine("Unable to listen on websocket: " + e.Message);
                return false;
            }

            while (true) {
                this.stopWatch.Reset();
                this.stopWatch.Start();
                byte[] packet = this.getNextStreamPacket();
                if (packet is null) {
                    break;
                }
                try {
                    this.webSocket.
                        SendAsync(packet, WebSocketMessageType.Binary, true, this.networkingCancelation.Token).
                        Wait(this.opusStream.packetDuration, this.networkingCancelation.Token);
                } catch (Exception e) {
                    Console.WriteLine("Got error while sending audio: " + e);
                    return false;
                }
                this.stopWatch.Stop();
                if (this.opusStream.packetDuration > this.stopWatch.ElapsedMilliseconds) {
                    Thread.Sleep(this.opusStream.packetDuration - (int)this.stopWatch.ElapsedMilliseconds);
                }
            }
            return true;
        }

        public bool stopStream() {
            var stopStreamJson = new {
                command = "stop_stream",
                stream_id = this.streamId,
            };
            byte[] stopStreamCmd = System.Text.Encoding.UTF8.GetBytes(JsonSerializer.Serialize(stopStreamJson));
            return this.webSocket.
                SendAsync(stopStreamCmd, WebSocketMessageType.Text, true, this.networkingCancelation.Token).
                Wait(ZelloMediaStream.timeoutMS, this.networkingCancelation.Token);
        }
    }

    class Program
    {
        static void Main(string[] args)
        {
            IConfigurationRoot config = null;

            try {
                config = new ConfigurationBuilder().
                    SetBasePath(Directory.GetCurrentDirectory()).
                    AddIniFile("stream.conf").Build();
            } catch {
                Console.WriteLine("Failed to open a config file");
                return;
            }
            
            if (!ZelloMediaStream.checkConfiguration(config)) {
                Console.WriteLine("Invalid config file. See example");
                return;
            }

            ZelloMediaStream zelloMediaStream = null;
            try {
                zelloMediaStream = new ZelloMediaStream(config);

                if (!zelloMediaStream.authenticate()) {
                    Console.WriteLine("Failed to authenticate");
                    return;
                }
                if (!zelloMediaStream.startStream()) {
                    Console.WriteLine("Failed to start streaming");
                    return;
                }
                if (!zelloMediaStream.sendAudio()) {
                    Console.WriteLine("Error during sending audio");
                }
                if (!zelloMediaStream.stopStream()) {
                    Console.WriteLine("Failed to send stop stream request");
                }
            } catch (Exception e){
                Console.WriteLine("Got an error: " + e.Message);
                return;
            } finally {
                if (zelloMediaStream != null) {
                    zelloMediaStream.Dispose();
                }
            }
        }
    }
}
