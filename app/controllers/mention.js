var mention_model = require('../models/mentionSchema.js')
var async = require('async')
var log = require('../../config/logging')()

// Get mentionuser's post
var getmentionuser = function (req, res) { // get a post 

  log.info("Show mention user's post")

  var mention_user = req.params.mention_user

  req.checkParams('mention_user', 'mention_user').isAlpha()
  
  var errors = req.validationErrors()

  if (errors) {
    log.error('There have been validation errors: \n' + util.inspect(errors))
    res.status('400').json('There have been validation errors: ' + util.inspect(errors))
    return
  }

  async.parallel([
    getPostByMentionUser,
    getRetweetByMentionUser,
    getReplyByMentionUser
  ],
    function (err, result) {
      log.info(result)
      if (err) {
        if (result[0] === 0) {
          log.info('Own posts are zero')
          var mentionUserPosts = result[1]
        }

        if (result[1] === 0) {
          log.info('Retweet posts are zero')
          var mentionUserPosts = result[0]
        }
      } else {
        var mentionUserPosts = result[0].concat(result[1]).concat(result[2]); // Got two result , concent two results

        function custom_sort (a, b) {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        }

        mentionUserPosts.sort(custom_sort)
      }

      log.info(mentionUserPosts)
      res.json({
      mentionUserPosts})
    }
  )

  function getPostByMentionUser (callback) {
    var optionFilter = [{
      path: 'post_id',
      populate: {
        path: 'posted_by'
      }
    }]
    // find by mention collection from post_mention and check for errors
    mention_model.post_mention
      .find({
        mention_users: mention_user
      })
      .select('post_id')
      .populate(optionFilter)
      .lean()
      .exec(function (err, mentionspost) {
        if (err) {
          log.error(err)
          res.send(err)
          return
        }

        if (mentionspost.length !== '') {

          // log.info(mentionspost)

          callback(null, mentionspost)
        } else {
          callback(null, [])
        }
      })
  }

  function getRetweetByMentionUser (callback) {
    log.info(mention_user)

    var filterOptions = [{
      path: 'retweet_quote_id'
    }, {
      path: 'retweet_quote_id',
      populate: {
        path: 'ret_user_id'
      }
    }]
    // find by mention collection from post_mention and check for errors
    mention_model.retweet_quote_mention
      .find({
        mention_users: mention_user
      })
      .select('retweet_quote_id')
      .populate(filterOptions)
      .lean()
      .exec(function (err, mentionspostdata) {
        if (err) {
          log.error(err)
          res.send(err)
          return
        }

        if (mentionspostdata.length !== '') {
          callback(null, mentionspostdata)
        } else {
          callback(null, [])
        }
      })
  }

  function getReplyByMentionUser (callback) {
    var filterOptions = [{
      path: 'reply_id'
    }, {
      path: 'reply_id',
      populate: {
        path: 'reply_user_id'
      }
    }]

    log.info(mention_user)
    // find by mention collection from post_mention and check for errors
    mention_model.reply_mention
      .find({
        mention_users: mention_user
      })
      .select('reply_id')
      .populate(filterOptions)
      .lean()
      .exec(function (err, mentionspost) {
        if (err) {
          log.error(err)
          res.send(err)
          return
        }

        if (mentionspost.length !== '') {
          callback(null, mentionspost)
        } else {
          callback(null, [])
        }
      })
  }
}

module.exports = ({
  getmentionuser: getmentionuser
})
