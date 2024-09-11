const express = require("express")
const cors = require("cors")
const { predictData, refineUserModel } = require("./predictionModel")
require("dotenv").config()

// Import firebase-admin and initialize the app
var admin = require("firebase-admin")
var serviceAccount = require("./firebaseKey.js")
admin.initializeApp({
	credential: admin.credential.cert(serviceAccount),
})

const app = express()
const PORT = 8080

app.use(cors())
app.use(express.json())

const getToken = (req) => {
	const auth = req.headers.authorization
	if (!auth) {
		return { undefined, undefined }
	}
	const token = auth.split("Bearer ")[1]
	const id = req.headers.id
	return { id, token }
}

const validateToken = async (id, token) => {
	if (!id || !token) return false

	const userRef = admin.firestore().collection("users").doc(id)
	const userDoc = await userRef.get()
	if (userDoc.exists) {
		const userData = userDoc.data()
		const now = new Date().getTime() / 1000

		if (userData.access_token === token && userData.expires_at > now) {
			return true
		}
	}
	return false
}

// Define the /predict route
app.post("/predict", async (req, res) => {
	const { id, token } = getToken(req)
	const validToken = await validateToken(id, token)
	if (!validToken) {
		res.status(401).json({ message: "Unauthorized" })
		return
	}

	const inputData = req.body
	const predictionResult = await predictData(inputData, id, admin)
	res.json(predictionResult)
})

// Define the /refine route
app.post("/refine", async (req, res) => {
	const { id, token } = getToken(req)
	const validToken = await validateToken(id, token)
	if (!validToken) {
		res.status(401).json({ message: "Unauthorized" })
		return
	}

	const inputData = req.body
	const status = await refineUserModel(inputData, id, admin)
	res.status(status === "Model updated successfully" ? 200 : 400).json({ message: status })
})

// Start the server
app.listen(PORT, () => {
	console.log(`Server is running on http://localhost:${PORT}`)
})
