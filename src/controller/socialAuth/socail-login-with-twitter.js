const { update, getSocialUser, getSocialUserForTwitter } = require('../../dbServices/users');
const {
  handleResponse,
  handleError,
} = require('../../common/middlewares/requestHandlers.js');
const passport = require('passport');
const TwitterStrategy = require('passport-twitter').Strategy;
require('dotenv').config()

const verifyHandler = function (accessToken, refreshToken, profile, cb, done) {
  const data = {
    id: cb.id,
    name: cb.displayName,
    email: cb.emails[0].value,
    emailVerified: cb.emails[0].verified,
  };
  return done(null, data);
};

passport.use(
  new TwitterStrategy(
    {
        consumerKey: process.env.SOCIAL_LOGIN_TWITTER_API_KEY,
        consumerSecret: process.env.SOCIAL_LOGIN_TWITTER_SECRET_KEY,
        callbackURL: "https://collectionscanner.com/signin/auth/login/social/twitter/callback",
        // callbackURL: GoogleOAuthCredentialsAuthSource.redirect_uris[0],
    },
    verifyHandler
  )
);

module.exports.Login = (req, res) => {
  passport.authenticate('twitter')(req, res);
};

module.exports.CallBack = async (req, res) => {
  try {
    const promise = new Promise((resolve, reject) => {
      passport.authenticate('twitter', { session: false }, (error, user) => {
        if (error) {
          reject(error);
        }
        resolve(user);
      })(req, res);
    });
    let twitterUser = null;
    twitterUser = await promise.then((data) => data);

    // Get User From MongoDB
    const socialId = twitterUser.id;
    //userName --from frontend

    const email = twitterUser.email;
    // let socialUser = await getSocialUser('twitter', socialId, email);
    let socialUser = await getSocialUserForTwitter('twitter', socialId )
    if (!socialUser) {
      return handleResponse({
        res,
        statusCode: 401,
        data: { SOCIAL_NOT_REGISTERED: true },
        msg: 'Social login not registered',
      });
    }
    delete socialUser.password;
    const socialUserData = { ...socialUser._doc };
    delete socialUserData.token;
    const newToken = await generateJwtToken(socialUserData);
    user = await update(socialUserData._id, { token: newToken });

    // All Done
    return handleResponse({
      msg: 'Login successful.',
      statusCode: 200,
      res,
      data: user,
    });
  } catch (error) {
    return handleError({
      err: 'Error',
      res,
    });
  }
};

