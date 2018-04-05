<?php

require_once 'tokenmanager.class.php';

if (count($argv) < 3) {
    die("usage: index.php [key file] [issuer]\n");
}

// Alternatively, to manage the private key resource directly,
// you may use:
//
//     $key = openssl_pkey_get_private('file://' . $argv[1]);
//
// Followed by a corresponding:
//
//     openssl_free_key($key);
//
// when finished

$key = file_get_contents($argv[1]);

if ($key === false) {
    die("unable to read key file: " . error_get_last()['message'] . "\n");
}

$token = TokenManager::createJwt($argv[2], $key);

echo "JWT: $token\n";