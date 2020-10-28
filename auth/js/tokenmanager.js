const crypto = require('crypto');

const tokenExpirationSeconds = 120;

class TokenManager {
  /**
   * Encodes data to an URL-safe base64 format by taking the standard base64 output,
   * replacing '+' and '/' symbols with '-' and '_' respectively,
   * then removing any trailing '=' symbols.
   *
   * @param data - A string or buffer to encode
   * @returns The URL-safe base64 encoded form of the data
   * @link https://tools.ietf.org/html/rfc4648#section-5
   */
  static base64UrlEncode(data) {
    var encoded = Buffer.from(data).toString('base64');
    return encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };

  static createJwt(issuer, privateKey) {
    if (!issuer || !privateKey) {
      return false;
    }

    const header = {
      alg: 'RS256',
      typ: 'JWT'
    };

    const payload = {
      iss: issuer,
      exp: parseInt(new Date().getTime() / 1000, 10) + tokenExpirationSeconds
    };

    const pkg = TokenManager.base64UrlEncode(JSON.stringify(header)) + "." +
      TokenManager.base64UrlEncode(JSON.stringify(payload));

    const sign = crypto.createSign('RSA-SHA256');
    sign.update(pkg);
    const signature = sign.sign(privateKey);

    return pkg + "." + TokenManager.base64UrlEncode(signature);
  }
}

module.exports = TokenManager;
