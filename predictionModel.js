const tf = require("@tensorflow/tfjs-node")

const ACTIVITY_LABEL_MAPPING = {
	0: "Easy",
	1: "Long Run",
	2: "Race",
	3: "Session",
	4: "Tempo",
}

const weightShapes = [
	{ name: "dense/kernel", shape: [6, 256], dtype: "float32" },
	{ name: "dense/bias", shape: [256], dtype: "float32" },
	{ name: "dense_1/kernel", shape: [256, 128], dtype: "float32" },
	{ name: "dense_1/bias", shape: [128], dtype: "float32" },
	{ name: "dense_2/kernel", shape: [128, 64], dtype: "float32" },
	{ name: "dense_2/bias", shape: [64], dtype: "float32" },
	{ name: "dense_3/kernel", shape: [64, 7], dtype: "float32" },
	{ name: "dense_3/bias", shape: [7], dtype: "float32" },
]

/**
 * Loads user specific model with weights from Firestore.
 *
 * @param {number} userId - the user id to load the weights for
 * @param {Object} admin - the admin object to interact with Firestore
 *
 * @returns {*} - the loaded model
 */
const loadModel = async (userId, admin) => {
	const model = await tf.loadLayersModel(
		"https://raw.githubusercontent.com/3stylee/Track-it/master/src/constants/tfjs_model/model.json"
	)
	const doc = await admin.firestore().collection("userModels").doc(userId).get()
	if (!doc.exists) {
		return model
	}

	const { weightData } = doc.data()
	const decodedWeightData = Buffer.from(weightData, "base64")
	const weights = tf.io.decodeWeights(decodedWeightData, weightShapes)
	const weightTensors = Object.values(weights)
	await model.setWeights(weightTensors)

	return model
}

/**
 * Feeds an array of objects representing activities through a Neural Network. Returns an array of predicted activity types (tempo, long run etc...).
 *
 * @param {number[][]} data - An array of objects, each representing an activity.
 * @param {number} id - The user id.
 * @param {Object} admin - the admin object to interact with Firestore
 *
 * @returns {String[]} - An array of strings, each representing a predicted activity type.
 */
const predictData = async (data, id, admin) => {
	const results = []
	const model = await loadModel(id, admin)

	for (const row of data) {
		if (row[6] !== "Run") {
			results.push(row[6])
		} else {
			row.pop()
			const tensorData = tf.tensor2d([row])
			const prediction = model.predict(tensorData)
			const predictedClassIndex = prediction.argMax(1).dataSync()[0]
			results.push(ACTIVITY_LABEL_MAPPING[predictedClassIndex])
		}
	}
	return results
}

/**
 * Refines the user model when the correct a prediction manually
 *
 * @param {number[][]} data - An array of objects, each representing an activity.
 * @param {number} id - The user id.
 * @param {Object} admin - the admin object to interact with Firestore
 *
 * @returns {String} - A message indicating the success or failure of the operation.
 */
const refineUserModel = async (data, id, admin) => {
	try {
		const model = await loadModel(id, admin)
		const predictors = data.slice(0, 6)
		const labels = data[6]

		const tensorPredictors = tf.tensor2d(predictors, [1, 6])
		const tensorLabels = tf.tensor1d([labels], "float32")

		model.compile({
			optimizer: tf.train.adam(),
			loss: "sparseCategoricalCrossentropy",
			metrics: ["accuracy"],
		})

		await model.fit(tensorPredictors, tensorLabels, {
			epochs: 1,
			batchSize: 1,
		})

		const weights = await model.save(
			tf.io.withSaveHandler(async (artifacts) => {
				return artifacts
			})
		)
		const weightDataBase64 = Buffer.from(weights.weightData).toString("base64")
		await admin.firestore().collection("userModels").doc(id).set({
			weightData: weightDataBase64,
		})
		return "Model updated successfully"
	} catch (error) {
		return error.message
	}
}

module.exports = { predictData, refineUserModel }
