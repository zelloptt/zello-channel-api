## JWT Generation in PHP

We strongly recommend one of the [JWT libraries](https://github.com/firebase/php-jwt) to avoid
the complexity and risk of building tokens on your own.  That said,
we've provided sample code here to illustrate the lower level details
of the process.

To run, make sure you have a valid openssl.cnf, then pass the private key and issuer
values obtained from the developer console:

```bash
php index.php [private key file] [issuer string]
```
