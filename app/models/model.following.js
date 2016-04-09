var mongoose = require('mongoose');
var usr_following_schema = mongoose.Schema({
    user  :   		{type: String , ref:"User"},
    usr_following:  {type:String} ,
    following_since:  {type:Date}
})

module.exports = mongoose.model('User_following', usr_following_schema);

