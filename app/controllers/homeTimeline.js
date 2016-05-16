var user = require('../models/userSchema.js');
var follower = require('../models/followersSchema.js');
var post_model = require('../models/postSchema.js');
var log = require('../../config/logging')();

var homeTimeline = function(req, res) {

    log.info('home timeline api hitted');
    //FInd 10 active follwing
    var userid = req.body.userid;

    req.checkBody('userid', 'User id is mandatory').notEmpty();

    var errors = req.validationErrors();

    if (errors) {
        // res.send('There have been validation errors: ' + util.inspect(errors), 400);
        res.status('400').json('There have been validation errors: ' + util.inspect(errors));
        return;
    }

    follower
        .find({
            user_id: userid,
            follow_status: true
        })
        .select('following_id')
        .populate({
            path: 'following_id',
            select: ('_id update_at')

        })
        .sort({
            '_id': -1
        })
        .limit(10)
        .lean()
        .exec(function(err, followingResult) {

            if (err) {
                log.error(err);
                res.send(err);
            }

            if (followingResult.length == 0) {

                log.info('No Following Found');
                res.send('No Result Found');

            } else {

                // log.info(followingResult[2]);

                var options = {
                    path: 'user_id'
                }

                user
                    .find({
                        _id: userid
                    })
                    .select('update_at')
                    .exec(function(err, userResult) {

                        if (err) {
                            log.error(err);
                            res.send(err);
                        };

                        
                        var showPostLoggedUser = 'false';

                        if (userResult[0].update_at <= followingResult[0].following_id.update_at) {

                            followingResult[followingResult.length++] = userResult[0];

                            // console.info(followingResult);

                            var showPostLoggedUser = 'true';
                        }

                        followingIds = followingResult.map(function(singleFollowing) {

                            return singleFollowing.following_id._id;

                        });
                        
                        log.info(userResult[0].update_at+''+followingResult[2].following_id.update_at);
                        log.info('show post logged user: ',showPostLoggedUser);

                        if (showPostLoggedUser) {

                            followingIds.push(userResult[0]._id);

                        }

                        async.parallel([
                                callback => getPostByUserId(showPostLoggedUser, userid, callback),
                                callback => getRetweetByUserId(showPostLoggedUser, userid, callback),
                                callback => getQuoteRetweetByUserId(showPostLoggedUser, userid, callback),
                                callback => getReplyByUserId(showPostLoggedUser, userid, callback)
                            ],
                            function(err, result) {

                                if (err) {

                                    if (result[0] === 0) {
                                        log.info('Own posts are zero');
                                        var homePosts = result[1]
                                    }

                                    if (result[1] === 0) {
                                        log.info('Retweet posts are zero');
                                        var homePosts = result[0]
                                    }

                                } else {

                                    var homePosts = result[0].concat(result[1]).concat(result[2]).concat(result[3]); //Got two result , concent two results

                                    function custom_sort(a, b) {
                                        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                                    }

                                    homePosts.sort(custom_sort);

                                    // log.info(homePosts);
                                    res.json(homePosts);

                                }

                            })

                    });

            }

        })

    //Find post, retweet, reply of follwing user

}

//find post from userid
function getPostByUserId(showPostLoggedUser, userid, callback) {

    // log.info(showPostLoggedUser);

    if (showPostLoggedUser) {

        var query = {

            $or: [{
                posted_by: {
                    $in: followingIds
                },
                privacy_setting: {
                    $ne: 2
                }
            }, {
                posted_by: userid
            }]

        }

    } else {

        var query = {
            posted_by: {
                $in: followingIds
            },
            privacy_setting: {
                $ne: 2
            }

        }

    }

    //use userid to find all post of users
    post_model.post
        .find(query)
        .populate('posted_by')
        .sort({
            created_at: -1
        })
        .limit(10)
        .exec(function(err, result) {

            if (err) {

                log.error(err);
                res.send(err);
                return

            } else if (result.length == 0) {

                callback(null, []); //No post found

            } else {

                console.info(result);
                callback(null, result);
                
            }

        });

}

//find retweet from userid
function getRetweetByUserId(showPostLoggedUser, userid, callback) { //simple retweet

    if (showPostLoggedUser) {

        var query = {

            $or: [{

                ret_user_id: {
                    $in: followingIds
                },
                privacy_setting: {
                    $ne: 2
                }

            }, {
                ret_user_id: userid
            }]

        }

    } else {

        var query = {

            ret_user_id: {
                $in: followingIds
            },
            privacy_setting: {
                $ne: 2
            }

        }

    }

    post_model.retweet
        .find(query)
        .sort({
            retweet_at: -1
        })
        .limit(10)
        .lean()
        .exec(function(err, retweets) {

            if (err) {

                log.error(err);
                res.send(err);
                return

            } else if (retweets.length == 0) {

                callback(null, []); //No post found

            } else {

                async.each(retweets,

                    function(singleretweet, callback) {

                        if (singleretweet.post_id !== undefined) {

                            var options = [{
                                path: 'post_id'
                            }, {
                                path: 'post_id',
                                populate: {
                                    path: 'posted_by'
                                }
                            }];

                        } else if (singleretweet.retweet_quote_id !== undefined) {

                            var options = [{
                                path: 'retweet_quote_id'
                            }, {
                                path: 'post_id',
                                populate: {
                                    path: 'posted_by'
                                }
                            }];

                        } else if (singleretweet.reply_id !== undefined) {

                            var options = [{
                                path: 'reply_id'
                            }, {
                                path: 'reply_id',
                                populate: {
                                    path: 'posted_by'
                                }
                            }];

                        };

                        post_model.retweet
                            .populate(singleretweet, options, function(err, retweet) {

                                callback();

                            });


                    }, function(err) {

                        // log.info(retweets);

                        return callback(null, retweets);

                    });

            }

        });

}

//find quote retweet from userid
function getQuoteRetweetByUserId(showPostLoggedUser, userid, callback) { //simple retweet

    if (showPostLoggedUser) {

        var query = {

            $or: [{
                ret_user_id: {
                    $in: followingIds
                },
                privacy_setting: {
                    $ne: 2
                }

            }, {
                ret_user_id: userid
            }]

        }

    } else {

        var query = {
            ret_user_id: {
                $in: followingIds
            },
            privacy_setting: {
                $ne: 2
            }

        }

    }

    post_model.retweet_quote
        .find(query)
        .populate('ret_user_id')
        .sort({
            retweet_at: -1
        })
        .limit(10)
        .lean()
        .exec(function(err, retweets) {

            if (err) {
                log.error(err);
                res.send(err);
                return
            } else if (retweets.length == 0) {

                callback(null, []); //No post found

            } else {

                async.each(retweets,

                    function(singleretweet, callback) {

                        if (singleretweet.post_id !== undefined) {

                            var options = [{
                                path: 'post_id'
                            }, {
                                path: 'post_id',
                                populate: {
                                    path: 'posted_by'
                                }
                            }];

                        } else if (singleretweet.retweet_quote_id !== undefined) {

                            var options = [{
                                path: 'retweet_quote_id'
                            }, {
                                path: 'retweet_quote_id',
                                populate: {
                                    path: 'ret_user_id'
                                }
                            }];

                        } else if (singleretweet.reply_id !== undefined) {

                            var options = [{
                                path: 'reply_id'
                            }, {
                                path: 'reply_id',
                                populate: {
                                    path: 'reply_user_id'
                                }
                            }];

                        };

                        post_model.retweet
                            .populate(singleretweet, options, function(err, retweet) {

                                callback();

                            });


                    }, function(err) {

                        // log.info(retweets);

                        return callback(null, retweets);

                    });

            }

        });

}

//find reply from userid
function getReplyByUserId(showPostLoggedUser, userid, callback) {

    if (showPostLoggedUser) {

        var query = {

            $or: [{

                reply_user_id: {
                    $in: followingIds
                },
                privacy_setting: {
                    $ne: 2
                }
            }, {
                reply_user_id: userid
            }]

        }

    } else {

        var query = {

            reply_user_id: {
                $in: followingIds
            },
            privacy_setting: {
                $ne: 2
            }
        }

    }


    post_model.reply
        .find(query)
        .sort({
            created_at: -1
        })
        .limit(10)
        .lean()
        .exec(function(err, postReplyResult) {

            if (err) {
                log.error(err);
                res.send(err);
                return
            }
            // log.info('Reply By user: \n',postReplyResult);

            async.each(postReplyResult,

                function(singleReplyResult, callback) {

                    if (singleReplyResult.post_id !== undefined) {

                        var options = [{
                            path: 'post_id'
                        }, {
                            path: 'post_id',
                            populate: {
                                path: 'posted_by'
                            }
                        }];

                    } else if (singleReplyResult.retweet_quote_id !== undefined) {

                        var options = [{
                            path: 'retweet_quote_id'
                        }, {
                            path: 'retweet_quote_id',
                            populate: {
                                path: 'ret_user_id'
                            }
                        }];

                    } else if (singleReplyResult.reply_id !== undefined) {

                        var options = [{
                            path: 'reply_id'
                        }, {
                            path: 'reply_id',
                            populate: {
                                path: 'reply_user_id'
                            }
                        }];

                    };

                    post_model.reply
                        .populate(singleReplyResult, options, function(err, reply) {

                            callback();

                        });

                }, function(err) {

                    callback(null, postReplyResult);

                });

        })

};

module.exports = ({
    homeTimeline: homeTimeline
})