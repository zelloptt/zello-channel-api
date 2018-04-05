<?php

class TokenManager
{
    const TOKEN_EXPIRATION_SECONDS = 120;

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
            base64_encode(json_encode($header)),
            base64_encode(json_encode($payload))
        );

        openssl_sign($package, $signature, $privateKey, OPENSSL_ALGO_SHA256);

        return $package . "." . base64_encode($signature);
    }
}