'use strict';

const express = require('express');
const images = require('../Managers/images')
const messages = require('../Managers/messages');
const users = require('../Managers/users');
const pushes = require('../Managers/pushes');
const paths = require('./paths');

var router = express.Router();

router.inject = function (db, sockets) {
    pushes.inject(db);
    users.inject(db, sockets, pushes);
    messages.inject(db, sockets, pushes, users);
};

router.all(paths.apiPath + "*", users.identifyUser);
router.get(paths.images + "*", images.getImage);

// OPERATIONS WITH MESSAGES
router.post(paths.postMessage, messages.postMessage);
router.post(paths.postImage, images.imageParser, messages.postImage);
router.get(paths.getMessages, messages.getMessages);
router.delete(paths.deleteMessages, messages.deleteMessages);

// OPERATIONS WITH USERS
router.get(paths.verifySession, users.verifySession);
router.get(paths.login, users.logIn);
router.post(paths.signup, users.signUp);
router.get(paths.search, users.search);
router.get(paths.getContacts, users.getContacts);
router.get(paths.getIsOnline, users.getIsOnlineStatus);
router.patch(paths.addContact, users.addToContacts);
router.patch(paths.verifyContact, users.verifyContact);
router.delete(paths.removeFromContacts, users.removeFromContacts);
router.patch(paths.changeUserInfo, users.changeUserInfo);
router.post(paths.uploadAvatar, images.imageParser, users.uploadAvatar);

// PUSH NOTIFICATIONS
router.patch(paths.registerPush, pushes.registerPushToken);
router.patch(paths.unregisterPush, pushes.unregisterPushToken);

module.exports = router
