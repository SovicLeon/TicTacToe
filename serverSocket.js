var ioC = require('socket.io-client');
var otherPort = 3001;
var myPort = 3000;
var mySign = 1;
var otherSign = 2;
var arr = [0,0,0,0,0,0,0,0,0,1,0];
var iStart = false;
var otherStart = false;
var started = false;

// make server
const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const port = process.env.PORT || myPort;

// connect to other server
ioClient = ioC.connect(`http://localhost:${otherPort}`);

// send first emit
ioClient.emit("server handshake", myPort);

// get respose from other server
io.on('connection', (socket) => {
  socket.on('server handshake', (msg) => {
    console.log("server connected from port: " + msg);
  });
});

// html  file / client
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// start game
io.on('connection', (socket) => {
  socket.on('start', (msg) => {
    if (!otherStart) {
      ioClient.emit("otherStart", true);
      console.log("start req sent");
      iStart = true;
    } else {
      ioClient.emit("otherStart", true);
      console.log("start req sent");
      console.log("start game");
      arr = [0,0,0,0,0,0,0,0,0,1,0];
      io.emit('dataArrClient', arr);
      io.emit('myVariables', [mySign,otherSign]);
      otherStart = false;
      started = true;
    }
  });
});

// start game
io.on('connection', (socket) => {
  socket.on('otherStart', (msg) => {
    console.log("other server wants to start game");
    otherStart = true;
    if (iStart) {
      console.log("start game");
      arr = [0,0,0,0,0,0,0,0,0,1,0];
      io.emit('dataArrClient', arr);
      io.emit('myVariables', [mySign,otherSign]);
      otherStart = false;
      iStart = false;
      started = true;
    } else {
      io.emit("updates","Other player wants to start game, press Start game to start.")
    }
  });
});

// get new data from client, emit to client / html 
io.on('connection', (socket) => {
  socket.on('dataArr', msg => {
    if (started) {
      if (arr[10] != 0) {
        io.emit('dataArrClient', arr);
        io.emit("updates","Game ended!")
        started = false;
      } else if (arr[9] != mySign) {
        io.emit('dataArrClient', arr);
        io.emit("updates","Not your turn!")
      } else {
        if (changes(msg) != 1) {
          io.emit('dataArrClient', arr);
          console.log("ERROR: Some variable was overwritten or not wirtten at all!");
        } else if (arr[10] == 0) {
          arr = msg;
          if (checkWinner(arr,mySign)) {
            console.log("you won");
            arr[10] = mySign;
          }
          if (checkDraw(arr)) {
            console.log("its a draw");
            arr[10] = 3;
          }
          io.emit('dataArrClient', arr);
          console.log('data array: ' + arr.toString());
          ioClient.emit("dataArrServ", arr);
        }
      }
    }
  });
});

// get data from other server
io.on('connection', (socket) => {
  socket.on('dataArrServ', (msg) => {
    arr = msg;
    console.log('data array other server: ' + msg.toString());
    io.emit("dataArrClient", msg);
  });
});

// new connections / disconnect
io.on('connection', (socket) => {
  console.log('a user connected');
  socket.on('disconnect', () => {
    console.log('user disconnected');
    arr = [0,0,0,0,0,0,0,0,0,0,0];
    io.emit('dataArrClient', arr);
    io.emit("updates","Other player disconnected!")
    started = false;
    ioClient.emit("disconnected", true);
  });
});

io.on('connection', (socket) => {
  socket.on('disconnected', (msg) => {
    console.log('user disconnected');
    arr = [0,0,0,0,0,0,0,0,0,0,0];
    io.emit('dataArrClient', arr);
    io.emit("updates","Other player disconnected!")
    started = false;
  });
});

// when started
http.listen(port, () => {
  console.log(`Socket.IO server running at http://localhost:${port}/`);
});

// check array for winner
function checkWinner (arr,sign) {
  if (checkCol(arr,sign) || checkRow(arr,sign) || checkCross(arr,sign)) {
    return true;
  } else {
    return false;
  }
}

function checkRow (arr,sign) {
  for (let i = 0; i < 9; i+=3) {
    for (let j = i; j < i+3; j++) {
      if (arr[j] != sign) {
        break;
      } else if (j == i+2) {
        return true;
      }
    }
  }
  return false;
}

function checkCol (arr,sign) {
  for (let i = 0; i < 3; i++) {
    for (let j = i; j < i+7; j+=3) {
      if (arr[j] != sign) {
        break;
      } else if (j == i+6) {
        return true;
      }
    }
  }
  return false;
}

function checkCross (arr,sign) {
  if (arr[0] == sign && arr[4] == sign && arr[8] == sign) {
    return true;
  }
  if (arr[2] == sign && arr[4] == sign && arr[6] == sign) {
    return true;
  }
  return false;
}

// check for draw
function checkDraw (arr) {
  for (let i = 0; i < 9; i++) {
    if (arr[i] == 0) {
      return false;
    }
  }
  return true;
}

// check new input in game
function changes(msg) {
  var numOfZeroArr = 0;
  var numOfZeroMsg = 0;
  for (let i = 0; i < 9; i++) {
    if (msg[i] == 0) {
      numOfZeroMsg++;
    }
    if (arr[i] == 0) {
      numOfZeroArr++;
    }
  }
  return numOfZeroArr-numOfZeroMsg;
}