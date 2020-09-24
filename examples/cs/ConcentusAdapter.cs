namespace OpusStream
{
    using System;
    using System.IO;
    using Concentus.Oggfile;
    using Concentus.Structs;

    class OpusFileStream : IZelloOpusStream
    {
        private const int DefaultSampleRate = 48000;
        private FileStream OpusFile;
        private OpusOggReadStream OpusOggReadStream;
        private OpusDecoder Decoder;
        private byte[] FirstPacket;
        public string FileName { get; }
        public UInt32 SampleRate { get; }
        public int PacketDurationMs { get; }
        public int FramesPerPacket { get; }

        public void Dispose()
        {
            if (this.OpusFile == null)
            {
                return;
            }
            this.OpusFile.Dispose();
        }

        public OpusFileStream(string filename)
        {
            int samplesPerPacket;

            this.FileName = filename;
            this.OpusFile = new FileStream(filename, FileMode.Open);
            this.Decoder = new OpusDecoder(DefaultSampleRate, 1);
            this.OpusOggReadStream = new OpusOggReadStream(this.Decoder, this.OpusFile);

            if (!this.OpusOggReadStream.HasNextPacket)
            {
                throw new Exception("No opus packets found");
            }

            this.SampleRate = this.OpusOggReadStream.InputSampleRate;
            this.FirstPacket = this.OpusOggReadStream.RetrieveNextPacket();
            this.FramesPerPacket = OpusPacketInfo.GetNumFrames(this.FirstPacket, 0, this.FirstPacket.Length);
            samplesPerPacket = OpusPacketInfo.GetNumSamples(this.FirstPacket, 0, this.FirstPacket.Length, (int)this.SampleRate);
            this.PacketDurationMs = (samplesPerPacket * 1000) / (int)this.SampleRate;
        }

        public byte[] GetNextOpusPacket()
        {
            if (this.FirstPacket != null)
            {
                byte[] packet = this.FirstPacket;

                this.FirstPacket = null;
                return packet;
            }

            if (!this.OpusOggReadStream.HasNextPacket)
            {
                return null;
            }

            return this.OpusOggReadStream.RetrieveNextPacket();
        }
    }
}
