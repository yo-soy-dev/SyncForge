import mongoose from "mongoose"

// The interviewer's own written summary of an interview (one per room).
const reportSchema = new mongoose.Schema({
  roomId:        { type: mongoose.Schema.Types.ObjectId, ref: "Room", required: true, unique: true },
  text:          { type: String, default: "", maxlength: 8000 },
  aiAssisted:    { type: Boolean, default: false },   // true when the text started from an AI draft
  updatedById:   { type: mongoose.Schema.Types.ObjectId },
  updatedByName: { type: String, default: "" },
}, { timestamps: true })

export default mongoose.model("InterviewReport", reportSchema)