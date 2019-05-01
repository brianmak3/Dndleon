var mongoose = require('mongoose');
var schema = new mongoose.Schema({
    id:Number,
    action: {
    title:String,
    icon:String
    },
    byId:String,
    byName:String,
    location: {
        lat: Number,
        lng: Number,
        place: String
    },
    comments: Number,
    likes: Number,
    likeIds:[],
    img: String,
    text: String,
    time:String,
    date:String
});

module.exports = mongoose.model('posts', schema);