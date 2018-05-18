/**
 * Player interface
 *
 * @interface
 * @name Player
 */

/**
 * Send PCM data to play
 *
 * @function
 * @name feed
 * @param {Float32Array} decoded PCM audio data
 * @return {undefined}
 * @example
player.feed(audioData: Float32Array);
 */
const PCMPlayer = require('./../vendor/pcm-player/pcm-player');
module.exports = PCMPlayer;