'use strict';

const images = require('./images');
const eContactType = require('../ContactType');
const kImagePrefix = 'img>>';
var ObjectId = require('mongodb').ObjectID;

var db;
var sockets;
var pushes;
var users;

var messages = {

    inject: function (_db, _sockets, _pushes, _users) {
        db = _db;
        sockets = _sockets;
        pushes = _pushes;
        users = _users;
    },

    // ----------------- API METHODS ----------------- //

    postMessage: function (req, res) {
        var message = new Message(req.user.username, req.body.remoteUser, req.body.text);
        db.collection('messages').insertOne(message, function (err, result) {
            let msgId = result.insertedId.toString();
            res.send(msgId);
            notifyReceiverAboutNewMessage(message);
        });
    },

    postImage: function (req, res) {
        var message = new Message(req.user.username, req.body.remoteUser, kImagePrefix + req.file.filename);
        db.collection('messages').insertOne(message, function (err, result) {
            let msgId = result.insertedId.toString();
            message._id = msgId;
            res.json({ "id": msgId, "imageText": message.text });
            notifyReceiverAboutNewMessage(message);
        });
    },

    editMessage: function (req, res) {
        // TBD: Implement if needed. Logic seems to resemble the deletion one
        res.sendStatus(403);
    },

    deleteMessages: function (req, res) {
        let msgQuery = { "_id": { $in: req.query["ids"].map(x => ObjectId(x)) } };
        db.collection('messages').find(msgQuery).toArray(function (err, result) {
            result.forEach(function (msg) {
                if (msg.text.startsWith(kImagePrefix))
                    images.deleteImage(msg.text.replace(kImagePrefix, ""));
            });
            db.collection('messages').remove(msgQuery, function (err, result) {
                sockets.notifyMessagesDeleted(req.query["remoteUser"], req.query["ids"]);
            });
            res.sendStatus(200);
        });
    },

    getMessages: function (req, res) {
        let userA = req.user.username;
        let userB = req.query.remoteUser;
        let fromDate = req.query.fromDate;
        let pageSize = req.query.pageSize;
        getMessages(userA, userB, fromDate, pageSize).then(messages => res.json(messages));
    }
}

module.exports = messages;

////////////////////////////////////////////////////////////////

function Message(from, to, text) {
    this.from = from;
    this.to = to;
    this.text = text;
    this.date = new Date();
}

function getMessages(userA, userB, fromDate, pageSize) {
    return new Promise(function (resolve, reject) {
        let msgQuery = { 'from': { $in: [userA, userB] }, 'to': { $in: [userA, userB] } };
        if (fromDate) {
            msgQuery['date'] = { $lt: new Date(fromDate) };
        }
        db.collection('messages')
            .find(msgQuery)
            .sort({ _id: -1 })
            .limit(parseInt(pageSize, 10))
            .toArray((err, result) => { (err) ? reject(error) : resolve(result) });
    })
}

function notifyReceiverAboutNewMessage(message) {
    users.getContactTypeForUser(message.from, message.to).then(type => {
        if (type == eContactType.unknown) {
            users.sendConversationRequest(message.from, message.to);
        } else if (type == eContactType.unverified) {
            // Contact request is sent but not accepted yet
        } else {
            if (sockets.isUserOnline(message.to)) {
                sockets.sendMessage(message);
            } else {
                if (message.text.startsWith(kImagePrefix)) {
                    message.text = "* Sent you an image *";
                }
                pushes.sendMessage(message);
            }
        }
    })
}
