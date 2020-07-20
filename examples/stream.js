var fs = require('fs');
var Buffer = require('buffer/').Buffer
var WebSocket = require('ws');
var ConfigParser = require('configparser');

class OpusFileStream {
    // https://tools.ietf.org/html/rfc7845
    // https://tools.ietf.org/html/rfc3533
    constructor(filename, onCompleteCb) {
        fs.open(filename, 'r', function(err, fd) {
            if (err) {
                console.log("Failed to open opus file ", filename);
                return onCompleteCb(null);
            }
            this.opusfile = fd;
            this.segmentSizes = new Uint8Array(255);
            this.segmentIndex = 0;
            this.segmentsCount = 0;
            this.sequenceNumber = (- 1);
            this.opusHeadersCount = 0;
            this.packetDuration = 0;
            this.framesPerPacket = 0;
            this.savedPackets = [];
            this.fillOpusConfig(function(success) {
                return onCompleteCb(success ? this : null);
            }.bind(this));
        }.bind(this));
    }
    
    getNextOggPacketStart(onCompleteCb) {
        // Each Ogg page starts with magic bytes "OggS"
        // Stream may be corrupted, so find a first valid magic
        var verifiedBytes = 0;
        var magic = new TextEncoder("utf-8").encode("OggS");
        var readbyte = new Uint8Array(1);
        
        var readByteCb = function(err, bytesRead, buf) {
            if (err || bytesRead !== 1) {
                return onCompleteCb(false);
            }
            if (readbyte[0] === magic[verifiedBytes]) {
                verifiedBytes++;
                if (verifiedBytes === 4) {
                    return onCompleteCb(true);
                }
            } else {
                verifiedBytes = 0;
            }
            fs.read(this.opusfile, readbyte, 0, 1, null, readByteCb.bind(this));
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
        
        fs.read(this.opusfile, buffer, 0, 23, null, function(err, bytesRead, buffer) {
            if (err) {
                onCompleteCb(false);
                return;
            }
            var buf = Buffer.from(buffer);
            version = buf.readIntLE(0, 1);
            headerType = buf.readIntLE(1, 1);
            granule = buf.readIntLE(2, 8);
            serialNum = buf.readIntLE(10, 4);
            this.sequenceNumber = buf.readIntLE(14, 4);
            checksum = buf.readIntLE(18, 4);
            this.segmentsCount = buf.readIntLE(22, 1);
            this.segmentIndex = 0;
            if (this.segmentsCount > 0) {
                fs.read(this.opusfile, buf, 0, this.segmentsCount, null,
                    function(err, bytesRead, buf) {
                    if (err) {
                        onCompleteCb(false);
                        return;
                    }
                    this.segmentSizes = buf;
                    onCompleteCb(true);
                }.bind(this));
            }
        }.bind(this));
    }
    
    getOggSegmentData(data, isContinueNeeded, onCompleteCb) {
        // Read data from the next segment according to the sizes table page_segments.
        // The length of 255 indicates the data requires continuing from the next
        // segment. The data from the last segment may still require continuing.
        // Return the bool isContinueNeeded to accumulate such lacing data.
        if (this.segmentIndex >= this.segmentsCount) {
            return onCompleteCb(data, isContinueNeeded);
        }
        
        let segmentSize = this.segmentSizes[this.segmentIndex];
        let segment = new Uint8Array(segmentSize);
        
        fs.read(this.opusfile, segment, 0, segmentSize, null,
            function(err, bytesRead, buf) {
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
        }.bind(this));
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
        var version, channels, preskip;
        var magic = new Uint8Array("OpusHead");
        
        for (let i = 0; i < magic.length; i++) {
            if (magic[i] !== data[i])
                return false;
        }
        
        var buf = Buffer.from(data, 0, 16);
        version = buf[8];
        channels = buf[9];
        preskip = buf.readIntLE(10, 2)
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
        var magic = new Uint8Array("OpusTags");
        
        for (let i = 0; i < magic.length; i++) {
            if (magic[i] !== data[i])
                return false;
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
        var tocC = (data[0] & 0x03);
        if (tocC === 0) {
            framesPerPacket = 1;
        } else {
            if (tocC === 1 || tocC === 2) {
                framesPerPacket = 2;
            } else {
                // API requires predefined number of frames per packet
                console.log("An arbitrary number of frames in the packet - possible audio artifacts");
                framesPerPacket = 1;
            }
        }
        
        var conf = ((data[0] >> 3) & 0x1f);
        const durations = [2.5, 5, 10, 20, 40, 60];
        const configsMS = new Map([
            [durations[0], new Set([16, 20, 24, 28])],
            [durations[1], new Set([17, 21, 25, 29])],
            [durations[2], new Set([0, 4, 8, 12, 14, 18, 22, 26, 30])],
            [durations[3], new Set([1, 5, 9, 13, 15, 19, 23, 27, 31])],
            [durations[4], new Set([2, 6, 10])],
            [durations[5], new Set([3, 7, 11])]
        ]);
        configsMS.forEach(function(item, index) {
            if (item.has(conf))
                return [framesPerPacket, durations[index]]
        });
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
            var lastSequenceNum = this.sequenceNumber;
            // Move to next Ogg packet
            this.getNextOggPacketStart(function(success) {
                if (!success) {
                    return onCompleteCb(null);
                }
                this.parseOggPacketHeader(function(success) {
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
                }.bind(this));
            }.bind(this));
        }
    }
        
    getNextOggData(packet, isContinueNeeded, onCompleteCb) {
        // Get another chunk of data from the parsed Ogg page
        this.getOggSegmentData(packet, isContinueNeeded, function(segmentData, isContinueNeeded) {
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
                return getNextOpusPacket(packet, isContinueNeeded, onCompleteCb);
            }
                        
            // Do not send Opus headers
            if (!this.allHeadersParsed()) {
                this.parseOpusHeaders(packet);
                return this.getNextOpusPacket(null, false, onCompleteCb, false);
            }
                
            // Verify the Opus TOC is the same as we initially declared
            var frames, duration;
            [frames, duration] = this.parseOpusTOC(packet);
            if (this.framesPerPacket !== frames || this.packetDuration !== duration) {
                packet = null;
                console.log("Skipping frame - TOC differs");
                return getNextOpusPacket(packet, isContinueNeeded, onCompleteCb);
            }
            onCompleteCb(packet);
        }.bind(this));
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
            var framesPerPacket, packetDuration;
            [framesPerPacket, packetDuration] = this.parseOpusTOC(data);
            this.framesPerPacket = framesPerPacket;
            this.packetDuration = packetDuration;
            this.opusHeadersCount++;
            // Save the first Opus packet as it contains audio data
            this.savedPackets.push(data);
        }
    }
    
    fillOpusConfig(onCompleteCb) {
        if (this.allHeadersParsed()) {
            return onCompleteCb(true);
        }
        
        this.getNextOpusPacket(null, false, function(packet) {
            if (!packet) {
                console.log("Invalid Opus file");
                return onCompleteCb(false);
            }
            this.fillOpusConfig(onCompleteCb);
        }.bind(this), this.allHeadersParsed());
    }
}

function zelloAuthorize(ws, opusStream, onCompleteCb) {
    ws.send(JSON.stringify({
        seq: 1,
        command: "logon",
        auth_token: zelloToken,
        username: zelloUsername,
        password: zelloPassword,
        channel: zelloChannel,
    }));
    
    var isAuthorized = false, isChannelAvailable = false;
    ws.onmessage = function(event) {
        var json = JSON.parse(event.data);
        if (json.refresh_token) {
            isAuthorized = true;
        } else if (json.command == "on_channel_status" && json.status == "online") {
            isChannelAvailable = true;
        }
        if (isAuthorized && isChannelAvailable) {
            return onCompleteCb(true);
        }
    }
}

function zelloStartStream(ws, opusStream, onCompleteCb) {
    var packetDuration = opusStream.packetDuration;
    var codecHeaderRaw = new Uint8Array(4);
    codecHeaderRaw[2] = opusStream.framesPerPacket;
    codecHeaderRaw[3] = opusStream.packetDuration;
    
    // sampleRate is represented in two bytes in little endian.
    // https://github.com/zelloptt/zello-channel-api/blob/409378acd06257bcd07e3f89e4fbc885a0cc6663/sdks/js/src/classes/utils.js#L63
    codecHeaderRaw[0] = parseInt(opusStream.sampleRate & 0xff);
    codecHeaderRaw[1] = parseInt(opusStream.sampleRate / 0x100) & 0xff;
    var codecHeader = Buffer.from(codecHeaderRaw).toString('base64');

    ws.send(JSON.stringify({
        "command": "start_stream",
        "seq": 2,
        "type": "audio",
        "codec": "opus",
        "codec_header": codecHeader,
        "packet_duration": packetDuration,
    }));
                                
    ws.onmessage = function(event) {
        var json = JSON.parse(event.data);
        if (json && json.success && json.stream_id) {
            return onCompleteCb(json.stream_id);
        }
        console.log("Failed to create Zello audio stream");
        return onCompleteCb(null);
    }
}

function zelloStreamSendAudio(ws, opusStream, streamId, onCompleteCb) {
    var packetDurationMs = opusStream.packetDuration;
    var date = new Date();
    var packetId = 1;
    var zelloStreamNextPacket = function() {
        var startTsMs = date.getTime();
        opusStream.getNextOpusPacket(null, false, function(data) {
            if (!data) {
                console.log("No more audio packets");
                return onCompleteCb(true);
            }
        
            // https://github.com/zelloptt/zello-channel-api/blob/master/API.md#stream-data
            var packet = new Uint8Array(data.length + 9);
            packet[0] = 1;

            var id = streamId;
            for (let i = 4; i > 0; i--) {
                packet[i] = parseInt(id & 0xff);
                id = parseInt(id / 0x100);
            }
    
            id = packetId;
            for (let i = 8; i > 4; i--) {
                packet[i] = parseInt(id & 0xff);
                id = parseInt(id / 0x100);
            }
            packet.set(data, 9);
            ws.send(packet);
            packetId++;
            date = new Date();
            let timePassedMs = date.getTime() - startTsMs;
            if (packetDurationMs > timePassedMs) {
                setTimeout(zelloStreamNextPacket, packetDurationMs - timePassedMs);
            } else {
                zelloStreamNextPacket();
            }
        });
    }
    zelloStreamNextPacket();
    ws.onmessage = function(event) {
        return;
    }
}

function zelloStopStream(ws, streamId) {
    ws.send(JSON.stringify({
        command: "stop_stream",
        stream_id: streamId}));
}

function StreamReadyCb(opusStream) {
    if (!opusStream) {
        console.log("Failed to start Opus media stream");
        process.exit();
    }
                    
    var ws = new WebSocket("wss://zello.io/ws");
    ws.onclose = function(event) {
        console.log("Connection has been closed");
        zelloSocket = null;
        process.exit();
    };
                    
    ws.onopen = function(event) {
        zelloSocket = ws;
        
        zelloAuthorize(ws, opusStream, function(success) {
            if (!success) {
                console.log("Failed to authorize");
                ws.close();
            }
            zelloStartStream(ws, opusStream, function(streamId) {
                if (!streamId) {
                    console.log("Failed to start Zello stream");
                    ws.close();
                }
                zelloStreamId = streamId;
                zelloStreamSendAudio(ws, opusStream, streamId, function(success) {
                    if (!success) {
                        console.log("Failed to stream audio");
                    }
                    zelloStopStream(ws, streamId);
                    ws.close();
                });
            });
        });
    };
}

// Global variables to handle user's SIGINT action
var zelloSocket = null;
var zelloStreamId = null;

process.on("SIGINT", function() {
    console.log("Stopped by user");
    if (zelloSocket) {
        if (zelloStreamId) {
            zelloStopStream(zelloSocket, zelloStreamId);
        }
        zelloSocket.close();
    }
    process.exit();
});
                          
                              
var config = new ConfigParser();
try {
    config.read('stream.conf');
} catch(error) {
    console.log("Failed to open a config file");
    process.exit();
}
                              
var zelloUsername = config.get('zello', 'username');
var zelloPassword = config.get('zello', 'password');
var zelloToken = config.get('zello', 'token');
var zelloChannel = config.get('zello', 'channel');
var zelloFilename = config.get('media', 'filename');

if (!zelloUsername || !zelloPassword || !zelloToken || !zelloChannel || !zelloFilename) {
    console.log("Invalid config file. See example");
    process.exit();
}
                              
new OpusFileStream(zelloFilename, StreamReadyCb);
