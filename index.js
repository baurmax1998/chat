// Setup basic express server
var express = require('express');
const readline = require('readline');
const app = express();
var path = require('path');
var formidable = require('formidable');
var fs = require('fs');
var server = require('http').createServer(app);
var io = require('./socket.io/')(server);
var port = process.env.PORT || 3030;
server.listen(port, function () { //NOTE we start only with the database
    console.log('Server listening at port %d', port);
});
//mongodb einsetzen wenn ich wieder Internet hab
// tutorial https://zellwk.com/blog/crud-express-mongodb/
// mongo db anbiter https://mlab.com/databases/chat#collections
//const MongoClient = require('mongodb').MongoClient;
//var db;
//MongoClient.connect('mongodb://user:useruser@ds137340.mlab.com:37340/chat', (err, database) => {
//    if (err) return console.log(err)
//    db = database
//    server.listen(port, function () {
//        console.log('Server listening at port %d', port);
//    });
//});
var mysql = require('mysql');
var pool = mysql.createPool({
    connectionLimit: 100, //important
    host: 'localhost'
    , user: 'root'
    , password: ''
    , database: 'web_chat'
    , debug: false
});

function handle_database(req, res) {
    pool.getConnection(function (err, connection) {
        if (err) {
            res.json({
                "code": 100
                , "status": "Error in connection database"
            });
            return;
        }
        console.log('connected as id ' + connection.threadId);
        connection.query("select * from links;", function (err, rows) {
            connection.release();
            if (!err) {
                console.log(rows);
                res.send(rows);
            }
        });
        connection.on('error', function (err) {
            res.json({
                "code": 100
                , "status": "Error in connection database"
            });
            return;
        });
    });
}
//test rest
app.get('/test', function (req, res) {
    var data = getData(req);
    console.log(data);
    res.send(data);
});

function getData(req) {
    for (var value in req.query) {
        return JSON.parse(value)
    }
}
//upload files
app.post('/upload', function (req, res) {
    // create an incoming form object
    var form = new formidable.IncomingForm();
    // specify that we want to allow the user to upload multiple files in a single request
    form.multiples = true;
    // store all uploads in the /uploads directory
    form.uploadDir = path.join(__dirname, './public/uploads');
    // every time a file has been uploaded successfully,
    // rename it to it's orignal name
    form.on('file', function (field, file) {
        fs.rename(file.path, path.join(form.uploadDir, file.name));
    });
    // log any errors that occur
    form.on('error', function (err) {
        console.log('An error has occured: \n' + err);
    });
    // once all the files have been uploaded, send a response to the client
    form.on('end', function () {
        res.end('success');
    });
    // parse the incoming request containing the form data
    form.parse(req);
});
//console befehle
const rl = readline.createInterface({
    input: process.stdin
    , output: process.stdout
});
rl.on('line', (line) => {
    switch (line.trim()) {
    case 'hello':
        console.log('world!');
        break;
    case 'file':
        console.log('todo files!');
        break;
    case 'module':
        console.log('todo module!');
        break;
    default:
        console.log(`Say what? I might have heard '${line.trim()}'`);
        break;
    }
    rl.prompt();
}).on('close', () => {
    console.log('Have a great day!');
    process.exit(0);
});
// Routing
app.use(express.static(__dirname + '/public'));
//Groups
var nsp = io.of('/my-namespace');
nsp.on('connection', function (socket) {
    console.log('someone connected');
    var addedUser = false;
    // when the client emits 'new message', this listens and executes
    socket.on('new message', function (data) {
        // we tell the client to execute 'new message'
        socket.broadcast.emit('new message', {
            username: socket.username
            , message: data
        });
    });
    // when the client emits 'add user', this listens and executes
    socket.on('add user', function (username) {
        if (addedUser) return;
        // we store the username in the socket session for this client
        socket.username = username;
        ++numUsers;
        addedUser = true;
        socket.emit('login', {
            numUsers: numUsers
        });
        // echo globally (all clients) that a person has connected
        socket.broadcast.emit('user joined', {
            username: socket.username
            , numUsers: numUsers
        });
    });
    // when the client emits 'typing', we broadcast it to others
    socket.on('typing', function () {
        socket.broadcast.emit('typing', {
            username: socket.username
        });
    });
    // when the client emits 'stop typing', we broadcast it to others
    socket.on('stop typing', function () {
        socket.broadcast.emit('stop typing', {
            username: socket.username
        });
    });
    // when the user disconnects.. perform this
    socket.on('disconnect', function () {
        if (addedUser) {
            --numUsers;
            // echo globally that this client has left
            socket.broadcast.emit('user left', {
                username: socket.username
                , numUsers: numUsers
            });
        }
    });
});
nsp.emit('hi', 'everyone!');
// Chatroom
var numUsers = 0;
io.on('connection', function (socket) {
    //    var addedUser = false;
    //    // when the client emits 'new message', this listens and executes
    //    socket.on('new message', function (data) {
    //        // we tell the client to execute 'new message'
    //        socket.broadcast.emit('new message', {
    //            username: socket.username
    //            , message: data
    //        });
    //    });
    //    // when the client emits 'add user', this listens and executes
    //    socket.on('add user', function (username) {
    //        if (addedUser) return;
    //        // we store the username in the socket session for this client
    //        socket.username = username;
    //        ++numUsers;
    //        addedUser = true;
    //        socket.emit('login', {
    //            numUsers: numUsers
    //        });
    //        // echo globally (all clients) that a person has connected
    //        socket.broadcast.emit('user joined', {
    //            username: socket.username
    //            , numUsers: numUsers
    //        });
    //    });
    //    // when the client emits 'typing', we broadcast it to others
    //    socket.on('typing', function () {
    //        socket.broadcast.emit('typing', {
    //            username: socket.username
    //        });
    //    });
    //    // when the client emits 'stop typing', we broadcast it to others
    //    socket.on('stop typing', function () {
    //        socket.broadcast.emit('stop typing', {
    //            username: socket.username
    //        });
    //    });
    //    // when the user disconnects.. perform this
    //    socket.on('disconnect', function () {
    //        if (addedUser) {
    //            --numUsers;
    //            // echo globally that this client has left
    //            socket.broadcast.emit('user left', {
    //                username: socket.username
    //                , numUsers: numUsers
    //            });
    //        }
    //    });
});