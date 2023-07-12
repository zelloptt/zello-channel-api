# Examples of using the Zello Channel API

There are example applications for the following platforms:

* Python 3
* .NET Core 3.1
* Node.js 6

Each application streams an audio file to a Zello channel as a regular voice message using a common Zello account.

The audio file must be in Ogg format encoded with the [Opus codec](https://tools.ietf.org/html/rfc7845).

Use [opusenc](https://opus-codec.org/docs/opus-tools/opusenc.html) utility to convert your media files to the appropriate format.

## Install opus encoder

### MacOS:
```
brew install opus-tools
```

### Linux (Debian-like):
```
sudo apt-get install opus-tools
```

### Windows:

Download the precompiled [binaries](https://archive.mozilla.org/pub/opus/win32/opus-tools-0.2-opus-1.3.zip) and unpack.


# Prepare a compatible audio source file

The input format can be Wave, AIFF, FLAC, Ogg/FLAC, or raw PCM.

Use an appropriate converter for other media formats.


## Encode the audio file using Opus codec

Do not use a frame size less than 20 milliseconds.

For the audio source file `media.wav` the command looks like:
```
opusenc --framesize 20 media.wav media.opus
```

The encoded media will be stored in `media.opus` file.


# Prepare configuration file


## Edit the configuration file [stream.conf](./stream.conf).


### If you want to connect to Zello Work network - configure the `network` property.

Set the network name as a value of the `network` property.


### Configure the appropriate Zello account's `username` and `password`.

This account is used by the example application to send the audio message.


### Set the `channel` name to send the message to.

Make sure the configured account is allowed to send the audio message to this channel.


### Setup an auth `token`.

Use instructions from [AUTH.md](../AUTH.md) to obtain the auth token for the Zello account.


### Specify the audio `filename`.

Put the path to the media encoded with Opus codec.


# Python example API client
```
brew install python3
pip3 install aiohttp
pip3 install configparser
pip3 install asyncio

cd py
python3 main.py
```


# NodeJS example API client:
```
cd js
npm install
node index.js
```


# .NET example API client:
```
cd cs
dotnet build
dotnet run
```

# Application architecture

The `data` field in `stream data` defined in the [Zello Channel API specification](../API.md) must be audio encoded with the [Opus codec](https://tools.ietf.org/html/rfc6716).

A media container such as Ogg, Matroska, WebM, MPEG-TS or MP4 has to be used for storing an Opus audio.

The most common and native container for Opus audio is [Ogg](https://tools.ietf.org/html/rfc7845).

Therefore each application contains two components:
1. Ogg container parser.

   Extracts an Opus audio stream from an Ogg container.
2. Implementation of Zello Channel API.

   Performs network communication with Zello server to send the audio message to the appropriate channel.


## Python application

Located in [py](./py) directory.

1. Ogg parser:

   `opus_file_stream.py`
2. Zello Channel API:

   `main.py`

## NodeJS application

Located in [js](./js) directory.

1. Ogg parser:

   `opus-file-stream.js`
2. Zello Channel API:

   `index.js`

## C# application

Located in [cs](./cs) directory.

1. Ogg parser:

   The Ogg parser implements an interface `IZelloOpusStream.cs`

   There are two options of Ogg parsers to use:

   1. [Concentus ogg parser](https://github.com/lostromb/concentus.oggfile) is used by default.

      It implements the mentioned interface using an adapter `ConcentusAdapter.cs`

   2. Zello Ogg parser: `OpusStream.cs`

      In order to use Zello Ogg parser:

         * Edit [ZelloMediaStream.csproj](./cs/ZelloMediaStream.csproj)
         * Change the value of `UseConcentusOggParser` to false
         * Clean the previusly built objects and binaries and rebuild the project:
            ```
            cd cs
            rm -rf bin obj
            dotnet build
            ```

2. Zello Channel API: `ZelloMediaStream.cs`
