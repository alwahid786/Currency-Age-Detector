const _ = require('lodash');
const Coin = require('../models/coinModel');
const Model = require('../models/coinModel');
const User = require('../models/userModel');
const WishList = require('../models/wishListModel');
const TransactionModel = require('../models/transactionModel');
const contactUs = require('../models/contactUsModel');
const { ObjectId } = require('mongoose').Types;

const Paginator = require('../helpers/pagination.helper');

module.exports.Model = Model;

module.exports.save = (data) => new Model(data).save();

module.exports.addCoinToWishList = async (data) => {
  const wishList = new WishList(data);
  await wishList.save();
  return wishList;
};

module.exports.addMessage = async (data) => {
  const message = new contactUs(data);
  await message.save();
  return message;
};

module.exports.get = async (idOrEmail, fieldName = '_id') => {
  const data = await Model.findOne({
    [fieldName]: `${idOrEmail}`,
    isDeleted: false,
  });
  return data;
};

module.exports.update = async (
  userId,
  { firstName, lastName, password, email, phone, token, otp, otpExpiry, link }
) => {
  try {
    await Model.findByIdAndUpdate(
      userId,
      {
        $set: {
          ...(firstName && {
            firstName,
          }),
          ...(lastName && {
            lastName,
          }),
          ...(email && {
            email,
          }),
          ...(password && {
            password,
          }),
          ...(phone && {
            phone,
          }),
          ...(token && {
            token,
          }),
          ...(otp && {
            otp,
          }),
          ...(otpExpiry && {
            otpExpiry,
          }),
          ...(link && {
            link,
          }),
        },
      },
      {
        runValidators: true,
        new: true,
        projection: {
          password: 0,
        },
      }
    );
    const data = await this.getUserProfileData(userId);
    return data;
  } catch (error) {
    throw error;
  }
};

module.exports.myPortfolio = async (userId, skip, limit) => {
  try {
    let [data] = await Model.aggregate([
      {
        $match: {
          userId: ObjectId(userId),
          isDeleted: false,
        },
      },
      {
        $lookup: {
          from: 'auctions',
          let: { coinId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ['$coinId', '$$coinId'],
                },
              },
            },
            {
              $project: {
                _id: 1,
                amount: 1,
                isEnded: 1,
              },
            },
          ],
          as: '_auction',
        },
      },
      {
        $addFields: {
          isAuctioned: {
            $cond: {
              if: {
                $eq: ['$_auction', []],
              },
              then: false,
              else: true,
            },
          },
        },
      },
      {
        $unwind: {
          path: '$_auction',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: 'users',
          let: { userId: '$userId' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ['$_id', '$$userId'],
                },
              },
            },
            {
              $project: {
                firstName: 1,
                lastName: 1,
                rating: 1,
              },
            },
          ],
          as: 'userId',
        },
      },
      {
        $unwind: {
          path: '$userId',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $facet: {
          list: [
            {
              $skip: skip,
            },
            {
              $limit: limit,
            },
          ],
          totalRecords: [
            {
              $count: 'count',
            },
          ],
        },
      },
      {
        $addFields: {
          totalRecords: '$totalRecords.count',
        },
      },
      {
        $unwind: {
          path: '$totalRecords',
          preserveNullAndEmptyArrays: true,
        },
      },
    ]);
    return data;
  } catch (error) {
    throw error;
  }
};

module.exports.coinDetails = async (coinId, userId) => {
  try {
    let [data] = await Model.aggregate([
      {
        $match: {
          _id: ObjectId(coinId),
          isDeleted: false,
        },
      },
      {
        $lookup: {
          from: 'wishlists',
          let: { coinId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$coinId', '$$coinId'] },
                    { $eq: ['$userId', userId] },
                  ],
                },
              },
            },
            {
              $project: {
                _id: 1,
              },
            },
          ],
          as: 'inWishList',
        },
      },
      {
        $addFields: {
          inWishList: {
            $cond: {
              if: {
                $eq: ['$inWishList', []],
              },
              then: false,
              else: true,
            },
          },
        },
      },
      {
        $lookup: {
          from: 'auctions',
          let: { coinId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ['$coinId', '$$coinId'],
                },
              },
            },
            {
              $project: {
                _id: 1,
                amount: 1,
                isEnded: 1,
              },
            },
          ],
          as: '_auction',
        },
      },
      {
        $addFields: {
          isAuctioned: {
            $cond: {
              if: {
                $eq: ['$_auction', []],
              },
              then: false,
              else: true,
            },
          },
        },
      },
      {
        $unwind: {
          path: '$_auction',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          isCoinOfLoggedIn: {
            $cond: {
              if: {
                $eq: [userId, '$userId'],
              },
              then: true,
              else: false,
            },
          },
        },
      },
      {
        $lookup: {
          from: 'users',
          let: { userId: '$userId' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ['$_id', '$$userId'],
                },
              },
            },
            {
              $project: {
                firstName: 1,
                lastName: 1,
                profilePic: 1,
                country: 1,
                city: 1,
                rating: 1,
                sellerReview:1,
              },
            },
          ],
          as: 'userData',
        },
      },
      {
        $unwind: {
          path: '$userData',
          preserveNullAndEmptyArrays: true,
        },
      },
    ]);

    return data;
  } catch (error) {
    throw error;
  }
};

module.exports.removeCoinToWishList = async (userId, coinId) => {
  try {
    const data = await WishList.deleteOne({ userId, coinId });
    return data;
  } catch (error) {
    throw error;
  }
};
module.exports.getMessage = async (userId, skip, limit) => {
  try {
    let [data] = await contactUs.aggregate([
      {
        $match: {
          userId: ObjectId(userId),
        },
      },
    ]);
    return data;
  } catch (error) {
    throw error;
  }
};
module.exports.getWishList = async (userId, skip, limit) => {
  try {
    let [data] = await WishList.aggregate(
      [
  {
    '$match': {
      'userId': ObjectId(userId)
    }
  }, {
    '$lookup': {
      'from': 'coins', 
      'let': {
        'coinId': '$coinId'
      }, 
      'pipeline': [
        {
          '$match': {
            '$expr': {
              '$eq': [
                '$_id', '$$coinId'
              ]
            }, 
            'marketPlaceState': {
              '$ne': 'UNLISTED'
            }
          }
        }, {
          '$project': {
            'name': 1, 
            'age': 1, 
            'isSold': 1, 
            'isGraded': 1, 
            'price': 1, 
            'priceRange': 1, 
            'history': 1, 
            'shape': 1, 
            'pictures': 1, 
            'userId': 1, 
            'isCoin': 1
          }
        }
      ], 
      'as': 'coinData'
    }
  }, {
    '$unwind': {
      'path': '$coinData', 
      'preserveNullAndEmptyArrays': true
    }
  }, {
    '$lookup': {
      'from': 'users', 
      'let': {
        'userId': '$coinData.userId'
      }, 
      'pipeline': [
        {
          '$match': {
            '$expr': {
              '$eq': [
                '$_id', '$$userId'
              ]
            }
          }
        }, {
          '$project': {
            'firstName': 1, 
            'lastName': 1, 
            'rating': 1, 
            'address': 1
          }
        }
      ], 
      'as': 'userData'
    }
  }, {
    '$unwind': {
      'path': '$userData'
    }
  }, {
    '$addFields': {
      'coinData._id': '$_id', 
      'coinData.coinId': '$coinId', 
      'coinData.firstName': '$userData.firstName', 
      'coinData.lastName': '$userData.lastName', 
      'coinData.rating': '$userData.rating', 
      'coinData.address': {
        '$filter': {
          'input': '$userData.address', 
          'as': 'address', 
          'cond': {
            '$and': [
              {
                '$eq': [
                  '$$address.isPrimary', true
                ]
              }
            ]
          }
        }
      }
    }
  }, {
    '$replaceRoot': {
      'newRoot': '$coinData'
    }
  }, {
    '$lookup': {
      'from': 'auctions', 
      'let': {
        'coinId': '$coinId'
      }, 
      'pipeline': [
        {
          '$match': {
            '$expr': {
              '$eq': [
                '$coinId', '$$coinId'
              ]
            }
          }
        }, {
          '$project': {
            '_id': 1, 
            'amount': 1, 
            'isEnded': 1
          }
        }
      ], 
      'as': '_auction'
    }
  }, {
    '$addFields': {
      'isAuctioned': {
        '$cond': {
          'if': {
            '$eq': [
              '$_auction', []
            ]
          }, 
          'then': false, 
          'else': true
        }
      }
    }
  }, {
    '$unwind': {
      'path': '$_auction', 
      'preserveNullAndEmptyArrays': true
    }
  }, {
    '$unwind': {
      'path': '$address', 
      'preserveNullAndEmptyArrays': true
    }
  }, {
    '$lookup': {
      'from': 'transactions', 
      'localField': 'coinId', 
      'foreignField': 'transactionMeta._coin', 
      'as': 'transactionList'
    }
  }, {
    '$unwind': {
      'path': '$transactionList', 
      'includeArrayIndex': 'transactionListCount', 
      'preserveNullAndEmptyArrays': true
    }
  }, {
    '$project': {
      'pictures': 1, 
      'price': 1, 
      'age': 1, 
      'isGraded': 1, 
      'isCoin': 1, 
      'userId': 1, 
      'name': 1, 
      'isSold': 1,
      '_auction': 1,
      'history': 1, 
      'priceRange': 1, 
      'coinId': 1, 
      'firstName': 1, 
      'lastName': 1, 
      'rating': 1, 
      'isAuctioned': 1, 
      'transactionListCount': 1, 
      'transactionList': 1, 
      'transactionStatusData': '$transactionList.status'
    }
  }, {
    '$group': {
      '_id': '$_id', 
      'transactionListStatus': {
        '$push': '$transactionList'
      }, 
      'transactionStatusData': {
        '$push': '$transactionStatusData'
      }, 
      'pictures': {
        '$first': '$pictures'
      }, 
      'price': {
        '$first': '$price'
      }, 
      'age': {
        '$first': '$age'
      }, 
      '_auction': {
        '$first': '$_auction'
      },
      'isGraded': {
        '$first': '$isGraded'
      }, 
      'isCoin': {
        '$first': '$isCoin'
      }, 
      'isSold': {
        '$first': '$isSold'
      },
      'userId': {
        '$first': '$userId'
      }, 
      'name': {
        '$first': '$name'
      }, 
      'history': {
        '$first': '$history'
      }, 
      'priceRange': {
        '$first': '$priceRange'
      }, 
      'coinId': {
        '$first': '$coinId'
      }, 
      'firstName': {
        '$first': '$firstName'
      }, 
      'lastName': {
        '$first': '$lastName'
      }, 
      'rating': {
        '$first': '$rating'
      }, 
      'isAuctioned': {
        '$first': '$isAuctioned'
      }, 
      'transactionListCount': {
        '$first': '$transactionListCount'
      }, 
      'transactionList': {
        '$first': '$transactionList'
      }
    }
  }, {
    '$lookup': {
      'from': 'users', 
      'localField': 'userId', 
      'foreignField': '_id', 
      'as': 'userDetails'
    }
  }, {
    '$unwind': {
      'path': '$userDetails', 
      'preserveNullAndEmptyArrays': true
    }
  }, {
    '$addFields': {
      'userDetails.newRating': {
        '$map': {
          'input': '$userDetails.sellerReview', 
          'as': 'rating', 
          'in': {
            '$sum': [
              '$$rating.rate', 0
            ]
          }
        }
      }
    }
  }, {
    '$addFields': {
      'userDetails.totalRatingCount': {
        '$cond': {
          'if': {
            '$eq': [
              '$userDetails.newRating', []
            ]
          }, 
          'then': 1, 
          'else': {
            '$size': '$userDetails.newRating'
          }
        }
      }, 
      'userDetails.tatolRating': {
        '$sum': '$userDetails.newRating'
      }, 
      'transactionStatus': {
        '$cond': {
          'if': {
            '$in': [
              'pending', '$transactionStatusData'
            ]
          }, 
          'then': 'pending', 
          'else': {
            '$cond': {
              'if': {
                '$in': [
                  'approved', '$transactionStatusData'
                ]
              }, 
              'then': 'approved', 
              'else': ""
            }
          }
        }
      }
    }
  }, {
    '$addFields': {
      'userDetails.rating': {
        '$divide': [
          '$userDetails.tatolRating', '$userDetails.totalRatingCount'
        ]
      }
    }
  }, {
    '$facet': {
      'list': [
        {
          '$skip': skip
        }, {
          '$limit': limit
        }
      ], 
      'totalRecords': [
        {
          '$count': 'count'
        }
      ]
    }
  }, {
    '$addFields': {
      'totalRecords': '$totalRecords.count'
    }
  }, {
    '$unwind': {
      'path': '$totalRecords', 
      'preserveNullAndEmptyArrays': true
    }
  }
]
    //   [
    //   {
    //     $match: {
    //       userId: ObjectId(userId),
    //     },
    //   },
    //   {
    //     $lookup: {
    //       from: 'coins',
    //       let: { coinId: '$coinId' },
    //       pipeline: [
    //         {
    //           $match: {
    //             $expr: {
    //               $eq: ['$_id', '$$coinId'],
    //             },
    //             marketPlaceState: { $ne: 'UNLISTED'},
    //           },
    //         },
    //         {
    //           $project: {
    //             name: 1,
    //             age: 1,
    //             isSold: 1,
    //             isGraded: 1,
    //             price: 1,
    //             priceRange: 1,
    //             history: 1,
    //             shape: 1,
    //             pictures: 1,
    //             userId: 1,
    //             isCoin: 1,
    //           },
    //         },
    //       ],
    //       as: 'coinData',
    //     },
    //   },
    //   {
    //     $unwind: {
    //       path: '$coinData',
    //       preserveNullAndEmptyArrays: true,
    //     },
    //   },
    //   {
    //     $lookup: {
    //       from: 'users',
    //       let: { userId: '$coinData.userId' },
    //       pipeline: [
    //         {
    //           $match: {
    //             $expr: {
    //               $eq: ['$_id', '$$userId'],
    //             },
    //           },
    //         },
    //         {
    //           $project: {
    //             firstName: 1,
    //             lastName: 1,
    //             rating: 1,
    //             address: 1,
    //           },
    //         },
    //       ],
    //       as: 'userData',
    //     },
    //   },
    //   {
    //     $unwind: {
    //       path: '$userData',
    //       // preserveNullAndEmptyArrays: true,
    //     },
    //   },
    //   {
    //     $addFields: {
    //       'coinData._id': '$_id',
    //       'coinData.coinId': '$coinId',
    //       'coinData.firstName': '$userData.firstName',
    //       'coinData.lastName': '$userData.lastName',
    //       'coinData.rating': '$userData.rating',
    //       'coinData.address': {
    //         $filter: {
    //           input: '$userData.address',
    //           as: 'address',
    //           cond: {
    //             $and: [{ $eq: ['$$address.isPrimary', true] }],
    //           },
    //         },
    //       },
    //     },
    //   },
    //   {
    //     $replaceRoot: { newRoot: '$coinData' },
    //   },
    //   {
    //     $lookup: {
    //       from: 'auctions',
    //       let: { coinId: '$coinId' },
    //       pipeline: [
    //         {
    //           $match: {
    //             $expr: {
    //               $eq: ['$coinId', '$$coinId'],
    //             },
    //           },
    //         },
    //         {
    //           $project: {
    //             _id: 1,
    //             amount: 1,
    //             isEnded: 1,
    //           },
    //         },
    //       ],
    //       as: '_auction',
    //     },
    //   },
    //   {
    //     $addFields: {
    //       isAuctioned: {
    //         $cond: {
    //           if: {
    //             $eq: ['$_auction', []],
    //           },
    //           then: false,
    //           else: true,
    //         },
    //       },
    //     },
    //   },
    //   {
    //     $unwind: {
    //       path: '$_auction',
    //       preserveNullAndEmptyArrays: true,
    //     },
    //   },
    //   {
    //     $unwind: {
    //       path: '$address',
    //       preserveNullAndEmptyArrays: true,
    //     },
    //   },
    //   {
    //     $facet: {
    //       list: [
    //         {
    //           $skip: skip,
    //         },
    //         {
    //           $limit: limit,
    //         },
    //       ],
    //       totalRecords: [
    //         {
    //           $count: 'count',
    //         },
    //       ],
    //     },
    //   },
    //   {
    //     $addFields: {
    //       totalRecords: '$totalRecords.count',
    //     },
    //   },
    //   {
    //     $unwind: {
    //       path: '$totalRecords',
    //       preserveNullAndEmptyArrays: true,
    //     },
    //   },
    // ]
    );
    return data;
  } catch (error) {
    throw error;
  }
};

module.exports.getCoinList = async (options) => {
  const {
    _id,
    country,
    grading,
    isGraded,
    isSold,
    marketPlaceState,
    shape,
    material,
    fromYear,
    toYear,
    fromPrice,
    toPrice,
    sortPrice,
    sortName,
    sortDate,
    search,
    isCoin,
    startIndex = 1,
    itemsPerPage = 10,
  } = options;
  try {
    let matchObj = {};

    if (search) {
      matchObj.$or = [
        {
          tags: {
            $elemMatch: { $regex: search, $options: 'i' },
          },
        },
        {
          name: { $regex: search, $options: 'i' },
        },
      ];
    }
    // matchObj.$and= [ {
    //   userId: { $ne: null }
    // }]
    matchObj.country = country ?? undefined;
    // matchObj.isDeleted = false
    matchObj.isCoin = isCoin ?? undefined;
    matchObj.shape = shape ?? undefined;
    matchObj.grading = grading ? { $regex: grading, $options: 'i' } : undefined;
    matchObj.isGraded = isGraded ?? undefined;
    matchObj.isSold = isSold ?? undefined;
    matchObj.material = material ?? undefined;
    matchObj.marketPlaceState = marketPlaceState ?? { $ne: 'UNLISTED'};

    if (fromYear) {
      matchObj.year = { $gte: fromYear };
    }

    if (toYear) {
      matchObj.year = matchObj.year
        ? (matchObj.year.$lte = toYear)
        : { $lte: toYear };
    }

    if (fromPrice) {
      matchObj.price = { $gte: fromPrice };
    }

    if (toPrice) {
      if (matchObj.price && matchObj.price.$gte) {
        matchObj.price.$lte = toPrice;
      } else {
        matchObj.price = {};
        matchObj.price.$lte = toPrice;
      }
    }

    const projection = {
      _id: 1,
      userId: 1,
      name: 1,
      age: 1,
      isSold: 1,
      isGraded: 1,
      price: 1,
      priceRange: 1,
      year: 1,
      shape: 1,
      history: 1,
      pictures: 1,
      tags: 1,
      isCoin: 1,
      _transaction:1,
      marketPlaceState: 1,
      _auction: 1,
      isWishlist: 1,
    };

    let sort = {
      created: -1
    };
    if (sortPrice) {
      sort = {
        price: [1, -1].includes(sortPrice) ? sortPrice : 1,
      };
    }

    if (sortDate) {
      sort = {
        created: [1, -1].includes(sortDate) ? sortDate : 1,
      };
    }

    if (sortName) {
      if (sortName == 'Asc') {
        sort = {
          name: 1,
        };
      } else {
        sort = {
          name: -1,
        };
      }
    }

    const result = await Paginator.Paginate({
      model: Coin,
      query: _.omitBy(matchObj, _.isNil),
      projection: projection,
      sort,
      populate: [
        {
          path: 'userId',
          select: 'firstName middleName lastName profilePic isDeleted rating sellerReview',
        },

        {
          path: '_auction',
          select: 'amount isEnded',
        },
        {
          path: '_transaction',
          select: 'status currency payUsing description',
        },
      ],

      startIndex: +startIndex,
      itemsPerPage: +itemsPerPage,
    });

    const { items } = result;
    for (i = 0; i < items.length; i++) {
      const arr = items[i].userId.sellerReview
      async function findAverageAge(arr) {
        const { length } = arr;
        return arr.reduce((acc, val) => {
            return acc + (val.rate/length);
        }, 0);
      };
      var sellerAverageReviewRating = await findAverageAge(arr)
      items[i].userId.rating = sellerAverageReviewRating
  }

    for (i = 0; i < items.length; i++) {
      let is_transaction = await TransactionModel.findOne({
        'transactionMeta._coin': ObjectId(items[i]._id),
      }).sort({createdAt: -1});
      if (is_transaction) {
        items[i].transactionStatus = is_transaction.status;
      } else {
        items[i].transactionStatus = "";
      }
    }

    for (i = 0; i < items.length; i++) {
      let is_wishlist = await WishList.findOne({
        userId: ObjectId(_id),
        coinId: ObjectId(items[i]._id),
      });
      if (is_wishlist) {
        items[i].isWishlist = true;
      } else {
        items[i].isWishlist = false;
      }

      if (items[i]._auction) {
        items[i].isAuctioned = true;
      } else {
        items[i].isAuctioned = false;
      }
    }

    return result;

    let [data] = await User.aggregate([
      {
        $match: {
          _id: { $ne: ObjectId(_id) },
          country,
        },
      },
      {
        $lookup: {
          from: 'coins',
          let: { userId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ['$userId', '$$userId'],
                },
              },
            },
            {
              $project: {
                _id: 1,
                name: 1,
                age: 1,
                isSold: 1,
                isGraded: 1,
                price: 1,
                year: 1,
                shape: 1,
                history: 1,
                pictures: 1,
                tags: 1,
                isCoin: 1,
              },
            },
          ],
          as: 'coinData',
        },
      },
      {
        $unwind: {
          path: '$coinData',
        },
      },
      {
        $addFields: {
          'coinData.firstName': '$firstName',
          'coinData.lastName': '$lastName',
          'coinData.review': { $size: '$review' },
          'coinData.rating': '$rating',
          'coinData.userId': '$_id',
          'coinData.address': {
            $filter: {
              input: '$address',
              as: 'address',
              cond: {
                $and: [{ $eq: ['$$address.isPrimary', true] }],
              },
            },
          },
        },
      },
      {
        $replaceRoot: { newRoot: '$coinData' },
      },
      {
        $unwind: {
          path: '$address',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: 'auctions',
          let: { coinId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ['$coinId', '$$coinId'],
                },
              },
            },
            {
              $project: {
                _id: 1,
              },
            },
          ],
          as: 'isAuctioned',
        },
      },
      {
        $addFields: {
          isAuctioned: {
            $cond: {
              if: {
                $eq: ['$isAuctioned', []],
              },
              then: false,
              else: true,
            },
          },
        },
      },
      {
        $lookup: {
          from: 'wishlists',
          let: { coinId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$coinId', '$$coinId'] },
                    { $eq: ['$userId', _id] },
                  ],
                },
              },
            },
            {
              $project: {
                _id: 1,
              },
            },
          ],
          as: 'inWishList',
        },
      },
      {
        $addFields: {
          inWishList: {
            $cond: {
              if: {
                $eq: ['$inWishList', []],
              },
              then: false,
              else: true,
            },
          },
          tags: {
            $ifNull: ['$tags', []],
          },
        },
      },
      {
        $match: matchObj,
      },
      { $sort: { price: parseInt(sortPrice) } },
      {
        $facet: {
          list: [
            {
              $skip: skip,
            },
            {
              $limit: limit,
            },
          ],
          totalRecords: [
            {
              $count: 'count',
            },
          ],
        },
      },
      {
        $addFields: {
          totalRecords: '$totalRecords.count',
        },
      },
      {
        $unwind: {
          path: '$totalRecords',
          preserveNullAndEmptyArrays: true,
        },
      },
    ]);
    return data;
  } catch (error) {
    throw error;
  }
};

module.exports.getRelatedCoins = async (
  _userId,
  isCoin,
  coinId,
  country,
  age,
  year,
  material
) => {
  try {
    let matchObj = {};
    let userIds = await User.aggregate([
      {
        $match: {
          country,
          _id: { $ne: ObjectId(_userId) }
        },
      },
    ]);

    const userId = userIds.map(function (obj) {
      return obj._id;
    });

    matchObj.isCoin = isCoin;
    matchObj.marketPlaceState = { $ne: 'UNLISTED'};
    matchObj.isSold = false;
    matchObj.userId = { $ne: ObjectId(_userId) };
    matchObj._id = { $ne: ObjectId(coinId) };
    matchObj.isDeleted = false;
    matchObj.$or = [
      {
        age,
      },
      {
        year,
      },
      {
        material,
      },
      {
        userId: { $in: userId },
      },
    ];

    let [data] = await Model.aggregate([
      {
        $match: matchObj,
      },
      {
        $project: {
          _id: 1,
          name: 1,
          pictures: 1,
        },
      },
      {
        $facet: {
          list: [
            {
              $skip: 0,
            },
            {
              $limit: 5,
            },
          ],
        },
      },
    ]);

    return data;
  } catch (error) {
    throw error;
  }
};

module.exports.getGradeCoinList = async (_id) => {
  try {
    let coinList = await Model.find({ userId: _id, isGraded: true }).populate([
      { 
        path: 'userId',
        select: 'firstName middleName lastName rating sellerReview isCoin'
      },
      {
        path: '_auction',
        select: 'amount isEnded',
      },
    ]).lean();

    for (i = 0; i < coinList.length; i++) {
      if (coinList[i]._auction) {
        coinList[i].isAuctioned = true;
      } else {
        coinList[i].isAuctioned = false;
      }
    }

    if(coinList.length>0){
      coinList.map(async(ele)=> {
        const arr = ele.userId.sellerReview
        async function findAverageAge(arr) {
          const { length } = arr;
          return arr.reduce((acc, val) => {
              return acc + (val.rate/length);
          }, 0);
        };
        var sellerAverageReviewRating = await findAverageAge(arr)
        ele.userId.rating = sellerAverageReviewRating
      })
    }
    return coinList;
  } catch (error) {
    throw error;
  }
};
