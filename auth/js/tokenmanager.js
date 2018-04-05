const crypto = require('crypto');

const tokenExpirationSeconds = 120;

class TokenManager {
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

    const pkg = Buffer.from(JSON.stringify(header)).toString('base64') + "." + Buffer.from(JSON.stringify(payload)).toString('base64');

    const sign = crypto.createSign('RSA-SHA256');
    sign.update(pkg);
    const signature = sign.sign(privateKey, 'base64');

    return pkg + "." + signature;
  }
}

module.exports = TokenManager;
