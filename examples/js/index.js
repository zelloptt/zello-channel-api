var Buffer = require('buffer/').Buffer;
var WebSocket = require('ws');
var ConfigParser = require('configparser');
var OpusFileStream = require('./opus-file-stream');

// Global variables to handle user's SIGINT action
var zelloSocket = null;
var zelloStreamId = null;

function zelloAuthorize(ws, opusStream, username, password, token, channel, onCompleteCb) {
    ws.send(JSON.stringify({
        seq: 1,
        command: "logon",
        auth_token: token,
        username: username,
        password: password,
        channel: channel,
    }));

    const authTimeoutMs = 2000;
    var isAuthorized = false, isChannelAvailable = false;
    var authTimeout = setTimeout(onCompleteCb, authTimeoutMs, false);
    ws.onmessage = function(event) {
        let json = JSON.parse(event.data);
        if (json.refresh_token) {
            isAuthorized = true;
        } else if (json.command === "on_channel_status" && json.status === "online") {
            isChannelAvailable = true;
        }
        if (isAuthorized && isChannelAvailable) {
            clearTimeout(authTimeout);
            return onCompleteCb(true);
        }
    }
}

function zelloStartStream(ws, opusStream, onCompleteCb) {
    var codecHeaderRaw = new Uint8Array(4);
    codecHeaderRaw[2] = opusStream.framesPerPacket;
    codecHeaderRaw[3] = opusStream.packetDurationMs;

    // sampleRate is represented in two bytes in little endian.
    // https://github.com/zelloptt/zello-channel-api/blob/409378acd06257bcd07e3f89e4fbc885a0cc6663/sdks/js/src/classes/utils.js#L63
    codecHeaderRaw[0] = parseInt(opusStream.sampleRate & 0xff, 10);
    codecHeaderRaw[1] = parseInt(opusStream.sampleRate / 0x100, 10) & 0xff;
    var codecHeader = Buffer.from(codecHeaderRaw).toString('base64');

    ws.send(JSON.stringify({
        "command": "start_stream",
        "seq": 2,
        "type": "audio",
        "codec": "opus",
        "codec_header": codecHeader,
        "packet_duration": opusStream.packetDurationMs,
    }));

    ws.onmessage = function(event) {
        let json = JSON.parse(event.data);
        if (json && json.success && json.stream_id) {
            return onCompleteCb(json.stream_id);
        }
        console.error("Failed to create Zello audio stream");
        return onCompleteCb(null);
    }
}

function getCurrentTimeMs() {
    const now = new Date();
    return now.getTime();
}

function zelloGenerateAudioPacket(data, streamId, packetId) {
    // https://github.com/zelloptt/zello-channel-api/blob/master/API.md#stream-data
    var packet = new Uint8Array(data.length + 9);
    packet[0] = 1;

    var id = streamId;
    for (let i = 4; i > 0; i--) {
        packet[i] = parseInt(id & 0xff, 10);
        id = parseInt(id / 0x100, 10);
    }

    id = packetId;
    for (let i = 8; i > 4; i--) {
        packet[i] = parseInt(id & 0xff, 10);
        id = parseInt(id / 0x100, 10);
    }
    packet.set(data, 9);
    return packet;
}

function zelloSendAudioPacket(ws, packet, startTsMs, timeStreamingMs, onCompleteCb) {
    const timeElapsedMs = getCurrentTimeMs() - startTsMs;
    const sleepDelayMs = timeStreamingMs - timeElapsedMs;

    ws.send(packet);
    if (sleepDelayMs < 1) {
        return onCompleteCb();
    }
    setTimeout(onCompleteCb, sleepDelayMs);
}

function zelloStreamSendAudio(ws, opusStream, streamId, onCompleteCb) {
    const startTsMs = getCurrentTimeMs();
    var timeStreamingMs = 0;
    var packetId = 0;
    const zelloStreamNextPacket = function() {
        opusStream.getNextOpusPacket(null, false, function(data) {
            if (!data) {
                console.log("Audio stream is over");
                return onCompleteCb(true);
            }

            let packet = zelloGenerateAudioPacket(data, streamId, packetId);
            timeStreamingMs += opusStream.packetDurationMs;
            packetId++;
            zelloSendAudioPacket(ws, packet, startTsMs, timeStreamingMs, function() {
                return zelloStreamNextPacket();
            });
        });
    }
    zelloStreamNextPacket();
    ws.onmessage = function() {
        return;
    }
}

function zelloStopStream(ws, streamId) {
    ws.send(JSON.stringify({
        command: "stop_stream",
        stream_id: streamId}));
    // Invalidate the global stream ID once stop request is sent
    zelloStreamId = null;
}

function zelloStreamReadyCb(opusStream, username, password, token, channel) {
    var ws = new WebSocket("wss://zello.io/ws");
    ws.onclose = function() {
        if (!zelloSocket) {
            console.error("Failed to connect to server");
        }
        zelloSocket = null;
        if (zelloStreamId) {
            console.error("Connection has been closed unexpectedly");
            process.exit(1);
        } else {
            process.exit();
        }
    };

    ws.onopen = function() {
        zelloSocket = ws;

        zelloAuthorize(ws, opusStream, username, password, token, channel, function(success) {
            if (!success) {
                console.error("Failed to authorize");
                ws.close();
            } else {
                console.log("User " + username + " has been authenticated on " + channel + " channel");
                zelloStartStream(ws, opusStream, function(streamId) {
                    if (!streamId) {
                        console.error("Failed to start Zello stream");
                        ws.close();
                    } else {
                        zelloStreamId = streamId;
                        console.log("Started streaming " + opusStream.filename);
                        zelloStreamSendAudio(ws, opusStream, streamId, function(success) {
                            if (!success) {
                                console.error("Failed to stream audio");
                            }
                            zelloStopStream(ws, streamId);
                            ws.close();
                        });
                    }
                });
            }
        });
    };
}

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
    process.chdir('../');
    config.read('stream.conf');
} catch(error) {
    console.error(`Failed to open a config file.\n${error.message}`);
    process.exit(1);
}

var zelloUsername = config.get('zello', 'username');
var zelloPassword = config.get('zello', 'password');
var zelloToken = config.get('zello', 'token');
var zelloChannel = config.get('zello', 'channel');
var zelloFilename = config.get('media', 'filename');
if (!zelloUsername || !zelloPassword || !zelloToken || !zelloChannel || !zelloFilename) {
    console.error("Invalid config file. See example");
    process.exit(1);
}

new OpusFileStream(zelloFilename, function(opusStream) {
    if (!opusStream) {
        console.error("Failed to start Opus media stream");
        process.exit(1);
    }
    zelloStreamReadyCb(opusStream, zelloUsername, zelloPassword, zelloToken, zelloChannel);
});
