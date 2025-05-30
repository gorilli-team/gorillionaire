const mongoose = require("mongoose");

const SpikeSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
  },
  tokenName: {
    type: String,
    required: true,
  },
  tokenSymbol: {
    type: String,
    required: true,
  },
  tokenDecimals: {
    type: Number,
    required: true,
  },
  tokenAddress: {
    type: String,
    required: true,
  },
  thisHourTransfers: {
    type: Number,
    required: true,
  },
  previousHourTransfers: {
    type: Number,
    required: true,
  },
  blockNumber: {
    type: Number,
    required: true,
  },
  blockTimestamp: {
    type: Number,
    required: true,
  },
});

module.exports = mongoose.model("Spike", SpikeSchema);
