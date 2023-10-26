const _SocialLoginWithGoogle = require('./social-login-with-google')
const _SocialLoginWithFacebook = require('./social-login-with-facebook')
const _SocialLoginWithTwitter = require('./socail-login-with-twitter')

module.exports = {
  SocialLoginWithGoogle: _SocialLoginWithGoogle.Login,

  SocialLoginWithGoogleCallback: _SocialLoginWithGoogle.CallBack,

  SocialLoginWithFacebook: _SocialLoginWithFacebook.Login,

  SocialLoginWithFacebookCallback: _SocialLoginWithFacebook.CallBack,

  SocialLoginWithTwitter: _SocialLoginWithTwitter.Login,

  SocialLoginWithTwitterCallback: _SocialLoginWithTwitter.CallBack,
}