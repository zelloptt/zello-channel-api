<?php

class TokenManager
{
    const TOKEN_EXPIRATION_SECONDS = 120;

   /**
   * Encodes data to an URL-safe base64 format by taking the standard base64 output,
   * replacing '+' and '/' symbols with '-' and '_' respectively,
   * then removing any trailing '=' symbols.
   *
   * @param string $data the data to encode
   * @return string URL-safe base64 encoded form of the data
   * @link https://tools.ietf.org/html/rfc4648#section-5
   */
    private static function base64url_encode($data)
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    /**
     * @param $issuer  string  The issuer string as shown in the Zello developer console
     * @param $privateKey string Your private key
     * @return bool|string false on error creating token, otherwise the token string
     */
    public static function createJwt($issuer, $privateKey)
    {
        if (!$issuer || !$privateKey) {
            return false;
        }

        $header = [
            'alg' => 'RS256',
            'typ' => 'JWT'
        ];

        $payload = [
            'iss' => $issuer,
            'exp' => time() + TokenManager::TOKEN_EXPIRATION_SECONDS
        ];

        $package = sprintf(
            "%s.%s",
            TokenManager::base64url_encode(json_encode($header)),
            TokenManager::base64url_encode(json_encode($payload))
        );

        openssl_sign($package, $signature, $privateKey, OPENSSL_ALGO_SHA256);

        return $package . "." . TokenManager::base64url_encode($signature);
    }
}