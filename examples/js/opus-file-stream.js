var fs = require('fs');

class OpusFileStream {
    // https://tools.ietf.org/html/rfc7845
    // https://tools.ietf.org/html/rfc3533
    constructor(filename, onCompleteCb) {
        fs.open(filename, 'r', (err, fd) => {
            if (err) {
                console.error("Failed to open opus file ", filename);
                console.error(err.message);
                return onCompleteCb(null);
            }
            this.opusfile = fd;
            this.segmentSizes = new Uint8Array(255);
            this.segmentIndex = 0;
            this.segmentsCount = 0;
            this.sequenceNumber = (- 1);
            this.opusHeadersCount = 0;
            this.packetDurationMs = 0;
            this.framesPerPacket = 0;
            this.savedPackets = [];
            this.fillOpusConfig((success) => {
                return onCompleteCb(success ? this : null);
            });
        });
    }

    getNextOggPacketStart(onCompleteCb) {
        // Each Ogg page starts with magic bytes "OggS"
        // Stream may be corrupted, so find a first valid magic
        var verifiedBytes = 0;
        const magic = new TextEncoder("utf-8").encode("OggS");
        var readbyte = new Uint8Array(1);

        const readByteCb = function(err, bytesRead, buf) {
            if (err || bytesRead !== 1) {
                return onCompleteCb(false);
            }
            if (buf[0] === magic[verifiedBytes]) {
                verifiedBytes++;
                if (verifiedBytes === 4) {
                    return onCompleteCb(true);
                }
            } else {
                verifiedBytes = 0;
            }
            fs.read(this.opusfile, buf, 0, 1, null, readByteCb.bind(this));
        }

        fs.read(this.opusfile, readbyte, 0, 1, null, readByteCb.bind(this));
    }

    parseOggPacketHeader(onCompleteCb) {
        // The Ogg page has the following format:
        //  0               1               2               3                Byte
        //  0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1| Bit
        // +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
        // | capture_pattern: Magic number for page start "OggS"           | 0-3
        // +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
        // | version       | headerType   | granule_position              | 4-7
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
        var version, headerType, granule, serialNum, checksum;
        var buffer = new Uint8Array(255);

        fs.read(this.opusfile, buffer, 0, 23, null, (err, bytesRead, buffer) => {
            if (err) {
                onCompleteCb(false);
                return;
            }
            let buf = Buffer.from(buffer);
            version = buf.readIntLE(0, 1);
            headerType = buf.readIntLE(1, 1);
            granule = buf.readBigInt64LE(2, 8);
            serialNum = buf.readIntLE(10, 4);
            this.sequenceNumber = buf.readIntLE(14, 4);
            checksum = buf.readIntLE(18, 4);
            this.segmentsCount = buf.readIntLE(22, 1);
            this.segmentIndex = 0;
            if (this.segmentsCount > 0) {
                fs.read(this.opusfile, buf, 0, this.segmentsCount, null, (err, bytesRead, buf) => {
                    if (err) {
                        onCompleteCb(false);
                        return;
                    }
                    this.segmentSizes = buf;
                    onCompleteCb(true);
                });
            }
        });
    }

    getOggSegmentData(data, isContinueNeeded, onCompleteCb) {
        // Read data from the next segment according to the sizes table page_segments.
        // The length of 255 indicates the data requires continuing from the next
        // segment. The data from the last segment may still require continuing.
        // Return the bool isContinueNeeded to accumulate such lacing data.
        if (this.segmentIndex >= this.segmentsCount) {
            return onCompleteCb(data, isContinueNeeded);
        }

        const segmentSize = this.segmentSizes[this.segmentIndex];
        var segment = new Uint8Array(segmentSize);

        fs.read(this.opusfile, segment, 0, segmentSize, null, (err, bytesRead, buf) => {
            if (err) {
                console.error("Error while reading an ogg segment");
                return onCompleteCb(null, false);
            }
            if (data) {
                // Concatenate old data with new buf
                let newdata = new Uint8Array(data.length + buf.length);
                newdata.set(data);
                newdata.set(buf, data.length);
                data = newdata;
            } else {
                data = buf;
            }
            this.segmentIndex++;
            isContinueNeeded = (segmentSize === 255);
            if (isContinueNeeded) {
                this.getOggSegmentData(data, isContinueNeeded, onCompleteCb);
            } else {
                return onCompleteCb(data, isContinueNeeded);
            }
        });
    }

    parseOpusheadHeader(data) {
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
        const magic = new TextEncoder("utf-8").encode("OpusHead");

        for (let i = 0; i < magic.length; i++) {
            if (magic[i] !== data[i]) {
                return false;
            }
        }

        var buf = Buffer.from(data, 0, 16);
        const version = buf[8];
        const channels = buf[9];
        const preskip = buf.readIntLE(10, 2)
        this.sampleRate = buf.readIntLE(12, 4)
        console.log(`Opus version = ${version}`);
        console.log(`Channel count = ${channels}`);
        console.log(`Pre-skip = ${preskip}`);
        console.log(`Sample rate = ${this.sampleRate}`);
        return true;
    }

    parseOpustagsHeader(data) {
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
        const magic = new TextEncoder("utf-8").encode("OpusTags");

        for (let i = 0; i < magic.length; i++) {
            if (magic[i] !== data[i]) {
                return false;
            }
        }
        return true;
    }

    parseOpusTOC(data) {
        // https://tools.ietf.org/html/rfc6716#section-3.1
        // Each Opus packet starts with the Table Of Content Byte:
        // |0 1 2 3 4 5 6 7| Bit
        // +-+-+-+-+-+-+-+-+
        // | config  |s| c |
        // +-+-+-+-+-+-+-+-+
        var framesPerPacket;
        const tocC = (data[0] & 0x03);
        if (tocC === 0) {
            framesPerPacket = 1;
        } else if (tocC === 1 || tocC === 2) {
            framesPerPacket = 2;
        } else {
            // API requires predefined number of frames per packet
            console.log("An arbitrary number of frames in the packet - possible audio artifacts");
            framesPerPacket = 1;
        }

        const conf = ((data[0] >> 3) & 0x1f);
        const durations = [2.5, 5, 10, 20, 40, 60];
        const configsMS = new Map([
            [durations[0], new Set([16, 20, 24, 28])],
            [durations[1], new Set([17, 21, 25, 29])],
            [durations[2], new Set([0, 4, 8, 12, 14, 18, 22, 26, 30])],
            [durations[3], new Set([1, 5, 9, 13, 15, 19, 23, 27, 31])],
            [durations[4], new Set([2, 6, 10])],
            [durations[5], new Set([3, 7, 11])]
        ]);
        for (let [duration, configs] of configsMS.entries()) {
            if (configs.has(conf)) {
                return [framesPerPacket, duration];
            }
        }
        return [framesPerPacket, 20];
    }

    allHeadersParsed() {
        // There are three mandatory headers. Don't send data until the headers are parsed.
        return (this.opusHeadersCount >= 3);
    }

    getNextOpusPacket(packet, isContinueNeeded, onCompleteCb, allHeadersParsed = true) {
        // The Table Of Contents byte has been read from the first audio data segment
        // stored in the savedPackets[] array.
        if (this.savedPackets.length > 0 && this.allHeadersParsed() && allHeadersParsed) {
            packet = this.savedPackets.shift();
            return onCompleteCb(packet);
        }

        if (this.segmentIndex < this.segmentsCount) {
            this.getNextOggData(packet, isContinueNeeded, onCompleteCb);
        } else {
            const lastSequenceNum = this.sequenceNumber;
            // Move to next Ogg packet
            this.getNextOggPacketStart((success) => {
                if (!success) {
                    return onCompleteCb(null);
                }
                this.parseOggPacketHeader((success) => {
                    if (!success) {
                        return onCompleteCb(null);
                    }
                    // Drop current packet if continuation sequence is broken
                    if (isContinueNeeded && (lastSequenceNum + 1) !== this.sequenceNumber) {
                        this.segmentsCount = -1;
                        console.log("Skipping frame: continuation sequence is broken");
                        return this.getNextOpusPacket(null, false, onCompleteCb, allHeadersParsed);
                    }
                    this.getNextOggData(packet, isContinueNeeded, onCompleteCb);
                });
            });
        }
    }

    getNextOggData(packet, isContinueNeeded, onCompleteCb) {
        // Get another chunk of data from the parsed Ogg page
        this.getOggSegmentData(packet, isContinueNeeded, (segmentData, isContinueNeeded) => {
            if (!segmentData) {
                return this.getNextOpusPacket(null, false, onCompleteCb);
            }

            if (packet) {
                // Concatenate existing packet data with new segment data
                let newdata = new Uint8Array(packet.length + segmentData.length);
                newdata.set(packet);
                newdata.set(segmentData, packet.length);
                packet = newdata;
            } else {
                packet = segmentData;
            }

            // The last data chunk may require continuing in the next Ogg page
            if (isContinueNeeded) {
                return this.getNextOpusPacket(packet, isContinueNeeded, onCompleteCb);
            }

            // Do not send Opus headers
            if (!this.allHeadersParsed()) {
                this.parseOpusHeaders(packet);
                return this.getNextOpusPacket(null, false, onCompleteCb, false);
            }

            // Verify the Opus TOC is the same as we initially declared
            let frames, duration;
            [frames, duration] = this.parseOpusTOC(packet);
            if (this.framesPerPacket !== frames || this.packetDurationMs !== duration) {
                packet = null;
                console.log("Skipping frame - TOC differs");
                return this.getNextOpusPacket(packet, isContinueNeeded, onCompleteCb);
            }
            onCompleteCb(packet);
        });
    }

    parseOpusHeaders(data) {
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
            [this.framesPerPacket, this.packetDurationMs] = this.parseOpusTOC(data);
            this.opusHeadersCount++;
            // Save the first Opus packet as it contains audio data
            this.savedPackets.push(data);
        }
    }

    fillOpusConfig(onCompleteCb) {
        if (this.allHeadersParsed()) {
            return onCompleteCb(true);
        }

        this.getNextOpusPacket(null, false, (packet) => {
            if (!packet) {
                console.error("Invalid Opus file");
                return onCompleteCb(false);
            }
            this.fillOpusConfig(onCompleteCb);
        }, this.allHeadersParsed());
    }
}

module.exports = OpusFileStream;
