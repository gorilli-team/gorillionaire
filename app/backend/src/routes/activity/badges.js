//create a route to get the badges for a user

const express = require("express");
const router = express.Router();
const UserBadge = require("../../models/UserBadge");
const Badge = require("../../models/Badge");

router.get("/:address", async (req, res) => {
  const { address } = req.params;

  const user = await User.findOne({ address: address.toLowerCase() });

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  const userBadges = await UserBadge.find({
    address: address.toLowerCase(),
  });

  res.json({ userBadges });
});

module.exports = router;
