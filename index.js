var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var readline = require('readline');

var clientsocket = "";
var authenticated = false;
var client_token = "";
var password = "1234567890";

//Clear console
console.log('\033[2J');

//Create a random token
var rand = function() {
    return Math.random().toString(36).substr(2); // remove `0.`
};

var token = function() {
    return rand() + rand(); // to make it longer
};

//Start the minecraft server
var spawn = require('child_process').spawn,
	minecraftServerProcess = spawn('java', [
    '-Xmx512M',
    '-Xms256M',
    '-jar',
    'minecraft_server.jar',
    'nogui'
]);

//Client connects
io.on('connection', function(socket){

	//Only if no user is logged in
	if (authenticated!=true){
		clientsocket = socket.id;
		client_token = token();
		console.log("Client Token: "+client_token);
	

		//Send client "Please login text" and send user token to send password to correct room
		io.sockets.connected[clientsocket].emit("chat message","Please Login");
		io.sockets.connected[clientsocket].emit("token",client_token);
	}else{
		io.sockets.connected[socket.id].emit("chat message","Other user is already logged in");
	}
	var socketid = clientsocket;
	io.sockets.connected[clientsocket].on(client_token, function(data){
		if (socketid==clientsocket){
			console.log("User "+clientsocket +" logged in with password: "+ data);
			if (data==password){
				console.log("User "+clientsocket +" logged in");
				authenticated = true;

				//Notify Client that user has successfully logged in
				io.sockets.connected[clientsocket].emit("chat message","Logged In");
				io.sockets.connected[clientsocket].emit(client_token,"1");

				//Client is logged in so accept incoming commands
				io.sockets.connected[clientsocket].on('chat message', function(msg){
					if (authenticated){
						minecraftServerProcess.stdin.write(msg+'\n');
					}

				});
				socket.on('disconnect', function(){
					console.log('User Disconnected');
					clientsocket = "";
					authenticated = false;
					client_token = "";
	    		});
			}else{

				//Notify Client that password was incorrect
				console.log("User "+clientsocket +" used incorrect password");
				io.sockets.connected[clientsocket].emit("chat message","Incorrect Password");
			}
		}
	});
});

function log(data) {

	//If authenticated send console output to Client
	if (authenticated==true){
		io.sockets.connected[clientsocket].emit('chat message', data.toString());
	}
}
var rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.on('line', function (cmd) {
  if (cmd=="logout"){
  	io.sockets.connected[clientsocket].emit('chat message', "Your session has been killed");
	clientsocket = "";
	authenticated = false;
	client_token = "";
  }
});

minecraftServerProcess.stdout.on('data', log);
minecraftServerProcess.stderr.on('data', log);

http.listen(3000, function(){
  console.log('listening on *:3000');
});
