# Zello Channel API auth tokens

To use the API or the SDK you'll need a valid access token. This document describes how to get one.

## Generate API keys and development token for Zello consumer network

1. Go to https://developers.zello.com/ and click __Login__
2. Enter your Zello username and password. If you don't have Zello account [download Zello app](https://zello.com/personal/download/) and create one.
3. Complete all fields in the developer profile and click __Submit__
4. Click __Keys__ and __Add Key__
5. Copy and save __Sample Development Token__, __Issuer__, and __Private Key__. Make sure you copy each of the values completely using Select All.
6. Click __Close__

## Using sample development token

The developer token you received is valid for 30 days and can be used in your app to connect to API making it easy to test without building your own server for provisioning the actual tokens. Pass the sample development token as `auth_token` when performing logon.

If your development token expires repeat [the steps above](#generate-api-keys-and-development-token) to create a new one.

> __NB!__ Sample Development Token is for __development only__ and must never be used in production app. The token will expire in 30 days and if you ship it in your app, your integration will stop working. For production apps use production tokens described below.


## Generating production auth tokens

To generate production tokens you'll need to use the __Issuer__ and __Private Key__ on your own server. To connect to Zello Channel API your client application will request the token from your server using secure and authenticated connection.

Please refer to the [Channel API Authentication guide](auth) for detailed instructions and sample code using Go, Javascript, and PHP.

> __NB!__ Never embed a private key in your application!