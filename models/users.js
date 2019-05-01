var mongoose = require('mongoose');
var bcrypt = require('bcrypt');
var userSchema = new mongoose.Schema({
    userId:{type:Number,require:true},
    email:{type:String,require:true},
    userName: String,
    password: {type:String,require:true},
    status: String,
    gender: String,
    passCode: Number,
    pic: String,
    firstName: String,
    lastName: String,
    facebook: Boolean,
    twitter: Boolean,
    noConnections: Number,
    dob:String,
    notifications: Number,
    location: {
        lat: Number,
        lng: Number,
        place: String
    },
    connections: [{
        status: String,
        id: String
    }],
    notes:[]
});
userSchema.methods.generatHarsh = function (password) {
    return bcrypt.hashSync(password, bcrypt.genSaltSync(9));
};
userSchema.methods.validPassword =function (password) {
    return bcrypt.compareSync(password,this.password);
};
module.exports = mongoose.model('users', userSchema);