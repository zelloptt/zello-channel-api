const fs = require('fs'),
  path = require('path'),
  TokenManager = require('./tokenmanager');

let argv = process.argv.slice(2);

if (argv.length < 2) {
  console.log("usage: node app.js [key file] [issuer]")
  process.exit(1);
}

let filePath = path.join(__dirname, argv[0]);

fs.readFile(filePath, {encoding: 'utf-8'}, function(err, data) {
  if (!err) {
    console.log(TokenManager.createJwt(argv[1], data));
  } else {
    console.log(err);
  }
});

