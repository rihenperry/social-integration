var post_model = require('../model/post_model.js');

//update reply to post
var setreply =  function(req, res){

    var reply = req.body.reply;
    var replyfrom = req.body.replyfrom;
    var post_id = req.body.post_id;

    //blank validation

    var post_reply = {
        reply : reply,
        reply_from : replyfrom
    }

    post_model.post
    .findOneAndUpdate({_id: post_id}, {$push: {"post_reply": post_reply}}, {setDefaultsOnInsert: true})
    .exec(function(err, result){
        if (err) {
            res.send(err)
        };
        console.info(result);
        res.json({
            blockUserDetails: result
        })
    });

};

var getreply = function(req, res){

    var postId = req.params.postId;

    post_model.post
    .find({_id : postId})
    .select('post_reply')
    .sort({reply_at : -1})
    .exec(function(err, result){
        if (err) {
            res.send(err)
        };
        console.info(result);

        res.json({
            reply: result
        })

    })
}

module.exports = ({
    setreply : setreply,
    getreply : getreply
});