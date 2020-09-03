namespace OpusStream
{
    using System;
    using System.IO;
    using Concentus.Oggfile;
    using Concentus.Structs;

    class OpusFileStream : IZelloOpusStream
    {
        private FileStream OpusFile;
        private OpusOggReadStream OpusOggReadStream;
        private OpusDecoder Decoder;
        public UInt32 SampleRate { get; }
        public int PacketDurationMs { get; }
        public int FramesPerPacket { get; }
        private byte[] FirstPacket;

        public void Dispose() {
            if (this.OpusFile == null) {
                return;
            }
            this.OpusFile.Dispose();
        }

        public OpusFileStream(string filename) {
            this.OpusFile = new FileStream(filename, FileMode.Open);            
            this.Decoder = new OpusDecoder(48000, 1);
            this.OpusOggReadStream = new OpusOggReadStream(this.Decoder, this.OpusFile);

            if (!this.OpusOggReadStream.HasNextPacket) {
                throw new Exception("No opus packets found");
            }

            this.SampleRate = this.OpusOggReadStream.InputSampleRate;
            this.FirstPacket = this.OpusOggReadStream.RetrieveNextPacket();
            this.FramesPerPacket = OpusPacketInfo.GetNumFrames(this.FirstPacket, 0, this.FirstPacket.Length);
            int SamplesPerPacket = OpusPacketInfo.GetNumSamples(this.FirstPacket, 0, this.FirstPacket.Length, 48000);
            this.PacketDurationMs = (SamplesPerPacket * 1000) / (int)this.SampleRate;
        }

        public byte[] GetNextOpusPacket() {
            if (this.FirstPacket != null) {
                byte[] packet = this.FirstPacket;
                this.FirstPacket = null;
                return packet;
            }

            if (!this.OpusOggReadStream.HasNextPacket) {
                return null;
            }

            return this.OpusOggReadStream.RetrieveNextPacket();
        }
    }
}