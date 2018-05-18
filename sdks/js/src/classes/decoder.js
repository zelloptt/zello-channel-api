/**
 * Decoder interface
 *
 * @interface
 * @name Decoder
 */

/**
 * Get decoder sample rate (required by default PCM player)
 * Required to implement but not used unless you will be using default PCM player
 *
 * @function
 * @name getSampleRate
 * @return {number}
 * @example
console.log(decoder.getSampleRate())
// outputs 24000
 */

/**
 * Decode incoming opus to pcm
 *
 * @function
 * @name decode
 * @fires Decoder#decode
 * @param {Uint8Array} encodedMessageData encoded opus data
 * @return {undefined}
 * @example
decoder.decode(encodedMessageData: Uint8Array);
 */

/**
 * `decode` event
 *
 * @event Decoder#decode
 * @type {Float32Array} PCM data
 * @example
decoder.on('decode', function(pcmData: Float32Array) { });
 */

const Decoder = require('./../vendor/opus-to-pcm/src/opus-to-pcm');
module.exports = Decoder.OpusToPCM;