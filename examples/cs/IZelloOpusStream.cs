namespace OpusStream
{
    using System;

    interface IZelloOpusStream : IDisposable {
        UInt32 sampleRate { get; }
        int packetDurationMs { get; }
        int framesPerPacket { get; }
        byte[] GetNextOpusPacket();
    }
}