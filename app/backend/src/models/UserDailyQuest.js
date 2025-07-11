const mongoose = require("mongoose");

const userDailyQuestSchema = new mongoose.Schema(
  {
    questId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DailyQuest",
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
    claimedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    currentProgress: {
      type: Number,
      default: 0,
    },
    lastProgressUpdate: {
      type: Date,
      default: Date.now,
    },
    questDate: {
      type: Date,
      required: true,
      default: Date.now,
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
  },
  {
    timestamps: true,
  }
);

// Create compound index for efficient queries
userDailyQuestSchema.index({ address: 1, questId: 1, questDate: 1 });
userDailyQuestSchema.index({ address: 1, questDate: 1, questOrder: 1 });

module.exports = mongoose.model("UserDailyQuest", userDailyQuestSchema);
