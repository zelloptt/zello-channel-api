/**
 * Player interface. Player is used by <code>IncomingMessage</code> to play incoming data decoded by <code>Decoder</code>.
 *
 * @interface Player
 */

/**
 * Send PCM data to play. The default player keeps one playback track per
 * <code>streamId</code>, so streams received at the same time are mixed.
 *
 * @method
 * @name Player#feed
 * @param {Float32Array} audioData PCM audio data to be played
 * @param {String} [streamId] incoming stream the data belongs to
 * @example
player.feed(audioData, streamId);
 */

/**
 * Mark a stream as finished. Buffered samples still play, then the stream's
 * track is released.
 *
 * @method
 * @name Player#endStream
 * @param {String} streamId incoming stream that ended
 */
const PCMPlayer = require('./PCMPlayer');
module.exports = PCMPlayer;
