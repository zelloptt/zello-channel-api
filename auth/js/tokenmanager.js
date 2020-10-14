const crypto = require('crypto');

const tokenExpirationSeconds = 120;

class TokenManager {
  /**
   * Encode data to base64 format.
   * Replace '+' and '/' symbols with '-' and '_' respectively.
   * Remove trailing '='.
   * @param data - A string or buffer to encode
   * @returns an URL-safe base64 encoded string
   * @link https://tools.ietf.org/html/rfc4648#section-5
   */
  static base64UrlEncode(data) {
    Buffer.from
     var encoded = Buffer.from(data).toString('base64');
     return encoded.replace('+', '-').replace('/', '_').replace(/=+$/, '');
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

    const pkg = base64UrlEncode(JSON.stringify(header)) + "." + base64UrlEncode(JSON.stringify(payload));

    const sign = crypto.createSign('RSA-SHA256');
    sign.update(pkg);
    const signature = sign.sign(privateKey);

    return pkg + "." + base64UrlEncode(signature);
  }
}

module.exports = TokenManager;
