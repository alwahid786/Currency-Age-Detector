const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../common/middlewares/authCheck');

const { verifyEmail } = require('../controller/users');

const users = require('./users');
const order = require('./order.route');
const coin = require('./coin');
const banknote = require('./bank-note');
const auction = require('./auction');
const conversationRouter = require('./conversation.route');
const paymentGatewayRouter = require('./payment-gateway.route');
const webhook = require('./webhook');
const VIP = require('../models/vipModel');
const { getSingleCmsForUser } = require('../controller/admin/cms')

router.get('/verify-email/:link', verifyEmail);

// NOT IN USE
// const auth = require('./auth.route');
// router.use('/auth', auth);

// Twitter
const twitter = require('./twitter');
router.use('/twitter', twitter);

//cms for user
router.get('/users/cmsPage', getSingleCmsForUser)

router.use(isAuthenticated);

router.use('/users', users);
router.use('/coin', coin);
router.use('/banknote', banknote);
router.use('/auction', auction);
router.use('/conversations', conversationRouter);
router.use('/pay', paymentGatewayRouter);
router.use('/order', order);
// router.use('/paypal', webhook);
// router.use('/vip', async (req, res) => {
//   const vipData = await VIP.create({ ...req.body });
//   return res.send(vipData);
// });

module.exports = router;
