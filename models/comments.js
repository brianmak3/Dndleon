var mongoose = require('mongoose');
var schema = new mongoose.Schema({
    _id:String,
    comments:[
	  {
	  	 id:Number,
	    _id: String,
	    comment:String,
	    time: String,
	    date:String
	  }
    ]
});

module.exports = mongoose.model('comments', schema);