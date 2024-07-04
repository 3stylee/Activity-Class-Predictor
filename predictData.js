const processData = require("./processData")
const tf = require("@tensorflow/tfjs")

const ACTIVITY_LABEL_MAPPING = {
	0: "Easy",
	1: "Long Run",
	2: "Race",
	3: "Session",
	4: "Tempo",
}

/**
 * Feeds an array of objects representing activities through a Neural Network. Returns an array of predicted activity types (tempo, long run etc...).
 *
 * @param {Object[]} data - An array of objects, each representing an activity.
 *
 * @returns {String[]} - An array of strings, each representing a predicted activity type.
 */
const predictData = async (data) => {
	const results = []
	const model = await tf.loadLayersModel(
		"https://raw.githubusercontent.com/3stylee/Track-it/master/src/constants/tfjs_model/model.json"
	)

	for (row in data) {
		if (row[6] !== "Run") {
			results.push(row[6])
		} else {
			const tensorData = tf.tensor2d([row.slice(0, 5)])
			const prediction = model.predict(tensorData)
			const predictedClassIndex = prediction.argMax(1).dataSync()[0]
			results.push(ACTIVITY_LABEL_MAPPING[predictedClassIndex])
		}
	}
	return results
}

module.exports = predictData
