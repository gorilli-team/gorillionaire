const mongoose = require("mongoose");
const { ObjectId } = mongoose.Types;

const activitySchema = new mongoose.Schema(
  {
    userAddress: {
      type: String,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    points: {
      type: Number,
      required: true,
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    intentId: {
      type: ObjectId,
      ref: "Intent",
    },
    txHash: {
      type: String,
    },
    signalId: {
      type: ObjectId,
      ref: "GeneratedSignal",
    },
    // Additional fields for referral activities
    referredUserAddress: {
      type: String,
    },
    originalTradePoints: {
      type: Number,
    },
    referralId: {
      type: ObjectId,
      ref: "Referral",
    },
    // Metadata
    activityType: {
      type: String,
      enum: ["trade", "quest", "referral", "signin", "streak", "other"],
      default: "other",
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
activitySchema.index({ userAddress: 1, date: -1 });
activitySchema.index({ date: 1 });
activitySchema.index({ userAddress: 1, activityType: 1 });
activitySchema.index({ userAddress: 1, name: 1 });

// Compound index for weekly leaderboard queries
activitySchema.index({ date: 1, name: 1 });
activitySchema.index({ date: 1, points: 1 });

module.exports = mongoose.model("Activity", activitySchema);
