const MODEL_SCALER_INFO = {
	data_min: [0.0, 24.0, 0.0, 0.612, 2.9, 0.0],
	data_max: [18347.5, 4900.0, 436.0, 8.948, 12.0, 116.0],
}

/**
 * Processes an array of predictors and scales them into normalised predictors.
 *
 * @param {Array}data - the raw predictors to process.
 *
 * @returns {Array} the normalised predictors.
 */
const processData = (data) => {
	const processedData = data.map((row) => {
		return scaleRow([
			row.distance,
			row.moving_time,
			row.total_elevation_gain,
			row.average_speed,
			row.max_speed,
			row.average_cadence,
		])
	})
	return processedData
}

/**
 * Processes an array of raw predictors and scales them into normalised predictors.
 *
 * @param {Array}row - the raw predictors to process.
 *
 * @returns {Array} the normalised predictors.
 */
const scaleRow = (row) => {
	const scaledRow = row.map((value, index) => {
		const dataMin = MODEL_SCALER_INFO.data_min[index]
		const dataMax = MODEL_SCALER_INFO.data_max[index]
		const range = dataMax - dataMin

		// Apply Min-Max scaling
		const scaledValue = (value - dataMin) / range
		return scaledValue
	})
	return scaledRow
}

module.exports = {
	processData,
	scaleRow,
}
