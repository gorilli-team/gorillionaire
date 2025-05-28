//create a route to get the badges for a user

const express = require("express");
const router = express.Router();

router.get("/:address", async (req, res) => {
  const { address } = req.params;

  const user = await User.findOne({ address: address.toLowerCase() });

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  const badges = await Badge.find({
    address: address.toLowerCase(),
  });

  res.json({ badges });
});

module.exports = router;