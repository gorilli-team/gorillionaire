//create a badge model

const mongoose = require("mongoose");

const badgeSchema = new mongoose.Schema({
  badgeName: {
    type: String,
    required: true,
  },
  badgeDescription: {
    type: String,
    required: true,
  },
  badgeImage: {
    type: String,
    required: true,
  },
  badgeType: {
    type: String,
    required: true,
    enum: ["activity", "achievement", "special", "nft", "social"],
  },
});

module.exports = mongoose.model("Badge", badgeSchema);
