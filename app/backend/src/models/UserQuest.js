const mongoose = require("mongoose");

const userQuestSchema = new mongoose.Schema(
  {
    questId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Quest",
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
    }
  },
  {
    timestamps: true,
  }
);

// Create compound index for efficient queries
userQuestSchema.index({ address: 1, questId: 1 });

module.exports = mongoose.model("UserQuest", userQuestSchema);
