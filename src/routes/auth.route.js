const express = require('express');
const router = express.Router();

const {
  socialLogin,
  socialLoginCallback
} = require('../controller/auth');
const {
  twitterProfileBanner,
  twitterAccessToken,
  twitterRequestToken,
}  = require('../controller/socialAuth/social-login-twitter')

// Auth
router.get('/login/social/:oauthProvider', socialLogin);
router.get('/login/social/:oauthProvider/callback', socialLoginCallback);
//twitter
router.post('/twitter/oauth/request_token',twitterRequestToken)
router.post('/twitter/oauth/access_token',twitterAccessToken)
router.post('/twitter/users/profile_banner',twitterProfileBanner)


module.exports = router;
