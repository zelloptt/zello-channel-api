/**
 * Player interface. Player is used by <code>IncomingMessage</code> to play incoming data decoded by <code>Decoder</code>.
 *
 * @interface Player
 */

/**
 * Send PCM data to play
 *
 * @method
 * @name Player#feed
 * @param {Float32Array} audioData PCM audio data to be played
 * @example
player.feed(audioData);
 */
const PCMPlayer = require('./../vendor/pcm-player/pcm-player.min');
module.exports = PCMPlayer;
