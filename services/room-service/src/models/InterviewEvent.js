import mongoose from "mongoose"
import { EVENT_TYPES } from "../utils/report.js"

const eventSchema = new mongoose.Schema({
  roomId:    { type: mongoose.Schema.Types.ObjectId, ref: "Room", required: true },
  type:      { type: String, enum: EVENT_TYPES, required: true },
  actorId:   { type: mongoose.Schema.Types.ObjectId },
  actorName: { type: String, default: "" },
  meta:      { type: mongoose.Schema.Types.Mixed, default: {} },
  at:        { type: Date, default: Date.now },
})

eventSchema.index({ roomId: 1, at: 1 })

export default mongoose.model("InterviewEvent", eventSchema)