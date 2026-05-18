import { Router } from "express"
import File from "../models/File.js"

const router = Router()

router.post("/save", async (req, res) => {
  try {
    const { roomId, filename, content, language } = req.body
    const userId = req.headers["x-user-id"]

    const file = await File.findOneAndUpdate(
      { roomId, filename },
      { content, language, savedBy: userId },
      { upsert: true, new: true }
    )

    res.json({ success: true, file })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

router.get("/:roomId", async (req, res) => {
  try {
    const files = await File.find({ roomId: req.params.roomId })
      .select("filename language updatedAt savedBy")
      .sort({ updatedAt: -1 })

    res.json({ success: true, files })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

router.delete("/:fileId", async (req, res) => {
  try {
    await File.findByIdAndDelete(req.params.fileId)
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

export default router