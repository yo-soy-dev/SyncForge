import { Router } from "express"
import File from "../models/File.js"
import * as roomService from "../services/room.service.js"
import { getIdentity, isObjectId, canWrite } from "../utils/access.js"

const router = Router()

router.post("/save", async (req, res) => {
  try {
    const { roomId, filename, content, language } = req.body
    const { userId } = getIdentity(req)
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" })

    if (!isObjectId(roomId) || typeof filename !== "string" || !filename.trim() || filename.length > 100) {
      return res.status(400).json({
        success: false,
        message: "valid roomId and filename are required"
      })
    }
    if (typeof content === "string" && content.length > 500_000) {
      return res.status(413).json({ success: false, message: "File too large" })
    }

    const access = await roomService.getRoomWithRole(roomId, userId)
    if (!access || !canWrite(access.role)) {
      return res.status(403).json({ success: false, message: "No write access to this room" })
    }

    const file = await File.findOneAndUpdate(
      { roomId, filename },
      { content, language, savedBy: userId },
      { upsert: true, new: true }
    )

    res.json({ success: true, file })
  } catch (err) {
    console.error("File save error:", err)
    res.status(500).json({ success: false, message: err.message })
  }
})

router.get("/:roomId", async (req, res) => {
  try {
    const { userId } = getIdentity(req)
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" })
    if (!isObjectId(req.params.roomId)) return res.status(400).json({ success: false, message: "Invalid room id" })
    const access = await roomService.getRoomWithRole(req.params.roomId, userId)
    if (!access) return res.status(403).json({ success: false, message: "No access to this room" })

    const files = await File.find({ roomId: req.params.roomId })
      .select("filename language content updatedAt savedBy")
      .sort({ updatedAt: -1 })

    res.json({ success: true, files })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

router.delete("/:fileId", async (req, res) => {
  try {
    const { userId } = getIdentity(req)
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" })
    if (!isObjectId(req.params.fileId)) return res.status(400).json({ success: false, message: "Invalid file id" })

    const file = await File.findById(req.params.fileId)
    if (!file) return res.status(404).json({ success: false, message: "File not found" })
    const access = await roomService.getRoomWithRole(file.roomId.toString(), userId)
    if (!access || !canWrite(access.role)) {
      return res.status(403).json({ success: false, message: "No write access to this room" })
    }
    await File.findByIdAndDelete(req.params.fileId)
    res.json({ success: true, message: "File deleted successfully" })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

export default router;