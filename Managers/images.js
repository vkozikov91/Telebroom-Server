'use strict';

const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const storage = multer.diskStorage({
    destination: __dirname + '/../uploads/',
    fileFilter: function (req, file, cb) {
        if (path.extension(file.originalname) === 'jpeg') {
            return cb(null, true)
        }
        cb(null, false)
    },
    filename: function (req, file, cb) {
        crypto.pseudoRandomBytes(16, function (err, raw) {
            if (err) return cb(err)
            cb(null, raw.toString('hex') + path.extname(file.originalname));
        });
    }
});
const uploadParser = multer({ storage: storage });

//

var images = {

    getImage: function (req, res) {
        let imageFile = req.originalUrl.split('/').last();
        let imagePath = path.join(__dirname, '/../uploads/', imageFile);
        if (fs.existsSync(imagePath)) {
            res.sendFile(imagePath);
        }
        else {
            res.sendStatus(403);
        }
    },

    deleteImage: function (imageFilename) {
        let oldAvatarPath = __dirname + '/../uploads/' + imageFilename.split('/').last();
        try { fs.unlinkSync(oldAvatarPath) } catch (error) { };
    },

    imageParser: uploadParser.single('avatar')

}

module.exports = images