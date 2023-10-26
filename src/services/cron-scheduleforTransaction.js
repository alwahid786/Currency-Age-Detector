const {
	findAllPendingTransactionStatus,
	statusOfTransactionUpdate,
} = require('../dbServices/transaction')

module.exports = {
	transactionStatusScheduleForChange: async () => {
		try {
			const data = await findAllPendingTransactionStatus()
			data &&
				data.map(async (ele) => {
					let currentDate = new Date()
					let deadLine = ele.createdAt
					const deadLineMinutes = deadLine.getMinutes()
					const deadLineHours = deadLine.getHours()
					const deadLineDate = deadLine.getDate()
					const deadLineMonth = deadLine.getMonth()
					const deadLineYear = deadLine.getFullYear()
					let transactionId = ele._id
					let status = 'cancelled'
					if (
						currentDate.getUTCMinutes() > deadLineMinutes+5 &&
						currentDate.getUTCHours() >= deadLineHours &&
						currentDate.getDate() >= deadLineDate &&
						currentDate.getMonth() + 1 >= deadLineMonth + 1 &&
						currentDate.getFullYear() >= deadLineYear
					) {
						return await statusOfTransactionUpdate(transactionId, status)
					}
				})
		} catch (error) {
			throw error;
		}
	},
}
