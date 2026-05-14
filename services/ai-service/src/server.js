import "dotenv/config"
import app from "./app.js"

const PORT = process.env.PORT || 4004

if (!process.env.MISTRAL_API_KEY) {
  console.error("MISTRAL_API_KEY missing!")
  process.exit(1)
}

app.listen(PORT, () => {
  console.log(`AI Service running on port ${PORT}`)
})