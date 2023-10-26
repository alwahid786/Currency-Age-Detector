const transactionModel = require('../models/transactionModel');
const mongoose = require('mongoose')
module.exports = {
    findAllPendingTransactionStatus : async() => {
        try {
            const result = await transactionModel.find({status:'pending'});
            return result;
        } catch (error) {
            throw error;
        }
    },

    statusOfTransactionUpdate: async(transactionId, status) => {
        try {
            const result = await transactionModel.findByIdAndUpdate(
                    {_id: transactionId }, 
                    {$set:{status: status}}, 
                    {new : true}
                );
            return result
        } catch (error) {
            throw error;
        }
    }
}