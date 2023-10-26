const mongoose = require('mongoose');
const { Schema } = mongoose;
const db = require('../connection/dbMaster');

const CoinSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'users',
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  history: {
    type: String,
  },
  pictures: {
    front: {
      key: String,
      url: String,
      sizeInMegaByte: Number,
    },
    back: {
      key: String,
      url: String,
      sizeInMegaByte: Number,
    },
    other: {
      key: String,
      url: String,
      sizeInMegaByte: Number,
    },
  },
  price: {
    type: Number,
    default: 0,
  },
  priceRange: {
    type: String,
  },
  weight: {
    type: Number,
  },
  year: {
    type: Number,
  },
  type: {
    type: String,
  },
  country: {
    type: String,
  },
  diameter: {
    type: Number,
  },
  thickness: {
    type: Number,
  },
  length: {
    type: Number
  },
  breadth: {
    type: Number
  },
  ruler: {
    type: String,
  },
  shape: {
    type: String,
  },
  material: {
    type: String,
  },
  age: {
    type: Number,
    default: 0,
  },
  gradingStatus: {
    type: String,
  },
  grading: {
    type: String,
  },
  isGraded: {
    type: Boolean,
    default: false
  },
  gradingMetadata: {
    value: Number,
    _mlResponse: Schema.Types.ObjectId
  },
  isPostedforSale: {
    type: Boolean,
    default: false
  },
  isSold: {
    type: Boolean,
    default: false
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  status: {
    type: Boolean,
    default: true
  },
  isCoin: {
    type: Boolean,
    default: true
  },
  tags: [{ type: String }],
  marketPlaceState: {
    type: String,
    enum: ['ON_SALE', 'ON_AUCTION', 'UNLISTED'],
    default: 'ON_SALE'
  },
  _auction: {
    type: Schema.Types.ObjectId,
    ref: 'auction'
  },
  postedAt: { type: Date, default: Date.now },
  created: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
});

module.exports = db.model('coins', CoinSchema);