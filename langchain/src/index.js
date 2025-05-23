import "dotenv/config";
import { fetchData, closeConnection } from "./mongodb.js";
import { processAndStoreData } from "./vectorStore.js";
import { startSignalPolling } from "./tradingAgent.js";

const DATA_POLLING_INTERVAL = 30 * 60 * 1000; // 30 minutes

async function fetchAndUpdateData() {
  try {
    console.log("Fetching data from MongoDB...");
    const data = await fetchData();

    if (data === "") {
      console.log("No data found in MongoDB");
      return null;
    }

    console.log("Processing and storing data...");
    await processAndStoreData(data);

    console.log("Data update completed.");
  } catch (error) {
    console.error("Error updating data:", error);
  } finally {
    closeConnection();
  }
}

function startDataPolling() {
  console.log(
    `Starting data polling with interval: ${
      DATA_POLLING_INTERVAL / 60000
    } minutes`
  );
  fetchAndUpdateData();
  setInterval(fetchAndUpdateData, DATA_POLLING_INTERVAL);
}

function main() {
  startDataPolling();
  startSignalPolling();
}

main();
