var mongoose = require('mongoose');
var schema = new mongoose.Schema({
    id: String,
    owner:{
        id: String,
        name: String,
        userName: String,
        pic: String
    },
    time: Number
});

module.exports = mongoose.model('likes', schema);