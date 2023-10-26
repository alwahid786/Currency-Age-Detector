const cookieParser = require('cookie-parser');
const oauthCallback = process.env.FRONTEND_URL;
const COOKIE_NAME =  process.env.COOKIE_NAME
const oauth = require('../../services/oauth-promise')(oauthCallback);

module.exports = {
  //OAuth Step 1
  // router.post('/twitter/oauth/request_token',
  twitterRequestToken: async (req, res) => {
    const {oauth_token, oauth_token_secret} = await oauth.getOAuthRequestToken();
    res.cookie(COOKIE_NAME, oauth_token , {
      maxAge: 15 * 60 * 1000, // 15 minutes
      secure: true,
      httpOnly: true,
      sameSite: true,
    });
    tokens[oauth_token] = { oauth_token_secret };
    res.json({ oauth_token });
  },
  
  //OAuth Step 3
  // router.post('/twitter/oauth/access_token', 
  twitterAccessToken :async (req, res) => {
    try {
      const {oauth_token: req_oauth_token, oauth_verifier} = req.body;
      const oauth_token = req.cookies[COOKIE_NAME];
      const oauth_token_secret = tokens[oauth_token].oauth_token_secret;
      if (oauth_token !== req_oauth_token) {
        res.status(403).json({message: "Request tokens do not match"});
        return;
      } 
      const {oauth_access_token, oauth_access_token_secret} = await oauth.getOAuthAccessToken(oauth_token, oauth_token_secret, oauth_verifier);
      tokens[oauth_token] = { ...tokens[oauth_token], oauth_access_token, oauth_access_token_secret };
      return res.json({success: true});
    } catch(error) {
      return handleError({
        err: 'Error',
        res,
      });
    }
  },
  
  //Authenticated resource access
  // router.get("/twitter/users/profile_banner", 
  twitterProfileBanner: async (req, res) => {
    try {
      const oauth_token = req.cookies[COOKIE_NAME];
      const { oauth_access_token, oauth_access_token_secret } = tokens[oauth_token]; 
      const response = await oauth.getProtectedResource("https://api.twitter.com/1.1/account/verify_credentials.json", "GET", oauth_access_token, oauth_access_token_secret);
      return res.json(JSON.parse(response.data));
    } catch(error) {
      res.status(403).json({message: "Missing, invalid, or expired tokens"});
    }
  }
}