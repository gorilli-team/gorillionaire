const mongoose = require("mongoose");

const UserSignalV2Schema = new mongoose.Schema({
  userAddress: {
    type: String,
    required: true,
    index: true
  },
  signalId: {
    type: String,
    required: true,
    index: true
  },
  choice: {
    type: String,
    enum: ["Yes", "No"],
    required: true
  },
  symbol: {
    type: String,
    required: true
  },
  actionType: {
    type: String,
    enum: ["Buy", "Sell"],
    required: true
  },
  priceAtSignal: {
    type: Number,
    required: true
  },
  created_at: {
    type: Date,
    default: Date.now,
    index: true
  }
});

module.exports = mongoose.model("User-Signal-V2", UserSignalV2Schema);