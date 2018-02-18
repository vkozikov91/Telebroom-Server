'use strict';

var helpers = require('./helpers.js');
var express = require('express');
var bodyParser = require('body-parser');

var sockets = require('./Managers/sockets');
let requestValidator = require('./Routing/requestValidator');

var mongodb;

const kMongoURL = "mongodb://localhost:27017/mydb";
const kHTTPPort = 8081;

// EXPRESS CONFIGURATION
var app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.all('/*', requestValidator.validateRequest);
app.all('/*', function (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    next();
});

// SERVER BOOTSTRAPPING
console.log("-- Starting Server --");
startMongo()
    .then(() => { return startWebSockets() })
    .then(() => { return startRouter() })
    .then(() => { return startHTTPServer() })
    .then(() => console.log("-- Server is ready -- "))
    .catch((err) => {
        console.log("-- [!] Failed to start server: %s --", err);
        process.exit(1);
    })

////////////////////////////////////////////////////////////////

function startMongo() {
    
    return new Promise(function (resolve, reject) {
        console.log("Starting Mongo ...");
        var MongoClient = require('mongodb').MongoClient;
        var url = kMongoURL;

        // TBD: Protect mongo with username/password authentication
        console.log("Starting Mongo ... [!] Warning: No authentication procedure configured");

        MongoClient.connect(url, function (err, db) {
            if (err) {
                reject(err);
            } else {
                console.log("Starting Mongo ... success");
                mongodb = db;
                resolve();
            }
        });
    });
}

function startRouter() {
    console.log("Starting Router ...");
    var router = require('./Routing/router');
    router.inject(mongodb, sockets);
    app.use('/', router);
    app.use(function (req, res) {
        console.log("Unknown request path: " + req.path);
        res.sendStatus(404);
    });
    console.log("Starting Router ... success");
}

function startHTTPServer() {
    return new Promise(function (resolve, reject) {
        console.log("Starting Express server ...");
        let port = kHTTPPort;
        app.listen(port, () => {
            console.log('Starting Express server ... success :: Listening on port ' + port)
            resolve();
        });
    });
}

function startWebSockets() {
    return new Promise(function (resolve, reject) {
        console.log("Starting WS ...");
        sockets.inject(mongodb);
        sockets.start(app)
            .then(() => resolve())
            .catch(err => reject(err))
    });
}
