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

    class ZelloMediaStream : IDisposable
    {
        private OpusFileStream OpusStream;
        private IConfigurationRoot Configuration;
        private CancellationTokenSource NetworkingCancelation;
        private ClientWebSocket WebSocket;
        private UInt32 StreamId;
        private UInt32 PacketId;
        byte[] RcvBuffer;
        const string Url = "wss://zello.io/ws";
        const int TimeoutMS = 5000;

        public class ResponseJson 
        {
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
            this.WebSocket = new ClientWebSocket();
            this.NetworkingCancelation = new CancellationTokenSource();
            this.RcvBuffer = new byte[1024];
            this.WebSocket.Options.SetBuffer(this.RcvBuffer.Length, this.RcvBuffer.Length,
                this.RcvBuffer);
            this.WebSocket.Options.KeepAliveInterval = new TimeSpan(0, 0, 10);
            this.OpusStream = new OpusFileStream(this.Configuration["media:filename"]);
        }

        public void Dispose() {
            if (this.OpusStream != null) {
                this.OpusStream.Dispose();
            }
            if (this.WebSocket.State == WebSocketState.Open) {
                this.StopStream();
                NetworkingCancelation.Cancel(false);
            }
        }

        private bool checkConfiguration(string configFileName) {
            try {
                this.Configuration = new ConfigurationBuilder().
                    SetBasePath(Directory.GetCurrentDirectory()).
                    AddIniFile(configFileName).Build();
            } catch (Exception e) {
                throw new Exception("Failed to open a config file. " + e.Message);
            }
            return this.Configuration.GetSection("zello:username").Exists() &&
                this.Configuration.GetSection("zello:password").Exists() &&
                this.Configuration.GetSection("zello:token").Exists() &&
                this.Configuration.GetSection("zello:channel").Exists() &&
                this.Configuration.GetSection("media:filename").Exists();
        }

        private bool sendJson(dynamic json) {
            try {
                byte[] cmd = System.Text.Encoding.UTF8.GetBytes(JsonSerializer.Serialize(json));
                var task = this.WebSocket.SendAsync(cmd, WebSocketMessageType.Text, true, this.NetworkingCancelation.Token);
                if (task.Wait(ZelloMediaStream.TimeoutMS, this.NetworkingCancelation.Token)) {
                    return true;
                }
            } catch {}
            Console.WriteLine("Failed to send json data to Zello server");
            return false;
        }

        private dynamic receiveJson() {
            Array.Clear(this.RcvBuffer, 0, this.RcvBuffer.Length);
            try {
                var task = this.WebSocket.ReceiveAsync(this.RcvBuffer, this.NetworkingCancelation.Token);
                if (task.Wait(ZelloMediaStream.TimeoutMS, this.NetworkingCancelation.Token)) {
                    string responseStr = System.Text.Encoding.UTF8.GetString(this.RcvBuffer).TrimEnd('\0');
                    ResponseJson responseJson = JsonSerializer.Deserialize<ResponseJson>(responseStr);
                    return responseJson;
                }
            } catch {}
            Console.WriteLine("Failed to get json data from Zello server");
            return null;
        }

        public bool Connect() {
            try {
                var endpoint = new Uri(ZelloMediaStream.Url);
                var task = this.WebSocket.ConnectAsync(endpoint, this.NetworkingCancelation.Token);
                if (task.Wait(ZelloMediaStream.TimeoutMS, this.NetworkingCancelation.Token)) {
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
                    username = this.Configuration["zello:username"],
                    password = this.Configuration["zello:password"],
                    auth_token = this.Configuration["zello:token"],
                    channel = this.Configuration["zello:channel"]
                });

            if (!isSent) {
                return false;
            }
     
            while (!isAuthorized || !isChannelAvailable) {
                ResponseJson responseJson = this.receiveJson();
                if (responseJson == null) {
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
            byte packetDurationMs = (byte)this.OpusStream.PacketDurationMs;
            byte framesPerPacket = (byte)this.OpusStream.FramesPerPacket;
            UInt16 sampleRate = (UInt16)this.OpusStream.SampleRate;

            // sampleRate is represented in two bytes in little endian.
            // https://github.com/zelloptt/zello-channel-api/blob/409378acd06257bcd07e3f89e4fbc885a0cc6663/sdks/js/src/classes/utils.js#L63
            BinaryPrimitives.TryWriteUInt16LittleEndian(codecHeaderRaw, sampleRate);
            codecHeaderRaw[2] = (byte)this.OpusStream.FramesPerPacket;
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
                this.StreamId = responseJson.stream_id;
                return true;
            }
            return false;            
        }

        private byte[] getNextStreamPacket() {
            byte[] opusData = this.OpusStream.GetNextOpusPacket();
            byte[] streamIdRaw = new byte[4];
            byte[] packetIdRaw = new byte[4];

            if (opusData == null) {
                return null;
            }
            this.PacketId++;
            byte[] streamPacket = new byte[opusData.Length + 9];
            BinaryPrimitives.TryWriteUInt32BigEndian(streamIdRaw, this.StreamId);
            BinaryPrimitives.TryWriteUInt32BigEndian(packetIdRaw, this.PacketId);

            streamPacket[0] = 1;
            streamIdRaw.CopyTo(streamPacket, 1);
            packetIdRaw.CopyTo(streamPacket, 5);
            opusData.CopyTo(streamPacket, 9);
            return streamPacket;            
        }

        public bool SendAudio() {
            try {
                // Listen on the opened websocket, connection may be closed otherwise.
                this.WebSocket.ReceiveAsync(RcvBuffer, this.NetworkingCancelation.Token);
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
                    var task = this.WebSocket.SendAsync(packet, WebSocketMessageType.Binary, true,
                        this.NetworkingCancelation.Token);
                    if (!task.Wait(this.OpusStream.PacketDurationMs, this.NetworkingCancelation.Token)) {
                        Console.WriteLine("Timeout");
                        continue;
                    }
                } catch (Exception e) {
                    Console.WriteLine("Got an error while sending audio: " + e.Message);
                    return false;
                }
                
                packet = this.getNextStreamPacket();
                timeStreamingMs += this.OpusStream.PacketDurationMs;
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
                stream_id = this.StreamId,
            });
        }
    }
}
