import mongoose from "mongoose"

const scorecardSchema = new mongoose.Schema({
  roomId:          { type: mongoose.Schema.Types.ObjectId, ref: "Room", required: true },
  interviewerId:   { type: mongoose.Schema.Types.ObjectId, required: true },
  interviewerName: { type: String, default: "Interviewer" },
  ratings: {
    problemSolving: { type: Number, min: 1, max: 4, default: null },
    codeQuality:    { type: Number, min: 1, max: 4, default: null },
    communication:  { type: Number, min: 1, max: 4, default: null },
    testing:        { type: Number, min: 1, max: 4, default: null },
  },
  notes:          { type: String, default: "", maxlength: 5000 },
  recommendation: { type: String, enum: ["strong_no", "no", "yes", "strong_yes", null], default: null },
}, { timestamps: true })

scorecardSchema.index({ roomId: 1, interviewerId: 1 }, { unique: true })

export default mongoose.model("Scorecard", scorecardSchema)