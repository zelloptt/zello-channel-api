namespace OpusStream
{
    using System;

    interface IZelloOpusStream : IDisposable
    {
        string FileName { get; }
        UInt32 SampleRate { get; }
        int PacketDurationMs { get; }
        int FramesPerPacket { get; }
        byte[] GetNextOpusPacket();
    }
}