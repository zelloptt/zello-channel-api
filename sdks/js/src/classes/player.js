/**
 * Player interface. Player is used by <code>IncomingMessage</code> to play incoming data decoded by <code>Decoder</code>.
 *
 * @interface Player
 */

/**
 * Send PCM data to play. The default player keeps one playback track per
 * <code>trackId</code>, so tracks fed at the same time are mixed.
 * <code>IncomingMessage</code> uses one track per incoming stream.
 *
 * @method
 * @name Player#feed
 * @param {Float32Array} audioData PCM audio data to be played
 * @param {String} [trackId] track the data belongs to
 * @example
player.feed(audioData, trackId);
 */

/**
 * Mark a track as finished. Buffered samples still play, then the track is
 * released.
 *
 * @method
 * @name Player#endTrack
 * @param {String} trackId track that ended
 */
const PCMPlayer = require('./PCMPlayer');
module.exports = PCMPlayer;
