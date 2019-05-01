var mongoose = require('mongoose');
var schema = new mongoose.Schema({
    postId: String,
    postOwner: String,
    time: String,
    date: String,
    text:String,
    readers:[],
    id: Number, 
    user:{
        id: String, 
        userName:String,
        pic:String
    }
});
module.exports = mongoose.model('notifications', schema);