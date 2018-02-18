# Telebroom - Node.js Server
Telebroom is a project of a messenger applications infrastructure that at the moment consists of [iOS client](https://github.com/vkozikov91/Telebroom-iOS) and [Node.js](https://github.com/vkozikov91/Telebroom-Server) server. It's not a rigid product ready for mass deployment, because originally it was a playground to test how different frameworks and architectures play all together. However it has gradually grown into relatively 'fully fledged' project.

The following features are bestowed upon Telebroom users:
- **Sign up, login** - authorize with username and password;
- **Edit credentials** - change avatar, first/second name;
- **Search for contacts** - by part of username or any other name;
- **Send conversation requests** - once a conversation gets started with a new contact, the interlocutor is notified;
- **Send messages with text or images** - write texts, attach images from gallery or camera;
- **Delete sent messages** - if client 'A' deletes a message, it's deleted on 'B' side as well;
- **See contacts presence** - realtime online/offline status representation;
- **Receive messages when the app is not in foreground** - offline users are notified with Push Notifications;

## Node.js Server:
- Obviously written in JavaScript;
- Developed and tested with **Node.js 6.11.1**;
- Since the main focus of the infrastructure originally was the iOS client, the server project may require additional polishing or even patterns-based refactoring;

### Main used packages:
- [**Express.js**](https://expressjs.com/) - REST "engine";
- [**MongoDB**](https://mongodb.github.io/node-mongodb-native/) - server's main repository to store users, messages and other data;
- [**WS**](https://github.com/websockets/ws) - WebSocket server responsible for realtime presence and messages notifications;
- [**Multer**](https://github.com/expressjs/multer) - module to support uploading and saving images;
- [**node-apn**](https://github.com/node-apn/node-apn) - Push Notifications;

Run **npm update** to install all the packages from **package.json**


## How it all works:
---
### REST
Server provides REST API for different operations with users and messages. The complete list of supported requests can be found in **router.js**. Before handling a request it is checked by **requestValidator.js** to ensure that it contains all the parameters that are required for this specific path. If validation fails, _400_ is returned.

Moreover, almost all of the operational requests **require token** authentication. These are additionally checked for valid token and then, in case of success, forwarded to the **appropriate manager** to be handled.

### WebSocket connections
WebSocket connections are used to directly **send notifications** about conversation requests, new messages and realtime presence.
When a client establishes a WebSocket connection, it must authorize by broadcasting the following message to the server:
```sh
auth::<username>
```
Once this message is received, the connection is added to active connections list and associated with this username. From this point on, any notification that is required to be sent to the user with this username, will be sent via this connection.

### Registration
Client must provide username and encrypted password to login or register. This data is checked in the DB and if correct, a **unique token** is generated for this client and sent back. Further when receiving requests with this token, request is automatically associated with this client, client data is extracted from DB and added to request's body to simplify further processing.

Token's validity can be checked. This check is used by clients for autologin feature.
If client is sending a request with an invalid token, _401_ is returned and username/password are required to log in again.

### Posting messages
Message object contains the following fields:
- **sender** (username)
- **receiver** (username)
- **timestamp** 
- **text**
- **id** (set when saving the message to the DB)

Posted message is added to the DB, its _id_ is sent in response. The receiver is **notified by WebSocket or Push** depending on the online/offline status.
If message is an image, data is received using **Multer**, saved to the _uploads_ folder with unique _'image_filename'_ and the message text is set to:
```sh
img>>'image_filename'
```
Then the message is saved to the DB, _id_ and _'image_filename'_ are sent in response. From this point on, this image is directly available at _.../images/image_filename_.

**Client must prevent users from sending plain text messages with 'img>>' prefix**.

### Deleting messages
Delete request contains _ids_ of messages to be deleted. Firstly, the messages are removed from the DB. If any of them is an image message, associated file is also removed from the _uploads_ folder. Then the receiver gets _Messages Deleted_ notification containing the _ids_ to update the conversation.

### Presence
When a client established a WebSocket connection, it is considered to be online. _Status Updated_ event with username and status is sent to client's online contacts. Once the connection is closed, contacts are notified again.

### Push Notifications
When a client registers, it can provide Push Token that will be used to deliver Push Notifications. Such notifications are sent to offline receivers when a new message is received or a new conversation is started. At the moment, server is designed to work with **Apple Push Notification Service** only. It requires .p8 auth key certificate to be configured for Push Notifications and saved in the project's folder.

### Configuration and launch
---
#### 1. Configure APNS client

Configure and download your APNs .p8 auth key to the project's folder. Change the token and _kAPNSTopic_ variables in **pushes.js** according to the downloaded key parameters.
```js
var options = {
    token: {
        key: "XXXXXXXX.p8",
        keyId: "XXXXXXXX",
        teamId: "XXXXXXXX"
    },
    production: ...
};
...
const kAPNSTopic = ...;
```
More details about configuring are avaliable at [**node-apn**](https://github.com/node-apn/node-apn)

#### 2. Install and launch MongoDB

Change the following constant in **server.js** to reference the running MongoDB:
```js
const kMongoURL = "mongodb://localhost:27017/mydb";
```
If MongoDB is launched with auth enabled, add the appropriate configuration to **MongoClient** variable in **server.js**. More detailed information about client configuring is available at [official MongoDB installation guide](https://docs.mongodb.com/manual/installation/).

#### 3. Start the server

Enter **npm start** in the terminal or manually run **server.js**. Successful start will be accompanied by the following log entries:
```sh
-- Starting Server --
Starting Mongo ...
Starting Mongo ... success
Starting WS ...
Starting WS ... success :: Listening on port 3000
Starting Router ...
Starting Router ... success
Starting Express server ...
Starting Express server ... success :: Listening on port 8081
-- Server is ready -- 
```

### NOTES
---
- HTTP connection is used out of the box. HTTPS requires additional configuration.
- Additional configuration may be required in networks with proxy servers, since the app hasn't been properly tested in such environments.

 
### Room for improvement:
---
#### _Token expiration_
Current auth logic is based on tokens with no expiration time. Implementing token expiration will improve security.

#### _DDoS, brute-force, wrong passwords streak protection_
Catch and handle cases when requests frequency or amount seems suspicious.

#### _Detecting broken WebSocket connections_
Situations when connection abruptly breaks due to network issues.

### License
---
MIT