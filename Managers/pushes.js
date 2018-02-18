'use strict'

var db;
var apn = require('apn');
var options = {
    token: {
        key: "XXXXXXXXXX.p8",
        keyId: "XXXXXXXXXX",
        teamId: "XXXXXXXXXX"
    },
    production: false
};
const kAPNSTopic = "com.vkozikov.telebroom";
var apnProvider = new apn.Provider(options);

/*
 * APN 2.x may cause node warning message:
 * 'Warning: Possible EventEmitter memory leak detected. 11 wakeup listeners added.'
 * For more info check 'https://github.com/node-apn/node-apn/issues/518'
 * Should be fixed in 3.x which is in alpha at the moment.
*/

var pushes = {

    inject: function (_db) {
        db = _db;
    },

    sendMessage: function (message) {
        db.collection('users').findOne({ "username": message.to }, function (errR, receiver) {
            if (!receiver || !receiver.pushToken) {
                return;
            }
            db.collection('users').findOne({ "username": message.from }, function (errS, sender) {
                if (!sender) { return }
                sendMessagePushNotification(sender, receiver, message);
            });
        });
    },

    sendConversationRequestToUser: function (username) {
        db.collection('users').findOne({ "username": username }, function (errR, receiver) {
            if (!receiver || !receiver.pushToken) {
                return;
            }
            sendConversationRequestPushNotification(receiver);
        });
    },

    // ----------------- API METHODS ----------------- //

    registerPushToken: function (req, res) {
        let userQuery = { 'username': req.body["username"] };
        let token = req.body["pushToken"]
        db.collection('users').updateOne(userQuery, { $set: { "pushToken": token } }, function (err, result) {
            // TODO: Ensure that this token is unique in the DB ?
            if (!err) {
                console.log("Pushes: Updated Push Token for '%s'", req.body["username"]);
                res.sendStatus(200);
            } else {
                console.log("Pushes: Error when updating token for '%s'", req.body["username"]);
                res.sendStatus(500);
            }
        });
    },

    unregisterPushToken: function (req, res) {
        clearPushToken(db, req.body["username"]);
        res.sendStatus(200);
    }
};

module.exports = pushes;

////////////////////////////////////////////////////////////////

function sendMessagePushNotification(sender, receiver, message) {
    var senderDisplayName;
    if (sender.firstname && sender.secondname)
        senderDisplayName = sender.firstname + " " + sender.secondname;
    else
        senderDisplayName = sender.username;
    let pushText = senderDisplayName + ": " + message.text;

    var push = new apn.Notification();
    push.badge = 1;
    push.sound = "default";
    push.alert = pushText;
    push.payload = { "from": message.from };
    push.topic = kAPNSTopic;
    apnProvider.send(push, receiver.pushToken).then(result => {
        if (result.failed.length == 0) {
            console.log("Pushes: Succesfully sent Push to '%s' with alert '%s'", message.to, pushText);
        } else {
            if (result.failed[0].error) {
                console.log("Pushes: Failed to send Push to '%s' due to APNS connection issue", message.to);
            } else {
                console.log("Pushes: Failed to deliver Push to '%s' due to token issue", message.to);
                clearPushToken(db, receiver.username);
            }
        }
    });
}

function sendConversationRequestPushNotification(receiver) {
    var push = new apn.Notification();
    push.badge = 1;
    push.sound = "default";
    push.alert = "You have a new contact request";
    push.topic = kAPNSTopic;
    apnProvider.send(push, receiver.pushToken).then(result => {
        if (result.failed.length == 0) {
            console.log("Pushes: Succesfully sent Push to '%s' with contact request alert", receiver.username);
        } else {
            if (result.failed[0].error) {
                console.log("Pushes: Failed to send Push to '%s' due to APNS connection issue", receiver.username);
            } else {
                console.log("Pushes: Failed to deliver Push to '%s' due to token issue", receiver.username);
                clearPushToken(db, receiver.username);
            }
        }
    });
}

function clearPushToken(db, username) {
    let userQuery = { 'username': username };
    db.collection('users').updateOne(userQuery, { $set: { "pushToken": "" } }, function (err, result) {
        if (!err) {
            console.log("Pushes: Cleared Push Token for '%s'", username);
        } else {
            console.log("Pushes: Failed to clear Push Token for '%s'", username);
        }
    });
}
