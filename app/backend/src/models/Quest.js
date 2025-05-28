const mongoose = require("mongoose");

const questSchema = new mongoose.Schema({
  questName: {
    type: String,
    required: true,
  },
  questDescription: {
    type: String,
    required: true,
  },
  questImage: {
    type: String,
    required: true,
  },
  questType: {
    type: String,
    required: true,
    enum: ["acceptedSignals", "refuseSignals", "streakSignals"],
  },
  badgeAwarded: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Badge",
  },
  questRequirement: {
    type: Number,
    required: true,
  },
  questRewardType: {
    type: String,
    required: true,
    enum: ["points", "badge", "nft", "social"],
  },
  questRewardAmount: {
    type: Number,
    required: true,
  },
});

module.exports = mongoose.model("Quest", questSchema);
