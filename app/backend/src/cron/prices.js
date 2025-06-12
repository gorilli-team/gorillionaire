const cron = require("node-cron");
const PriceOracle = require("../services/PriceOracle");

let priceUpdateCronJob = null;

// Initialize the cron job
function initPriceUpdateCron() {
  if (priceUpdateCronJob) {
    console.log("Price update cron job already running");
    return priceUpdateCronJob;
  }

  // Run every 5 minutes
  priceUpdateCronJob = cron.schedule("*/5 * * * *", async () => {
    try {
      const priceOracle = new PriceOracle();
      await priceOracle.updatePrices();
    } catch (error) {
      console.error("Failed to update prices:", error);
    }
  });

  return priceUpdateCronJob;
}

function stopPriceUpdateCron() {
  if (priceUpdateCronJob) {
    priceUpdateCronJob.stop();
    priceUpdateCronJob = null;
    console.log("Price update cron job stopped");
  }
}

module.exports = {
  initPriceUpdateCron,
  stopPriceUpdateCron,
};
