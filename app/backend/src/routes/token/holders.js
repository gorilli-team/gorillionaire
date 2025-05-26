const express = require("express");
const router = express.Router();
const TokenHolders = require("../../models/TokenHolders");
const { retrieveAddressTokens } = require("../../api/blockvision");
router.get("/:tokenAddress", async (req, res) => {
  try {
    const tokenAddress = req.params.tokenAddress;
    const tokenHolders = await TokenHolders.findOne({
      tokenAddress: tokenAddress,
    });

    res.json(tokenHolders);
  } catch (error) {
    console.error("Error fetching transfers:", error);
    res.status(500).json({ error: "Failed to fetch transfers" });
  }
});

router.get("/user/:userAddress", async (req, res) => {
  try {
    const userAddress = req.params.userAddress;
    const data = await retrieveAddressTokens({ address: userAddress });

    res.json(data);
  } catch (error) {
    console.error("Error fetching holders:", error);
    res.status(500).json({ error: "Failed to fetch holders" });
  }
});

module.exports = router;
