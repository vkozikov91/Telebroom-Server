'use strict';

const http = require('http');
const WebSocket = require('ws');

var server;
var wsServer;
var db;

var activeConnections = {};

const kSocketsPort = 3000;

const eSocketMessageType = {
    newMessage: "msg",
    statusUpdated: "sta",
    messagesDeleted: "dlt",
    conversationRequest: "crq"
}

var webSockets = {

    inject: function (_db) {
        db = _db;
    },

    start: function (app) {
        return new Promise(function (resolve, reject) {
            server = http.createServer(app);
            wsServer = new WebSocket.Server({ server });
            wsServer.on('connection', connection => {
                
                connection.on('message', message => {
                    // Client sends 'auth::username' when establishing connection to register
                    let data = message.split('::');
                    if (data.length != 2 || data.first() != "auth") { return }
                    let username = data[1];
                    if (!username) {
                        console.log("Sockets: [!] Warning: empty username in auth request");
                    }
                    registerConnection(username);
                });
                connection.on('close', connection => unregisterConnection());
                connection.on('error', connection => unregisterConnection());

                // 

                var userAssociatedWithConnection;

                function registerConnection(username) {
                    userAssociatedWithConnection = username;
                    activeConnections[username] = connection;
                    notifyContactsOnOnline(userAssociatedWithConnection);
                    console.log("Sockets: '%s' is Online", userAssociatedWithConnection);
                }

                function unregisterConnection() {
                    delete activeConnections[userAssociatedWithConnection];
                    notifyContactsOnOffline(userAssociatedWithConnection);
                    console.log("Sockets: '%s' is Offline", userAssociatedWithConnection);
                    userAssociatedWithConnection = null;
                }
            });

            server.on('error', error => {
                console.log("Starting WS ... failed :: ", error);
                reject(error);
            });

            server.listen(kSocketsPort, () => {
                console.log("Starting WS ... success :: Listening on port " + server.address().port);
                resolve();
            });
        })
    },

    isUserOnline: function (username) {
        let connection = activeConnections[username];
        return (connection != null)
    },

    sendMessage: function (message) {
        let msg = { type: eSocketMessageType.newMessage, data: message };
        let receiverConnection = activeConnections[message.to];
        if (receiverConnection != null)
            receiverConnection.send(JSON.stringify(msg));
    },

    notifyMessagesDeleted: function (username, msgIds) {
        let receiverConnection = activeConnections[username];
        let deleteNotification = { type: eSocketMessageType.messagesDeleted, data: msgIds };
        if (receiverConnection != null)
            receiverConnection.send(JSON.stringify(deleteNotification));
    },

    sendConversationRequest: function (receiverUsername) {
        let receiverConnection = activeConnections[receiverUsername];
        let requestNotification = { type: eSocketMessageType.conversationRequest, data: "" };
        if (receiverConnection != null)
            receiverConnection.send(JSON.stringify(requestNotification));
    }
}

module.exports = webSockets

////////////////////////////////////////////////////////////////

function notifyContactsOnOnline(user) {
    let msg = { type: eSocketMessageType.statusUpdated, data: { username: user, online: 'true' } };
    sendMessageToContacts(user, msg);
}

function notifyContactsOnOffline(user) {
    let msg = { type: eSocketMessageType.statusUpdated, data: { username: user, online: 'false' } };
    sendMessageToContacts(user, msg);
}

function sendMessageToContacts(user, message) {
    getContactsForUser(user, function (contacts) {
        contacts.forEach(function (contact) {
            let connection = activeConnections[contact.username];
            if (connection != null)
                connection.send(JSON.stringify(message));
        });
    });
}

function getContactsForUser(username, cb) {
    let query = { "username": username }
    db.collection('users').findOne(query, function (err, user) {
        (user != null) ? cb(user.contacts) : cb([]);
    });
}