var html = require('fs').readFileSync(__dirname + '/tronMultiplayer.html');
var server = require('http').createServer(function (req, res) {
   res.end(html);
});
server.listen(8005);

var nowjs = require('now');
var everyone = nowjs.initialize(server);

var bikes = {};
var killCount = {};
var player = 0;

var EMPTY = -1;
var WALL = -2;

var map = [];
var edge = 100;

var count = 0;
var deadbikes = 0;

var gameON = false;




function resetGame () {
	
	map = [];
	for (var i = 0; i < edge; i++){
		map.push([]);
		for (var j = 0; j < edge; j++){
			if (i == 0 || j == 0 || i == edge-1 || j == edge-1/* || Math.floor(Math.random()*30) == 0*/){
				map[i].push(WALL);
			} else {
				map[i].push(EMPTY);
			}
		}
	}	
	
	for (var i in bikes){
		spawnBike(i)
	}	
	everyone.now.reset(edge);
	everyone.now.updateScores(bikes);
}

nowjs.on('connect', function () {
   console.log('connect');
   bikes[this.user.clientId] = {nick: "Anonymous", w:0, i: Math.floor(Math.random()*edge-2)+1, j: Math.floor(Math.random()*edge-2)+1, di : 0, dj : 1, p: player, c: "rgba("+Math.floor(Math.random()*255)+ ", " + Math.floor(Math.random()*255)+","+Math.floor(Math.random()*255)+", 1)", alive : false};
   killCount[this.user.clientId] = 0;
   player++;
   console.log(this.user.clientId);
   console.log(bikes);
   if (!gameON){
	gameON = true;
	resetGame();
	step();
   }
});

everyone.now.changeBikeDirection = function (dir) {
	console.log(bikes[this.user.clientId].nick + " changes his direction to " + dir);
	var ndi = 0, ndj = 0;
	if (dir == "left"){
		ndj = -1;
	} else if (dir == "right"){
		ndj = 1;
	} else if (dir == "up"){
		ndi = -1;
	} else if (dir == "down"){
		ndi = 1;
	}
	var odi, odj;
	odi = bikes[this.user.clientId].di;
	odj = bikes[this.user.clientId].dj;

	if (odi != ndi && odj != ndj) {
		bikes[this.user.clientId].di = ndi; 
		bikes[this.user.clientId].dj = ndj;
	}
	killCount[this.user.clientId] = 0; 
};

everyone.now.updateNickname = function (theName) {
	bikes[this.user.clientId].nick = theName;
	everyone.now.updateScores(bikes);
};

function spawnBike (k) {
  	bikes[k].i =  Math.floor(Math.random()*edge*(2/4) -2)+1 + edge/4;
	bikes[k].j = Math.floor(Math.random()*edge*(2/4)  -2)+1 + edge/4;
	bikes[k].di = 0;
	bikes[k].dj = 1;
	bikes[k].alive = true;
	player++;
}

nowjs.on('disconnect', function () {
   console.log(bikes[this.user.clientId].nick + ' has disconnected.');
   for (var i in bikes) {
      if (i === this.user.clientId) {
         killBike(i);
	 delete bikes[i];
         break;
      }
   }
});

function killBike(k){
        var bike = bikes[k];
	bike.alive = false;
	for (var i = 0; i < edge; i++){
		for (var j = 0; j < edge; j++){
			if (map[i][j] == bike.player){
				map[i][j] = EMPTY;
			}
		}
	}
	//delete bikes[k];
}

function checkIfBikeIsDead(k){
        //console.log("CheckIfBikeIsDead with id "+k);
	var bike = bikes[k];
	if (bike.alive){
		//console.log("Checking current position");
		if (map[bike.i][bike.j] != EMPTY){
			//console.log("Ouch, Cell was "+map[bike.i][bike.j]);
			bike.i -= bike.di;
			bike.j -= bike.dj;
			killBike(k);

			for (var i in bikes){
				if (i != k){
					if (bikes[i].alive){
						bikes[i].w++;
					}
				}
			}
			everyone.now.updateScores(bikes);			
			return true;
		} else {
			//console.log("Safe and sound");
			map[bike.i][bike.j] = bike.p;
			return false;
		}
	} else {
		return false;
	}

}

function traceMap() {
	console.log("---------------------------------------------------------------------");
	var s = "";
	for (var i = 0; i < edge; i++){
		s = "[";
		for (var j = 0; j < edge; j++){
			if (map[i][j] == undefined){
				console.log("We found an undefined at ("+i+","+j+")");
			} else {
				s += map[i][j].toString() + ", ";
			}
		}
 		s += "]";
		console.log(s);
	}
}

function step () {

	count = 0;
	deadbikes = 0;

	for (var k in bikes){
		killCount[k]++;
		if (killCount[k] > 2000){
			killBike(k);
			delete bikes[k];
		} else {
			count++;
			if (bikes[k].alive){
				bikes[k].i += bikes[k].di;
				bikes[k].j += bikes[k].dj;
				if (checkIfBikeIsDead(k)){
					deadbikes++;
				}
			} else {
				deadbikes++;
			}
		}
	}
	
	if (count > 0){
		if (count == deadbikes){
		resetGame();
		}
		setTimeout(step, 100);
		everyone.now.receiveNewPositions(bikes);
	//	traceMap();
	} else {
		gameON = false;
	}


}

