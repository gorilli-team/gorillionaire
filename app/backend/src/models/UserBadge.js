const mongoose = require("mongoose");

const userBadgeSchema = new mongoose.Schema(
  {
    badgeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Badge",
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    isUnlocked: {
      type: Boolean,
      default: false,
    },
    isClaimed: {
      type: Boolean,
      default: false,
    },
    claimedAt: {
      type: Date,
      default: null,
    },
    unlockedAt: {
      type: Date,
      default: null,
    },
    claimedBy: {
      type: String,
      default: null,
    },
    unlockedBy: {
      type: String,
      default: null,
    },
    claimedTxHash: {
      type: String,
      default: null,
    },
    unlockedTxHash: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Create compound index for efficient queries
userBadgeSchema.index({ address: 1 });

module.exports = mongoose.model("UserBadge", userBadgeSchema);
