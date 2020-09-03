namespace OpusStream
{
    using System;
    using System.IO;
    using Concentus.Oggfile;
    using Concentus.Structs;

    class OpusFileStream : IZelloOpusStream {
        private FileStream opusFile;
        private OpusOggReadStream opusOggReadStream;
        private OpusDecoder decoder;
        public UInt32 sampleRate { get; }
        public int packetDurationMs { get; }
        public int framesPerPacket { get; }
        private byte[] firstPacket;

        public void Dispose() {
            if (this.opusFile is null) {
                return;
            }
            this.opusFile.Dispose();
        }

        public OpusFileStream(string filename) {
            this.opusFile = new FileStream(filename, FileMode.Open);            
            this.decoder = new OpusDecoder(48000, 1);
            this.opusOggReadStream = new OpusOggReadStream(this.decoder, this.opusFile);

            if (!this.opusOggReadStream.HasNextPacket) {
                throw new Exception("No opus packets found");
            }

            this.sampleRate = this.opusOggReadStream.InputSampleRate;
            this.firstPacket = this.opusOggReadStream.RetrieveNextPacket();
            this.framesPerPacket = OpusPacketInfo.GetNumFrames(this.firstPacket, 0, this.firstPacket.Length);
            int samplesPerPacket = OpusPacketInfo.GetNumSamples(this.firstPacket, 0, this.firstPacket.Length, 48000);
            this.packetDurationMs = (samplesPerPacket * 1000) / (int)this.sampleRate;
        }

        public byte[] GetNextOpusPacket() {
            if (this.firstPacket != null) {
                byte[] packet = this.firstPacket;
                this.firstPacket = null;
                return packet;
            }

            if (!this.opusOggReadStream.HasNextPacket) {
                return null;
            }
            
            return this.opusOggReadStream.RetrieveNextPacket();
        }
    }
}