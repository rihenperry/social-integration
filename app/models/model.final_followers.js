var mongoose = require('mongoose');

var user_final_followers_schema = mongoose.Schema({
        user_id: {
            type: String,
            ref: "User" ,
              required: [true, 'Why no user_id?']
        },
        following_id: {
            type: String ,
              required: [true, 'Why no following_id?']
        },
        follower_since: {
            type: Date,
             default: Date.now
        }
    },
    {
        versionKey: false
    });

module.exports = mongoose.model('user_final_followers_schema', user_final_followers_schema);
