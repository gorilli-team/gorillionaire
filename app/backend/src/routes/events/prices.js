const express = require("express");
const router = express.Router();
const PriceOracle = require("../../services/PriceOracle");
const PriceData = require("../../models/PriceData");

// Get price data
router.get("/", async (req, res) => {
  try {
    const { symbol } = req.query;
    let query = {};

    if (symbol) {
      query = { tokenSymbol: symbol.toUpperCase() };
    }

    const prices = await PriceData.find(query)
      .sort({ timestamp: -1 })
      .limit(100);

    res.json({ success: true, data: prices });
  } catch (error) {
    console.error("Error fetching prices:", error);
    res.status(500).json({ success: false, error: "Failed to fetch prices" });
  }
});

router.get("/latest", async (req, res) => {
  try {
    const symbols = ["CHOG", "DAK", "YAKI", "WMON"];

    //for each symbol, get the latest price
    const prices = await Promise.all(
      symbols.map(async (symbol) => {
        const price = await PriceData.findOne({
          tokenSymbol: symbol.toUpperCase(),
        })
          .sort({ timestamp: -1 })
          .limit(1);
        return { symbol, price };
      })
    );

    res.json({ success: true, data: prices });
  } catch (error) {
    console.error("Error fetching prices:", error);
    res.status(500).json({ success: false, error: "Failed to fetch prices" });
  }
});

// Trigger price update
router.get("/update", async (req, res) => {
  try {
    if (!process.env.CODEX_API_KEY) {
      throw new Error("CODEX_API_KEY environment variable is not set");
    }

    const oracle = new PriceOracle();
    await oracle.updatePrices();
    res.json({ success: true, message: "Prices updated successfully" });
  } catch (error) {
    console.error("Error updating prices:", error);
    res.status(500).json({ success: false, error: "Failed to update prices" });
  }
});

module.exports = router;
