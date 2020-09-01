namespace ZelloMediaStream
{
    using System;
    using System.IO;
    using System.Net.WebSockets;
    using System.Threading;
    using System.Text.Json;
    using System.Buffers.Binary;
    using Microsoft.Extensions.Configuration;
    using OpusStream;

    class ZelloMediaStream : IDisposable {
        private OpusFileStream opusStream;
        private IConfigurationRoot configuration;
        private CancellationTokenSource networkingCancelation;
        private ClientWebSocket webSocket;
        private UInt32 streamId;
        private UInt32 packetId;
        byte[] rcvBuffer;
        const string url = "wss://zello.io/ws";
        const int timeoutMS = 5000;

        public class ResponseJson {
            public string command { get; set; }
            public string status { get; set; }
            public string refresh_token { get; set; }
            public bool success { get; set; }
            public UInt32 stream_id { get; set; }
        };

        public ZelloMediaStream(string configFileName) {
            if (!checkConfiguration(configFileName)) {
                throw new Exception("Invalid configuration");
            }
            this.webSocket = new ClientWebSocket();
            this.networkingCancelation = new CancellationTokenSource();
            this.rcvBuffer = new byte[1024];
            this.webSocket.Options.SetBuffer(this.rcvBuffer.Length, this.rcvBuffer.Length,
                this.rcvBuffer);
            this.webSocket.Options.KeepAliveInterval = new TimeSpan(0, 0, 10);
            this.opusStream = new OpusFileStream(this.configuration["media:filename"]);
        }

        public void Dispose() {
            if (this.opusStream != null) {
                this.opusStream.Dispose();
            }
            if (this.webSocket.State == WebSocketState.Open) {
                this.StopStream();
                networkingCancelation.Cancel(false);
            }
        }

        private bool checkConfiguration(string configFileName) {
            try {
                this.configuration = new ConfigurationBuilder().
                    SetBasePath(Directory.GetCurrentDirectory()).
                    AddIniFile(configFileName).Build();
            } catch (Exception e) {
                throw new Exception("Failed to open a config file. " + e.Message);
            }
            return this.configuration.GetSection("zello:username").Exists() &&
                this.configuration.GetSection("zello:password").Exists() &&
                this.configuration.GetSection("zello:token").Exists() &&
                this.configuration.GetSection("zello:channel").Exists() &&
                this.configuration.GetSection("media:filename").Exists();
        }

        private bool sendJson(dynamic json) {
            try {
                byte[] cmd = System.Text.Encoding.UTF8.GetBytes(JsonSerializer.Serialize(json));
                var task = this.webSocket.SendAsync(cmd, WebSocketMessageType.Text, true, this.networkingCancelation.Token);
                if (task.Wait(ZelloMediaStream.timeoutMS, this.networkingCancelation.Token)) {
                    return true;
                }
            } catch {}
            Console.WriteLine("Failed to send json data to Zello server");
            return false;
        }

        private dynamic receiveJson() {
            Array.Clear(this.rcvBuffer, 0, this.rcvBuffer.Length);
            try {
                var task = this.webSocket.ReceiveAsync(this.rcvBuffer, this.networkingCancelation.Token);
                if (task.Wait(ZelloMediaStream.timeoutMS, this.networkingCancelation.Token)) {
                    string responseStr = System.Text.Encoding.UTF8.GetString(this.rcvBuffer).TrimEnd('\0');
                    ResponseJson responseJson = JsonSerializer.Deserialize<ResponseJson>(responseStr);
                    return responseJson;
                }
            } catch {}
            Console.WriteLine("Failed to get json data from Zello server");
            return null;
        }

        public bool Connect() {
            try {
                var endpoint = new Uri(ZelloMediaStream.url);
                var task = this.webSocket.ConnectAsync(endpoint, this.networkingCancelation.Token);
                if (task.Wait(ZelloMediaStream.timeoutMS, this.networkingCancelation.Token)) {
                    return true;
                }
            } catch {}
            Console.WriteLine("Failed to connect to Zello server");
            return false;
        }

        public bool Authenticate() {
            bool isAuthorized = false;
            bool isChannelAvailable = false;
            bool isSent = this.sendJson(new {
                    seq = 1,
                    command = "logon",
                    username = this.configuration["zello:username"],
                    password = this.configuration["zello:password"],
                    auth_token = this.configuration["zello:token"],
                    channel = this.configuration["zello:channel"]
                });

            if (!isSent) {
                return false;
            }
     
            while (!isAuthorized || !isChannelAvailable) {
                ResponseJson responseJson = this.receiveJson();
                if (responseJson is null) {
                    return false;
                }
                if (!String.IsNullOrEmpty(responseJson.refresh_token)) {
                    isAuthorized = true;
                } else if (responseJson.command == "on_channel_status" && responseJson.status == "online") {
                    isChannelAvailable = true;
                } else {
                    return false;
                }
            }
            return true;
        }

        public bool StartStream() {
            byte[] codecHeaderRaw = new byte[4];
            byte packetDurationMs = (byte)this.opusStream.packetDurationMs;
            byte framesPerPacket = (byte)this.opusStream.framesPerPacket;
            UInt16 sampleRate = (UInt16)this.opusStream.sampleRate;

            // sampleRate is represented in two bytes in little endian.
            // https://github.com/zelloptt/zello-channel-api/blob/409378acd06257bcd07e3f89e4fbc885a0cc6663/sdks/js/src/classes/utils.js#L63
            BinaryPrimitives.TryWriteUInt16LittleEndian(codecHeaderRaw, sampleRate);
            codecHeaderRaw[2] = (byte)this.opusStream.framesPerPacket;
            codecHeaderRaw[3] = packetDurationMs;
            string codecHeader = Convert.ToBase64String(codecHeaderRaw);
            bool isSent = this.sendJson(new {
                seq = 2,
                command = "start_stream",
                type = "audio",
                codec = "opus",
                codec_header = codecHeader,
                packet_duration = packetDurationMs,
            });

            if (!isSent) {
                return false;
            }

            ResponseJson responseJson = this.receiveJson();
            if (responseJson != null && responseJson.success && responseJson.stream_id != 0) {
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

        public bool SendAudio() {
            try {
                // Listen on the opened websocket, connection may be closed otherwise.
                this.webSocket.ReceiveAsync(rcvBuffer, this.networkingCancelation.Token);
            } catch (Exception e) {
                Console.WriteLine("Unable to listen on websocket: " + e.Message);
                return false;
            }

            byte[] packet = this.getNextStreamPacket();
            long tsBeginMs = DateTime.UtcNow.Ticks / TimeSpan.TicksPerMillisecond;
            long timeStreamingMs = 0;
            long timeElapsedMs = 0;
            int sleepDelayMs;

            while (packet != null) {
                try {
                    var task = this.webSocket.SendAsync(packet, WebSocketMessageType.Binary, true,
                        this.networkingCancelation.Token);
                    if (!task.Wait(this.opusStream.packetDurationMs, this.networkingCancelation.Token)) {
                        Console.WriteLine("Timeout");
                        continue;
                    }
                } catch (Exception e) {
                    Console.WriteLine("Got an error while sending audio: " + e.Message);
                    return false;
                }
                
                packet = this.getNextStreamPacket();
                timeStreamingMs += this.opusStream.packetDurationMs;
                timeElapsedMs = (DateTime.UtcNow.Ticks / TimeSpan.TicksPerMillisecond) - tsBeginMs;
                sleepDelayMs = (int)(timeStreamingMs - timeElapsedMs);
                if (sleepDelayMs > 1) {
                    Thread.Sleep(sleepDelayMs);
                }
            }
            return true;
        }

        public bool StopStream() {
            return this.sendJson(new {
                command = "stop_stream",
                stream_id = this.streamId,
            });
        }
    }
}
