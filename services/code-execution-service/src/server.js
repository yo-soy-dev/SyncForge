import "dotenv/config"
import app from "./app.js"

const PORT = process.env.PORT || 4005

app.listen(PORT, () => {
  console.log(`Code execution service running on port ${PORT}`)
})