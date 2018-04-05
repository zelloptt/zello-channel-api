## JWT Generation in NodeJS

We strongly recommend the [JWT library](https://github.com/auth0/node-jsonwebtoken) to avoid
the complexity and risk of building tokens on your own.  That said,
we've provided sample code here to illustrate the lower level details
of the process.

To run, simply start the app via node, passing the private key and issuer
values obtained from the developer console:

```bash
node app.js [private key file] [issuer string]
```
