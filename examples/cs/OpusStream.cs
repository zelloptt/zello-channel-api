namespace OpusStream
{
    using System;
    using System.IO;
    using System.Collections.Generic;

    // https://tools.ietf.org/html/rfc7845
    // https://tools.ietf.org/html/rfc3533
    class OpusFileStream : IZelloOpusStream
    {
        Stream OpusFile;
	byte[] SegmentSizes;
        byte SegmentIndex;
        byte SegmentsCount;
        UInt32 SequenceNumber;
        int OpusHeadersCount;
        List<byte[]> SavedPackets;
        public string FileName {get; private set; }
        public UInt32 SampleRate { get; private set; }
        public int PacketDurationMs { get; private set; }
        public int FramesPerPacket { get; private set; }

        public OpusFileStream(string filename)
        {
            this.FileName = filename;
            try
            {
                this.OpusFile = File.OpenRead(filename);
            }
            catch (Exception e)
            {
                throw new Exception("Failed opening " + filename, e);
            }
            this.SegmentSizes = new byte[255];
            this.SavedPackets = new List<byte[]>();
            if (!this.FillOpusConfig())
            {
                throw new Exception("Failed to fill Opus configuration");
            }
        }

        public void Dispose()
        {
            if (this.OpusFile != null)
            {
                this.OpusFile.Dispose();
            }
        }

        private bool GetNextOggPacketStart()
        {
            // Each Ogg page starts with magic bytes "OggS"
            // Stream may be corrupted, so find a first valid magic
            int verifiedBytes = 0;
            byte[] magic = System.Text.Encoding.UTF8.GetBytes("OggS");
            byte[] onebyte = new byte[1];
            try
            {
                while (this.OpusFile.Read(onebyte, 0, 1) == 1)
                {
                    if (onebyte[0] == magic[verifiedBytes])
                    {
                        verifiedBytes++;
                        if (verifiedBytes == 4)
                        {
                            return true;
                        }
                    }
                    else
                    {
                        verifiedBytes = 0;
                    }
                }
            }
            catch (Exception e)
            {
                throw new Exception("Failed reading media while looking for next Ogg packet", e);
            }
            return false;
        }

        private bool ParseOggPacketHeader()
        {
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
            try
            {
                if (this.OpusFile.Read(header, 0, header.Length) != header.Length)
                {
                    return false;
                }
            }
            catch (Exception e)
            {
                throw new Exception("Failed reading media while parsing Ogg packet header", e);
            }

            if (!BitConverter.IsLittleEndian)
            {
                Array.Reverse(header, 2, 8);
                Array.Reverse(header, 10, 4);
                Array.Reverse(header, 14, 4);
                Array.Reverse(header, 18, 4);
            }

            byte version = header[0];
            byte headerType = header[1];
            UInt64 granule = BitConverter.ToUInt64(header, 2);
            UInt32 serialNum = BitConverter.ToUInt32(header, 10);
            this.SequenceNumber = BitConverter.ToUInt32(header, 14);
            UInt32 checksum = BitConverter.ToUInt32(header, 18);
            this.SegmentsCount = header[22];
            this.SegmentIndex = 0;
            if (this.SegmentsCount > 0)
            {
                this.SegmentSizes = new byte[this.SegmentsCount];
                try
                {
                    if (this.OpusFile.Read(this.SegmentSizes, 0, this.SegmentsCount) != this.SegmentsCount)
                    {
                        return false;
                    }
                }
                catch (Exception e)
                {
                    throw new Exception("Failed reading media while fetching Ogg page segment table", e);
                }
            }
            return true;
        }

        private (byte[], bool) GetOggSegmentData()
        {
            bool isContinueNeeded = false;
            byte[] data = new byte[0];

            // Read data from the next segment according to the sizes table page_segments.
            // The length of 255 indicates the data requires continuing from the next
            // segment. The data from the last segment may still require continuing.
            // Return the bool isContinueNeeded to accumulate such lacing data.
            while (this.SegmentIndex < this.SegmentsCount)
            {
                byte segmentSize = this.SegmentSizes[this.SegmentIndex];
                byte[] segment = new byte[segmentSize];
                try
                {
                    if (this.OpusFile.Read(segment, 0, segmentSize) != segmentSize)
                    {
                        break;
                    }
                }
                catch (Exception e)
                {
                    throw new Exception("Failed reading media while fetching Ogg page segment", e);
                }

                byte[] newdata = new byte[data.Length + segmentSize];
                data.CopyTo(newdata, 0);
                segment.CopyTo(newdata, data.Length);
                data = newdata;
                isContinueNeeded = (segmentSize == 255);
                this.SegmentIndex++;
                if (!isContinueNeeded)
                {
                    break;
                }
            }
            return (data, isContinueNeeded);
        }

        private bool ParseOpusHeadHeader(byte[] data)
        {
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
            for (int i = 0; i < magic.Length; i++)
            {
                if (magic[i] != data[i])
                {
                    return false;
                }
            }

            byte version = data[8];
            byte channels = data[9];
            if (!BitConverter.IsLittleEndian)
            {
                Array.Reverse(data, 10, 2);
                Array.Reverse(data, 12, 4);
            }

            UInt16 preskip = BitConverter.ToUInt16(data, 10);
            this.SampleRate = BitConverter.ToUInt32(data, 12);
            return true;
        }

        private bool ParseOpusTagsHeader(byte[] data)
        {
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
            for (int i = 0; i < magic.Length; i++)
            {
                if (magic[i] != data[i])
                {
                    return false;
                }
            }
            return true;
        }

        private (int, int) ParseOpusToc(byte[] data)
        {
            // https://tools.ietf.org/html/rfc6716#section-3.1
            // Each Opus packet starts with the Table Of Content Byte:
            // |0 1 2 3 4 5 6 7| Bit
            // +-+-+-+-+-+-+-+-+
            // | config  |s| c |
            // +-+-+-+-+-+-+-+-+
            byte tocC = (byte)(data[0] & 0x03);
            int frames;
            if (tocC == 0)
            {
                frames = 1;
            }
            else if (tocC == 1 || tocC == 2)
            {
                frames = 2;
            }
            else
            {
                // API requires predefined number of frames per packet
                Console.WriteLine("An arbitrary number of frames in the packet - possible audio arifacts");
                frames = 1;
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
            for (int i = 0; i < configsMS.Count; i++)
            {
                if (Array.Exists(configsMS[i], conf => (conf == config)))
                {
                    // The packet duration 2.5ms is not supported
                    return (frames, (int)durations[i]);
                }
            }
            return (frames, 20);
        }

        private bool AllHeadersParsed()
        {
            // There are three mandatory headers. Don't send data until the headers are parsed.
            return (this.OpusHeadersCount >= 3);
        }

        public byte[] GetNextOpusPacket()
        {
            byte[] segmentData;
            byte[] data = new byte[0];
            bool isContinueNeeded = false;

            // The Table Of Contents byte has been read from the first audio data segment
            // stored in the SavedPackets list.
            if (this.AllHeadersParsed() && this.SavedPackets.Count > 0)
            {
                data = this.SavedPackets[0];
                this.SavedPackets.RemoveAt(0);
                return data;
            }

            while (true)
            {
                // Move to the next Ogg packet if the current one has been read completely
                if (this.SegmentsCount == 0 || this.SegmentIndex >= this.SegmentsCount)
                {
                    UInt32 lastSeqNum = this.SequenceNumber;

                    if (!this.GetNextOggPacketStart() || !this.ParseOggPacketHeader())
                    {
                        return null;
                    }

                    // Drop current Ogg packet if continuation sequence is broken
                    if (isContinueNeeded && (lastSeqNum + 1) != this.SequenceNumber)
                    {
                        isContinueNeeded = false;
                        this.SegmentsCount = 0;
                        data = new byte[0];
                        Console.WriteLine("Skipping frame: continuation sequence is broken");
                        continue;
                    }
                }

                // Get another chunk of data from the parsed Ogg page
                (segmentData, isContinueNeeded) = this.GetOggSegmentData();
                byte[] newdata = new byte[data.Length + segmentData.Length];
                data.CopyTo(newdata, 0);
                segmentData.CopyTo(newdata, data.Length);
                data = newdata;

                // The last data chunk may require continuing in the next Ogg page
                if (isContinueNeeded)
                {
                    continue;
                }

                // Do not send Opus headers
                if (!this.AllHeadersParsed())
                {
                    this.ParseOpusHeaders(data);
                    data = new byte[0];
                    continue;
                }

                // Verify the Opus TOC is the same as we initially declared
                (int frames, int duration) = this.ParseOpusToc(data);
                if (this.FramesPerPacket != frames || this.PacketDurationMs != duration)
                {
                    data = new byte[0];
                    Console.WriteLine("Skipping frame - TOC differs");
                    continue;
                }
                break;
            }
            return data;
        }

        private void ParseOpusHeaders(byte[] data)
        {
            // Header #1: OpusHead
            // Header #2: OpusTags
            // Header #3: Table Of Contents byte from the first Opus packet
            if (this.OpusHeadersCount < 1)
            {
                if (this.ParseOpusHeadHeader(data))
                {
                    this.OpusHeadersCount++;
                }
            }
            else if (this.OpusHeadersCount < 2)
            {
                if (this.ParseOpusTagsHeader(data))
                {
                    this.OpusHeadersCount++;
                }
            }
            else if (this.OpusHeadersCount < 3)
            {
                (this.FramesPerPacket, this.PacketDurationMs) = this.ParseOpusToc(data);
                this.OpusHeadersCount++;
                this.SavedPackets.Add(data);
            }
        }

        private bool FillOpusConfig()
        {
            while (!this.AllHeadersParsed())
            {
                byte[] packet = this.GetNextOpusPacket();
                if (packet == null)
                {
                    return false;
                }
            }
            return true;
        }
    }
}
