const express = require('express');
const router = express.Router();
const {
  twitterProfileBanner,
  twitterAccessToken,
  twitterRequestToken,
}  = require('../controller/socialAuth/social-login-twitter')

//twitter
router.post('/oauth/request_token',twitterRequestToken)
router.post('/oauth/access_token',twitterAccessToken)
router.post('/users/profile_banner',twitterProfileBanner)


module.exports = router;