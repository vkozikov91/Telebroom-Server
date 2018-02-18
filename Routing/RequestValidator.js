/*
 * Validator checks that every received request contains appropriate fields before sending it for processing
 */

'use strict';

const paths = require('./paths');

let validator = {
    
    validateRequest: function (req, res, next) {
        if (req.path.startsWith(paths.images)) {
            next();
            return;
        }
        switch (req.path) {
            case paths.ping:
            case paths.uploadAvatar:
            case paths.getContacts:
            case paths.postImage:
                next();
                break;

            case paths.apiPath:
            case paths.verifySession:
                (req.query["token"]) ? next() : res.sendStatus(400);
                break;
                
            // USERS

            case paths.signup:
                (req.body["username"] && req.body["password"]) ? next() : res.sendStatus(400);
                break;
            case paths.login:
                (req.query["username"] && req.query["password"]) ? next() : res.sendStatus(400);
                break;
            case paths.search:
                (req.query["query"]) ? next() : res.sendStatus(400);    
                break;
            case paths.addContact:
                (req.body["contact"]) ? next() : res.sendStatus(400);
                break;
            case paths.verifyContact:
                (req.body["contact"]) ? next() : res.sendStatus(400);
                break;
            case paths.getIsOnline:
                (req.query["username"]) ? next() : res.sendStatus(400);
                break;
            case paths.removeFromContacts:
                (req.query["contact"]) ? next() : res.sendStatus(400);
                break;
            case paths.changeUserInfo:
                if (req.body["firstname"] || req.body["secondname"]) {
                    next();
                } else {
                    res.sendStatus(400);
                }
                break;

            // MESSAGES

            case paths.postMessage:
                (req.body["remoteUser"] && req.body["text"]) ? next() : res.sendStatus(400);
                break;
            case paths.deleteMessages:
                (req.query["ids"]) ? next() : res.sendStatus(400);
                break;
            case paths.getMessages:
                (req.query["remoteUser"] && req.query["pageSize"]) ? next() : res.sendStatus(400);
                break;
            
            // PUSH

            case paths.registerPush:
                (req.body["pushToken"] && req.body["username"] ? next() : res.sendStatus(400));
                break;
            case paths.unregisterPush:
                (req.body["username"] ? next() : res.sendStatus(400));
                break;

            default:
                res.sendStatus(400);
                break;
        }
    }
};

module.exports = validator
