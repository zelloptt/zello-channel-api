namespace OpusStream
{
    using System;

    interface IZelloOpusStream : IDisposable
    {
        UInt32 SampleRate { get; }
        int PacketDurationMs { get; }
        int FramesPerPacket { get; }
        byte[] GetNextOpusPacket();
    }
}