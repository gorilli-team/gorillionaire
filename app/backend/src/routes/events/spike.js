const express = require("express");
const router = express.Router();
const Spike = require("../../models/Spike");
const { v4: uuidv4 } = require("uuid");

//get all tokens
router.get("/", async (req, res) => {
  try {
    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error fetching token stats:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Example of how to broadcast a new event when it's created
router.post("/", async (req, res) => {
  try {
    const apiKey = req.headers["x-api-key"];
    if (apiKey !== process.env.INDEXER_API_KEY) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const {
      tokenName,
      tokenSymbol,
      tokenDecimals,
      tokenAddress,
      thisHourTransfers,
      previousHourTransfers,
      blockNumber,
      blockTimestamp,
    } = req.body;

    // Validate required fields
    if (
      !tokenName ||
      !tokenSymbol ||
      !tokenDecimals ||
      !tokenAddress ||
      !thisHourTransfers ||
      !previousHourTransfers ||
      !blockNumber ||
      !blockTimestamp
    ) {
      console.log("Missing required fields in spike", req.body);
      return res.status(400).json({ error: "Missing required fields" });
    }

    const newSpike = await Spike.create({
      // ... transfer data from request
      id: uuidv4(),
      tokenName,
      tokenSymbol,
      tokenDecimals,
      tokenAddress,
      thisHourTransfers,
      previousHourTransfers,
      blockNumber,
      blockTimestamp,
    });

    await newSpike.save();

    res.status(201).json({ success: true, spike: newSpike });
  } catch (error) {
    console.error("Error creating event:", error);
    res.status(500).json({ error: "Failed to create event" });
  }
});

module.exports = router;
