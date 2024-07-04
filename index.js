const express = require("express")
const cors = require("cors")
const predictData = require("./predictData")
const app = express()
const PORT = 3000

app.use(cors())
app.use(express.json())

// Define the /predict route
app.post("/predict", (req, res) => {
	const inputData = req.body
	const predictionResult = predictData(inputData)
	res.json(predictionResult)
})

// Start the server
app.listen(PORT, () => {
	console.log(`Server is running on http://localhost:${PORT}`)
})
