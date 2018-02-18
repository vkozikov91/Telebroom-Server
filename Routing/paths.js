'use strict';

let paths = {

    apiPath: '/api/v1/',

    ping: '/ping',
    images: '/images/',

    signup: '/signup',
    login: '/login',
    verifySession: '/verifySession',

    postMessage: '/api/v1/messages/text',
    postImage: '/api/v1/messages/image',
    getMessages: '/api/v1/messages',
    deleteMessages: '/api/v1/messages/delete',

    search: '/api/v1/users/search',
    getContacts: '/api/v1/users/getContacts',
    getIsOnline: '/api/v1/users/getIsOnline',
    addContact: '/api/v1/users/addContact',
    verifyContact: '/api/v1/users/verifyContact',
    removeFromContacts: '/api/v1/users/removeContact',
    changeUserInfo: '/api/v1/users/changeUserInfo',

    registerPush: '/api/v1/users/registerPushToken',
    unregisterPush: '/api/v1/users/unregisterPushToken',

    uploadAvatar: '/api/v1/users/avatar'
};

module.exports = paths;
