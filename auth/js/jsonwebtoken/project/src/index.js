        const express = require('express');
		 app = express(),
		 fs = require('fs'),
		 path = require('path'),
		 TokenManager = require('./tokenmanager'),
		 argv = ["private_key_file.json"/*<-fill this file with your Private Key*/ 
		        ,"WkM6QWRtTWlzdHVyYWRvczoy.RuQjdh2K8//35y+FH/+/00lIm4M0VzlewOUm+e/0LeI="/*<-fill this with your Issuer*/ ],
		 filePath = path.join(__dirname, argv[0]),
		 http = require('http');

			app.set('view engine', 'ejs'); 
			app.get('/', (req, res)=>{ 		
					fs.readFile(filePath, {encoding: 'utf-8'}, function(err, data) {
						if (!err) {
							console.log("\nMake sure you have filled in the file (private_key_file.json) with your Zello-created Private Key:\n this file-> "+
							filePath+"\nAND your Issuer \n\njsonWebToken Generated: "+
							TokenManager.createJwt(argv[1], data));
							res.render('index', {jsonWebToken:TokenManager.createJwt(argv[1], data),possibleError:'Make sure you have filled in the file (private_key_file.json) with your Zello-created Private Key: this file-> ',
							urlPath:filePath}); 
						} else {
							console.log(err);
						}
					});
			}); 
	
		app.listen(3000, function() { 
				console.log('LISTENING PORT 3000') 
		});
