const mongoose = require("mongoose");
const { ObjectId } = mongoose.Types;

const userActivitySchema = new mongoose.Schema(
  {
    address: {
      type: String,
      required: true,
      index: true,
    },
    nonce: {
      type: String,
    },
    points: {
      type: Number,
      default: 0,
    },
    lastSignIn: {
      type: Date,
      default: Date.now,
    },
    activitiesList: [
      {
        name: String,
        points: Number,
        date: Date,
        intentId: {
          type: ObjectId,
          ref: "Intent",
        },
        txHash: String,
        signalId: {
          type: ObjectId,
          ref: "GeneratedSignal",
        },
      },
    ],
    streak: {
      type: Number,
      default: 0,
    },
    isRewarded: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Add a pre-find middleware to sort activitiesList by date in descending order
userActivitySchema.pre("find", function () {
  this.sort({ "activitiesList.date": -1 });
});

userActivitySchema.pre("findOne", function () {
  this.sort({ "activitiesList.date": -1 });
});

module.exports = mongoose.model("UserActivity", userActivitySchema);
