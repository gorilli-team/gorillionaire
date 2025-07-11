const mongoose = require("mongoose");

const dailyQuestSchema = new mongoose.Schema({
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
    enum: ["dailyTransactions", "dailyVolume", "dailyStreak", "dailySignals"],
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
  questLevel: {
    type: Number,
    required: true,
    default: 1,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  questOrder: {
    type: Number,
    required: true,
    default: 1,
  },
});

module.exports = mongoose.model("DailyQuest", dailyQuestSchema);
