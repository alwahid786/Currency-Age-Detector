const _ = require('lodash');
const moment = require('moment');
const path = require('path');
const Coin = require('../models/coinModel');
const Config = require('../config/config');
const MLResponseModel = require('../models/mlResponse.model');
const puppeteer = require('puppeteer');

const {
  handleResponse,
  handleError,
} = require('../common/middlewares/requestHandlers');

const { S3ExtractMeta, deleteFromS3 } = require('../helpers/s3.helper');

const {
  Model: CoinModel,
  save,
  get,
} = require('../dbServices/coin');
const OrderModel = require('../models/orderModel');
const TransactionModel = require('../models/transactionModel');

const { v4: uuidv4 } = require('uuid');

const {
  bankNoteAdded,
  coinSold,
} = require('../messages/success');

module.exports.addNote = async (req, res) => {
  try {
    const { user: __user } = req;
    const {
      name,
      history,
      ruler,
      tags,
      type,
      material,
      shape,
      country,
      _mlReference,
    } = req.body;

    let { price, priceRange, age, length, breadth } = req.body;

    price = !isNaN(price) ? parseFloat(price.trim()) : 0;
    length = !isNaN(length) ? parseFloat(length.trim()) : 0;
    breadth = !isNaN(breadth) ? parseFloat(breadth.trim()) : 0;
    age = !isNaN(age) ? parseFloat(age.trim()) : 0;
    year = age ? moment().year() - age : 0;

    const {
      files: { frontSideImage, backSideSideImage, othersImage },
    } = req;

    let FRONT_SIDE_IMAGE = null;
    let BACK_SIDE_IMAGE = null;
    let OTHER_IMAGE = null;

    if (_mlReference) {
      const mLResponse = await MLResponseModel.findOne({
        _id: _mlReference,
        type: 'classification',
      });

      if (!mLResponse) {
        return handleError({
          statusCode: 400,
          res,
          err: '_mlReference is invalid.',
        });
      }

      FRONT_SIDE_IMAGE = mLResponse.mlMetadata.images.FRONT_SIDE_IMAGE;
      BACK_SIDE_IMAGE = mLResponse.mlMetadata.images.BACK_SIDE_IMAGE;
    } else {
      FRONT_SIDE_IMAGE = S3ExtractMeta(frontSideImage);
      BACK_SIDE_IMAGE = S3ExtractMeta(backSideSideImage);
      OTHER_IMAGE = S3ExtractMeta(othersImage);

      if (FRONT_SIDE_IMAGE.length) {
        FRONT_SIDE_IMAGE = {
          key: FRONT_SIDE_IMAGE[0].key,
          url: FRONT_SIDE_IMAGE[0].location,
          sizeInMegaByte: FRONT_SIDE_IMAGE[0].size / 1024 ** 2,
        };
      }
      if (BACK_SIDE_IMAGE.length) {
        BACK_SIDE_IMAGE = {
          key: BACK_SIDE_IMAGE[0].key,
          url: BACK_SIDE_IMAGE[0].location,
          sizeInMegaByte: BACK_SIDE_IMAGE[0].size / 1024 ** 2,
        };
      }
      if (OTHER_IMAGE.length) {
        OTHER_IMAGE = {
          key: OTHER_IMAGE[0].key,
          url: OTHER_IMAGE[0].location,
          sizeInMegaByte: OTHER_IMAGE[0].size / 1024 ** 2,
        };
      }
    }

    const note = await save({
      userId: __user._id,
      name,
      history,
      price,
      priceRange,
      material,
      shape,
      country,
      type,
      length,
      breadth,
      ruler,
      age,
      year,
      tags,
      isCoin: false,
      pictures: {
        front: FRONT_SIDE_IMAGE,
        back: BACK_SIDE_IMAGE,
        other: OTHER_IMAGE,
      },
      marketPlaceState: 'UNLISTED',
    });
    return handleResponse({ res, msg: bankNoteAdded, data: note });
  } catch (err) {
    return handleError({ res, err });
  }
};

module.exports.ClassifyNote = async (req, res) => {
  try {
    const { user: __user } = req;

    const {
      files: { frontSideImage, backSideSideImage },
    } = req;

    let FRONT_SIDE_IMAGE = S3ExtractMeta(frontSideImage);
    let BACK_SIDE_IMAGE = S3ExtractMeta(backSideSideImage);

    if (FRONT_SIDE_IMAGE.length) {
      FRONT_SIDE_IMAGE = {
        key: FRONT_SIDE_IMAGE[0].key,
        url: FRONT_SIDE_IMAGE[0].location,
        sizeInMegaByte: FRONT_SIDE_IMAGE[0].size / 1024 ** 2,
      };
    }
    if (BACK_SIDE_IMAGE.length) {
      BACK_SIDE_IMAGE = {
        key: BACK_SIDE_IMAGE[0].key,
        url: BACK_SIDE_IMAGE[0].location,
        sizeInMegaByte: BACK_SIDE_IMAGE[0].size / 1024 ** 2,
      };
    }

    const execSync = require('child_process').execSync;
    const mlMetadata = execSync(
      `${Config.PYTHON.COIN_CLASSIFICATION_COMMAND} --URL_Front "${FRONT_SIDE_IMAGE.url}" --URL_Back "${BACK_SIDE_IMAGE.url}"`
    );

    const mlMetadataParsed = JSON.parse(
      mlMetadata.toString().replace(/'/g, '"')
    );

    // Save to DB
    const mLResponseModel = new MLResponseModel({
      mlMetadata: {
        mlResponse: mlMetadataParsed,
        images: {
          FRONT_SIDE_IMAGE,
          BACK_SIDE_IMAGE,
        },
      },
      type: 'classification',
    });
    await mLResponseModel.save();

    const mLResponseModelJSON = mLResponseModel.toJSON();
    mLResponseModelJSON._mlReference = mLResponseModelJSON._id;
    delete mLResponseModelJSON._id;

    if (mlMetadataParsed.Error != '') {
      return handleError({
        res,
        err: mlMetadataParsed.Error,
        data: mLResponseModelJSON,
      });
    }

    return handleResponse({
      res,
      data: mLResponseModelJSON,
    });
  } catch (err) {
    return handleError({ res, err });
  }
};

module.exports.BankNoteGrade = async (req, res) => {
  try {
    const CREDIT_FEE_FOR_GRADING = 2;

    const { user: __user, body } = req;
    const { noteId } = body;

    const note = await Coin.findOne({
      _id: noteId,
      userId: __user._id,
    });

    if (!note) {
      return handleError({
        res,
        statusCode: 400,
        err: 'Bank Note not found',
      });
    }

    if (!__user.creditCount || __user.creditCount < CREDIT_FEE_FOR_GRADING) {
      return handleError({
        statusCode: 400,
        err: 'Insufficient credit balance.',
        res,
      });
    }

    let FRONT_SIDE_IMAGE = note.pictures.front;
    let BACK_SIDE_IMAGE = note.pictures.back;

    const execSync = require('child_process').execSync;
    const mlMetadata = execSync(
      `${Config.PYTHON.COIN_GRADING_COMMAND} --URL_Front "${FRONT_SIDE_IMAGE.url}" --URL_Back "${BACK_SIDE_IMAGE.url}"`
    );

    const mlMetadataParsed = JSON.parse(
      mlMetadata.toString().replace(/'/g, '"')
    );

    // Save to DB
    const mLResponseModel = new MLResponseModel({
      mlMetadata: {
        mlResponse: mlMetadataParsed,
        images: {
          FRONT_SIDE_IMAGE,
          BACK_SIDE_IMAGE,
        },
      },
      type: 'grading',
    });
    await mLResponseModel.save();

    const mLResponseModelJSON = mLResponseModel.toJSON();
    mLResponseModelJSON._mlReference = mLResponseModelJSON._id;
    delete mLResponseModelJSON._id;

    // Create Order
    const order = await OrderModel({
      _buyer: __user._id,
      _coin: note._id,
      orderType: 'bankNoteGrading',
    });
    await order.save();

    if (mlMetadataParsed.Error != '') {
      order.status = 'failed';
      await order.save();

      return handleError({
        res,
        err: mlMetadataParsed.Error,
        data: mLResponseModelJSON,
      });
    }

    // All Good
    note.isGraded = true;
    note.gradingMetadata = {
      value: mlMetadataParsed.Coin_Grade,
      _mlResponse: mLResponseModel._id,
    };
    await note.save();

    order.status = 'confirmed';
    await order.save();

    // Create a Transaction record
    const currency = 'credit';
    const transaction = await TransactionModel({
      userId: __user._id,
      transactionId: `BANK-NOTE-GRADING-${uuidv4()}`,
      action: 'BANK_NOTE_GRADING',
      amount: CREDIT_FEE_FOR_GRADING,
      currency,
      status: 'approved',
      payUsing: 'internal',
      description: 'Apply bank note grading.',
      _order: order._id,
    });

    // Save order
    order._transaction = transaction._id;
    await order.save();

    // Save transaction
    await transaction.save();

    // Deduct User Credit
    __user.creditCount = __user.creditCount - CREDIT_FEE_FOR_GRADING;
    await __user.save();

    return handleResponse({
      res,
      msg: 'Bank Note graded successfully.',
      data: mLResponseModelJSON,
    });
  } catch (err) {
    return handleError({ res, err });
  }
};
