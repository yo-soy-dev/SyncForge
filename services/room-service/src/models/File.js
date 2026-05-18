import mongoose from "mongoose"

const fileSchema = new mongoose.Schema({
  roomId:   { type: mongoose.Schema.Types.ObjectId, ref: "Room", required: true },
  filename: { type: String, required: true, trim: true },
  content:  { type: String, default: "" },
  language: { type: String, default: "javascript" },
  savedBy:  { type: mongoose.Schema.Types.ObjectId, required: true },
}, { timestamps: true })

fileSchema.index({ roomId: 1, filename: 1 }, { unique: true })

export default mongoose.model("File", fileSchema)