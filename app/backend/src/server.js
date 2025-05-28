// server.js

require("dotenv").config();
const http = require("http");
const mongoose = require("mongoose");

const app = require("./app");
const { initWebSocketServer, closeWebSocketServer } = require("./websocket");
const {
  initTokenHoldersCron,
  stopTokenHoldersCron,
} = require("./cron/blockvision");
const { initPriceUpdateCron, stopPriceUpdateCron } = require("./cron/prices");

const PORT = process.env.PORT || 3001;

let serverInstance = null;
let wssInstance = null;
let isShuttingDown = false;

async function connectToDatabase() {
  const baseConnectionString = process.env.MONGODB_CONNECTION_STRING;
  const cleanConnectionString = baseConnectionString
    .split("/")
    .slice(0, -1)
    .join("/");
  const connectionString = `${cleanConnectionString}/signals`;

  console.log("Connecting to MongoDB...");
  await mongoose.connect(connectionString, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  console.log("Connected to MongoDB:", mongoose.connection.db.databaseName);
}

async function startServer() {
  try {
    await connectToDatabase();

    serverInstance = http.createServer(app);
    wssInstance = initWebSocketServer(serverInstance);

    // Initialize cron jobs
    initTokenHoldersCron();
    initPriceUpdateCron();

    serverInstance.listen(PORT, () => {
      console.log(`🚀 Server listening on port ${PORT}`);
    });

    serverInstance.on("error", (err) => {
      console.error("HTTP Server error:", err);
      attemptRestart();
    });
  } catch (err) {
    console.error("Startup error:", err);
    attemptRestart();
  }
}

async function shutdown() {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log("Gracefully shutting down...");

  try {
    // Stop cron jobs first
    stopTokenHoldersCron();
    stopPriceUpdateCron();
    console.log("Cron jobs stopped");

    // Close WebSocket server
    if (wssInstance) {
      await closeWebSocketServer(wssInstance);
      console.log("WebSocket server closed");
    }

    // Close HTTP server
    if (serverInstance) {
      await new Promise((resolve, reject) => {
        serverInstance.close((err) => (err ? reject(err) : resolve()));
      });
      console.log("HTTP server closed");
    }

    // Close MongoDB connection
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log("MongoDB disconnected");
    }
  } catch (err) {
    console.error("Error during shutdown:", err);
  } finally {
    process.exit(1);
  }
}

let restartTimeout = null;
function attemptRestart() {
  if (restartTimeout) return;

  restartTimeout = setTimeout(async () => {
    restartTimeout = null;
    console.log("Attempting to restart the server...");
    await shutdown();
    isShuttingDown = false;
    await startServer();
  }, 5000);
}

// Global error and shutdown handlers
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  attemptRestart();
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
  attemptRestart();
});

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// Initial launch
startServer();

// Export the server (optional)
module.exports = {
  get server() {
    return serverInstance;
  },
  startServer,
  shutdown,
};
