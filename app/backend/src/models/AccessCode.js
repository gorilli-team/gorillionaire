const mongoose = require("mongoose");

const accessCodeSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      index: true,
      uppercase: true,
    },
    maxRedeems: {
      type: Number,
      required: true,
      default: 1,
    },
    currentRedeems: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: String, // Admin address or identifier
      required: true,
    },
    expiresAt: {
      type: Date,
      default: null, // null means no expiration
    },
    redeemedBy: [
      {
        address: {
          type: String,
          required: true,
        },
        redeemedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
accessCodeSchema.index({ code: 1, isActive: 1 });
accessCodeSchema.index({ "redeemedBy.address": 1 });

// Virtual to check if code can be redeemed
accessCodeSchema.virtual("canRedeem").get(function () {
  if (!this.isActive) return false;
  if (this.expiresAt && new Date() > this.expiresAt) return false;
  return this.currentRedeems < this.maxRedeems;
});

// Method to redeem code
accessCodeSchema.methods.redeem = function (address) {
  if (!this.canRedeem) {
    throw new Error("Access code cannot be redeemed");
  }

  // Check if user already redeemed this code
  const alreadyRedeemed = this.redeemedBy.some(
    (redemption) => redemption.address.toLowerCase() === address.toLowerCase()
  );

  if (alreadyRedeemed) {
    throw new Error("User already redeemed this access code");
  }

  this.currentRedeems += 1;
  this.redeemedBy.push({
    address: address.toLowerCase(),
    redeemedAt: new Date(),
  });

  return this.save();
};

module.exports = mongoose.model("AccessCode", accessCodeSchema);
