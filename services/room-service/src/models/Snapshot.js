import mongoose from "mongoose"

const snapshotSchema = new mongoose.Schema({
  roomId:        { type: mongoose.Schema.Types.ObjectId, ref: "Room", required: true },
  text:          { type: String, default: "" },
  language:      { type: String, default: "javascript" },
  kind:          { type: String, enum: ["manual", "auto", "before-ai", "before-restore", "interview-end"], default: "manual" },
  size:          { type: Number, default: 0 },
  createdBy:     { type: mongoose.Schema.Types.ObjectId, required: true },
  createdByName: { type: String, default: "Anonymous" },
}, { timestamps: { createdAt: true, updatedAt: false } })

snapshotSchema.index({ roomId: 1, createdAt: -1 })

export default mongoose.model("Snapshot", snapshotSchema)