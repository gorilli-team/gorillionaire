const mongoose = require("mongoose");

const referredUserSchema = new mongoose.Schema({
  address: {
    type: String,
    required: true,
  },
  joinedAt: {
    type: Date,
    default: Date.now,
  },
  pointsEarned: {
    type: Number,
    default: 100, // Default points for each referral
  },
  isActive: {
    type: Boolean,
    default: true,
  },
});

const referralSchema = new mongoose.Schema(
  {
    referrerAddress: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    referralCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    referredUsers: [referredUserSchema],
    totalPointsEarned: {
      type: Number,
      default: 0,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Create a compound index to ensure unique referral relationships
referralSchema.index(
  { referrerAddress: 1, "referredUsers.address": 1 },
  { unique: true }
);

module.exports = mongoose.model("Referral", referralSchema);
