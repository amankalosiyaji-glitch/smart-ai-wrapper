import mongoose from "mongoose";

const contentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  topic: String,
  niche: String,
  style: String,
  platform: String,
  result: String
}, { timestamps: true });

export default mongoose.model("Content", contentSchema);