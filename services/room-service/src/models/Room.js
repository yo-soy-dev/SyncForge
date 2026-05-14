import mongoose from "mongoose"

const roomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  code: {
    type: String,
    required: true,
    unique: true,
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  members: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    username: {
      type: String,
      required: true
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  language: {
    type: String,
    default: "javascript",
    enum: ["javascript", "python", "typescript", "java", "cpp", "go"]
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
})

roomSchema.index({ code: 1 })
roomSchema.index({ owner: 1 })
roomSchema.index({ "members.userId": 1 })

const Room = mongoose.model("Room", roomSchema)
export default Room