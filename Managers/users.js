'use strict';

const uuidv4 = require('uuid/v4');
const path = require('path');
const fs = require('fs');
const images = require('./images');
const errors = require('../errors');
const eContactType = require('../ContactType');

var db;
var sockets;
var pushes;

var users = {

    inject: function (_db, _sockets, _pushes) {
        db = _db;
        sockets = _sockets;
        pushes = _pushes;
    },

    /* 
     * Method is used before handling the destination API method.
     * Identifies request originator and adds it to request object for easier processing
     */
    identifyUser: function (req, res, next) {
        let tokenQuery = { "token": req.header("token") };
        db.collection('users').findOne(tokenQuery, function (err, user) {
            if (user) {
                req.user = user;
                next();
            } else {
                res.sendStatus(401);
            }
        });
    },

    sendConversationRequest: function (senderUsername, receiverUsername) {
        db.collection('users').findOne({ username: receiverUsername }, (err, receiver) => {
            receiver.contacts.push({ username: senderUsername, verified: false });
            db.collection('users').updateOne({ username: receiver.username }, receiver, function (err, results) {
                if (sockets.isUserOnline(receiverUsername)) {
                    sockets.sendConversationRequest(receiverUsername);
                } else {
                    pushes.sendConversationRequestToUser(receiverUsername);
                }
            });
        });
    },

    getContactTypeForUser: function (contactUsername, user) {
        return new Promise(function (resolve, reject) {
            db.collection('users').findOne({ username: user }, (err, result) => {
                var foundContact = result.contacts.find(x => x.username == contactUsername);
                if (!foundContact) {
                    resolve(eContactType.unknown);
                } else {
                    resolve(foundContact.verified ? eContactType.verified : eContactType.unverified);
                }
            })
        })
    },

    // ----------------- API METHODS ----------------- //

    verifySession: function (req, res) {
        let tokenQuery = { "token": req.query["token"] };
        db.collection('users').findOne(tokenQuery, (err, results) => res.sendStatus(results != null ? 200 : 401));
    },

    signUp: function (req, res) {
        var username = req.body['username'];
        userExists(db, username).then(exists => {
            if (exists) {
                return res.status(403).send(errors.signup_username_in_use);
            }
            var user = new User(req.body);
            db.collection('users').insertOne(user, function (err, result) {
                if (!err) {
                    console.log("Users: New user '%s' registered", user.username);
                    res.json(user);
                } else {
                    console.log('Users: Failed to register a new user');
                    res.sendStatus(500);
                }
            })
        });
    },

    logIn: function (req, res) {
        var users = db.collection("users");
        let userQuery = { "username": req.query["username"], "password": req.query["password"] };
        users.findOne(userQuery, { _id: 0 }, function (err, user) {
            if (user) {
                var token = uuidv4();
                user.token = token;
                console.log("Users: '%s' logged in", user.username);
                users.updateOne(userQuery, { $set: { "token": token } }, function (err, result) { });
                res.json(user);
            } else {
                console.log("Users: '%s' failed to login", req.query["username"]);
                res.status(403).send(errors.login_wrong_credentials);
            }
        })
    },

    search: function (req, res) {
        var searchQuery = req.query["query"];
        if (searchQuery.length < 3) {
            return res.status(400);
        }
        search(searchQuery).then(function (results) {
            let thisUserExcludedResults = results.filter(user => user.username != req.user.username);
            res.json(thisUserExcludedResults);
        });
    },

    getContacts: function (req, res) {
        let pjQuery = { _id: 0, password: 0, token: 0 };
        let contactsQuery = { "username": { $in: req.user.contacts.map(x => x.username) } };
        db.collection('users').find(contactsQuery).project(pjQuery).toArray((err, results) => {
            let verifiedContacts = req.user.contacts.map(contact => {
                if (contact.verified) return contact.username;
            });
            results.forEach(contact => (contact.verified = verifiedContacts.contains(contact.username)));
            res.json(results);
        })
    },

    addToContacts: function (req, res) {
        let query = { "username": req.user.username };
        let newContact = req.body["contact"];
        req.user.contacts = req.user.contacts.filter(x => x.username != newContact);
        req.user.contacts.push({ username: newContact, verified: true });
        db.collection('users').updateOne(query, req.user, (err, results) => res.sendStatus((err == null) ? 200 : 400));
    },

    verifyContact: function (req, res) {
        let query = { "username": req.user.username };
        let contactUsername = req.body["contact"];
        req.user.contacts.forEach(contact => {
            if (contact.username == contactUsername)
                contact.verified = true;
        })
        db.collection('users').updateOne(query, req.user, (err, results) => res.sendStatus((err == null) ? 200 : 400));
    },

    getIsOnlineStatus: function (req, res) {
        let isOnline = sockets.isUserOnline(req.query["username"]);
        res.json(isOnline === true ? true : false);
    },

    removeFromContacts: function (req, res) {
        let contactToDelete = req.query["contact"];
        req.user.contacts = req.user.contacts.filter(x => (x.username != contactToDelete));
        let query = { "username": req.user.username };
        db.collection('users').updateOne(query, req.user, function (err, dres) {
            res.sendStatus((err == null) ? 200 : 500);
        });
    },

    uploadAvatar: function (req, res) {
        if (req.user.imageUrl != null) {
            images.deleteImage(req.user.imageUrl);
        }
        let query = { "username": req.user.username };
        req.user.imageUrl = '/images/' + req.file.filename;
        db.collection('users').updateOne(query, req.user, function (err, dres) {
            (err == null) ? res.json({ "imageUrl": req.user.imageUrl }) : res.sendStatus(500);
        });
    },

    changeUserInfo: function (req, res) {
        req.user.firstname = req.body["firstname"];
        req.user.secondname = req.body["secondname"];
        let query = { "username": req.user.username };
        db.collection('users').updateOne(query, req.user, function (err, dres) {
            res.sendStatus((err == null) ? 200 : 500);
        });
    },

    deleteUser: function (req, res) {
        db.collection("users").remove({ username: req.query["username"] });
        res.sendStatus(200);
    },

}

module.exports = users;

////////////////////////////////////////////////////////////////

function User(body) {
    this.username = body['username'];
    this.password = body['password'];
    this.token = uuidv4();
    this.firstname = body['firstname'] || "";
    this.secondname = body['secondname'] || "";
    this.contacts = [];
    this.pushToken = "";
    this.isValid = function () {
        return (this.username && this.password);
    }
}

function userExists(db, username) {
    return new Promise(function (resolve, reject) {
        db.collection("users").find({ "username": username }).toArray((err, res) => resolve(res.length != 0));
    });
}

function search(query) {
    return new Promise(function (resolve, reject) {
        var rqU = { username: { $regex: query, $options: 'i' } };
        var rqF = { firstname: { $regex: query, $options: 'i' } };
        var rqS = { secondname: { $regex: query, $options: 'i' } };
        var pjQuery = { _id: 0, password: 0, token: 0 };
        db.collection("users").find({ $or: [rqU, rqF, rqS] }).project(pjQuery).toArray(function (err, res) {
            resolve(res.unduplicatedBy("username"))
        });
    })
}
