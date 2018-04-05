## JWT Generation in Go

We strongly recommend the [JWT library](https://github.com/dgrijalva/jwt-go) to avoid
the complexity and risk of building tokens on your own.  That said,
we've provided sample code here to illustrate the lower level details
of the process.

To run, make sure you have a valid `GOPATH`, then execute:

```bash
go build -o tokenmanager
```

At this point you can run the program using the private key and issuer
values obtained from the developer console:

```bash
./tokenmanager mykey.pem [issuer string]
```

