var Connect = require("connect");
var ServeStatic = require("serve-static");
var Logging = require("morgan");
var WebSocketServer = require('ws').Server;
var QueryString = require("querystring");
var URL = require("url");

//app is http server that serves static files in /public folder
var app = Connect();
//app.use(Logging("combined")); //turn off logging after 
app.use("/cars_list", function(req, res, next){
	res.writeHead(200, {"Content-Type": "application/json"});
	res.end(JSON.stringify(Object.keys(carsWS)));
});
app.use(ServeStatic(__dirname + "/public"));
app.listen(80);

//streamApp is http server that redirects mjpeg streams
var streamApp = Connect();
streamApp.use("/streamreg", function(req, res, next){
	query = URL.parse(req.url, true).query;
	if(query.token == CAR_SECRET){
		req.on("data", function(chunk){
			if(carsSTREAM[query.name]){
				carsSTREAM[query.name].write(chunk);
			}
		});
	}
	else{
		res.writeHead(404);
		res.end("wrong token for stream registration");
	}
});
streamApp.use(function(req, res, next){
	var query = URL.parse(req.url, true).query;
	res.writeHead(200, {'Content-Type': 'multipart/x-mixed-replace; boundary=--jpgboundary'});
	carsSTREAM[query.name] = res;
	
	req.on("close", function(){
		console.log("closed");
		delete carsSTREAM[query.name];
	});
});
streamApp.listen(4114);

var CAR_SECRET = 133780085; //car token (shared secret)
var carsWS = {}; //websocket connections of cars
var carsSTREAM = {}; //stream redirections for cars

//wss is websocket server
var wss = new WebSocketServer({port: 4113});
wss.on("connection", function(ws){
	ws.on("message", function(message, flags){
		console.log("Message: " + message);
		if(ws.carWS === undefined){
			try{
				var query = QueryString.parse(message);
				var token = parseInt(query.token);
				
				//car token
				if(token == CAR_SECRET){ 
					console.log("\nCar token accepted: " + query.name + "\n");
					ws.type = "car";
					ws.name = query.name;
					carsWS[query.name] = ws;
				}
				else if(token > 0 && token < 1000){ //client token validation
					console.log("\nClient token " + token + " accepted. Want connection with " + query.name + "\n");
					ws.type = "client";
					ws.token = token;
					if(carsWS[query.name] === undefined)
						throw "car offline";
					else if(carsWS[query.name].clientWS !== undefined)
						throw "car already connected with some client";
					else{ //accept connection
						ws.carWS = carsWS[query.name]; //connect client websocket with car websocket
						ws.carWS.clientWS = ws; //connect car websocket with client websocket
					}
				}
				else{
					throw "invalid token";
				}
			}
			catch(error){
				ws.close(1000, error);
			}
		}
		else{ //client sends message. redirect to car
			ws.carWS.send(message);
		}
    });
	
	ws.on("close", function(code, message){
		if(ws.type == "car"){
			console.log("Car \"" + ws.name + "\" disconnected with code " + code + " and reason \"" + message + "\"");
		}
		else if(ws.type == "client"){
			console.log("Client with token " + ws.token + " disconnected with code " + code + " and reason \"" + message + "\"");
		}
		else{
			throw "UNKNOWN DISCONNECT";
		}
		
		if(ws.clientWS !== undefined){ //closing connection with car that is connected with client
			delete carsWS[ws.name];
			ws.clientWS.close(1000, "car went offline"); //close client and send reason
		}
		else if(ws.carWS !== undefined){ //closing connection with client
			delete ws.carWS.clientWS;
		}
	});
	
	ws.on("error", function(error){
		console.log("ERROR: " + error);
	});
});

console.log("SERVER RUNNING\n");