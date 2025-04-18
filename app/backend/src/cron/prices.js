const cron = require("node-cron");
const PriceOracle = require("../services/PriceOracle");
// Initialize the cron job
function initPriceUpdateCron() {
  // Run every 5 minutes
  return cron.schedule("*/5 * * * *", async () => {
    try {
      console.log("Updating prices...");
      const priceOracle = new PriceOracle();
      await priceOracle.updatePrices();

      console.log("Successfully updated prices");
    } catch (error) {
      console.error("Failed to update prices:", error);
    }
  });
}

module.exports = {
  initPriceUpdateCron,
};
