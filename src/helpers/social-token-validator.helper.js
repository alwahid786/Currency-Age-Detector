const axios = require('axios')
const Logger = require('../common/middlewares/logger');
const { v4 : uuidV4 } = require('uuid')
const crypto = require('crypto')

const SocialTokenValidator = {
    async Validate(provider, token, oauth_token_secret) {
        let response = null
        try {
            switch (provider) {
                case 'google':
                    response = await SocialTokenValidator.ValidateWithGoogle(token)
                    break
                case 'facebook':
                    response = await SocialTokenValidator.ValidateWithFacebook(token)
                    break
                case 'twitter':
                    response = await SocialTokenValidator.ValidateWithTwitter(token, oauth_token_secret)
                    break
            }
        } catch (error) {
            Logger.error(error)
        } finally {
            return response
        }
    },

    async ValidateWithGoogle(token) {
        const response = await axios.get(`https://oauth2.googleapis.com/tokeninfo?id_token=${token}`)

        // Return Null on null response
        if (!response) {
            return null
        }

        // Return Null on error response
        if (response.data.error) {
            return null
        }

        const id = response.data.sub
        return {id}
    },

    async ValidateWithFacebook(token) {

        const response = await axios.get(
            `https://graph.facebook.com/me?fields=email,name&access_token=${token}`
        )

        // Return Null on null response
        if (!response) {
            return null
        }

        // Return Null on error response
        if (response.data.error) {
            return null
        }

        return response.data
    },

    async ValidateWithTwitter(oauth_token, oauth_token_secret) {
    /**
     * @dev Make sure that arguments oauth_token and oauth_token_secret are access token based,
     *    and not request tokens. This means that FE should firstly fetch the request token,
     *    and then fetch the access token using already received request token. Received access
     *    tokens should be passed to this function.
     * @example Following example shows the difference in format of "request" oauth_token and "access" oauth_token.
     *  Beginning number of "access" oauth_token (separated by hyphen) is userId of twitter user.
     *    - Request oauth_token: "xm9amwAAAAABXbdPAAABfivLi7Y"
     *    - Access oauth_token: "1386928949516469504-q1OksPKUyYog2totl5EDYzaESsuosf"
     */
    try {
      const baseUrl =
        'https://api.twitter.com/1.1/account/verify_credentials.json'
      const requestMethod = 'GET' // all capitals
      const oauth_consumer_key = process.env.SOCIAL_LOGIN_TWITTER_API_KEY // From twitter developer account
      const consumerSecret = process.env.SOCIAL_LOGIN_TWITTER_SECRET_KEY // From twitter developer account
      const oauth_nonce = uuidV4() // Any random string would do the work for nonce.
      const oauth_signature_method = 'HMAC-SHA1'
      const oauth_timestamp = Math.floor(Date.now() / 1000) // UNIX timestamp (Seconds from 1st January 1970)
      const oauth_version = '1.0'
      /**
       * @dev Construct oauth signature.
       * For reference, see following pages:
       * - https://oauth.net/core/1.0a/#anchor13
       * - https://developer.twitter.com/en/docs/authentication/oauth-1-0a/creating-a-signature
       */
      // Construct signature base string.
      const signatureBase =
        requestMethod +
        '&' +
        encodeURIComponent(baseUrl) +
        '&' +
        encodeURIComponent(
          `oauth_consumer_key=${oauth_consumer_key}&oauth_nonce=${oauth_nonce}&oauth_signature_method=${oauth_signature_method}&oauth_timestamp=${oauth_timestamp}&oauth_token=${oauth_token}&oauth_version=${oauth_version}`
        )

      // Construct signing key
      const signingKey =
        encodeURIComponent(consumerSecret) +
        '&' +
        encodeURIComponent(oauth_token_secret)
      // Create signature using sha1 algorithm, then encode binary output to base64
      // , and finally uri encode base64 output.
      const oauth_signature = encodeURIComponent(
        crypto
          .createHmac('sha1', signingKey)
          .update(signatureBase)
          .digest('base64')
      )
      /**
       * @dev Create Request Config.
       * For Authorization Header, refer: https://developer.twitter.com/en/docs/authentication/oauth-1-0a/authorizing-a-request
       * For rest of request config, refer: https://developer.twitter.com/en/docs/twitter-api/v1/accounts-and-users/manage-account-settings/api-reference/get-account-verify_credentials
       */
      const config = {
        method: 'get',
        url: baseUrl,
        headers: {
          Authorization: `OAuth oauth_consumer_key="${oauth_consumer_key}",oauth_token="${oauth_token}",oauth_signature_method="${oauth_signature_method}",oauth_timestamp="${oauth_timestamp}",oauth_nonce="${oauth_nonce}",oauth_version="${oauth_version}",oauth_signature="${oauth_signature}"`,
        },
      }
      // Execute the request.
      const {
        data: { id_str: id },
      } = await axios(config)
      const result = { id }

      // All Done.
      return result
    } catch (error) {
      Logger.error(error)
      return null
    }
  }
}


module.exports.SocialTokenValidator = SocialTokenValidator