/**
 * Decoder interface. Decoder is used by <code>IncomingMessage</code> to decode incoming data.
 *
 * @interface Decoder
 */

/**
 * Decode incoming opus to pcm
 *
 * @method
 * @name Decoder#decode
 * @fires Decoder#decode
 * @param {Uint8Array} encodedMessageData encoded opus data
 * @example
decoder.decode(encodedMessageData);
 */

/**
 * <code>decode</code> event
 *
 * @event Decoder#decode
 * @param {Float32Array} pcmData PCM data
 * @example
decoder.on('decode', function(pcmData) { });
 */

const Decoder = require('./../vendor/opus-to-pcm/src/opus-to-pcm');
module.exports = Decoder.OpusToPCM;