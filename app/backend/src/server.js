// server.js
const http = require("http");
const mongoose = require("mongoose");
const PORT = process.env.PORT || 3001;
const MAX_RESTART_ATTEMPTS = 5;
const RESTART_DELAY = 5000;

// Initialize server state
const serverState = {
  instance: null,
  restartAttempts: 0,
  isShuttingDown: false,
};

async function startServer() {
  try {
    // Ensure we're connecting to the right database
    const baseConnectionString = process.env.MONGODB_CONNECTION_STRING;
    // Remove any existing database name from the connection string
    const cleanConnectionString = baseConnectionString
      .split("/")
      .slice(0, -1)
      .join("/");
    const connectionString = `${cleanConnectionString}/signals`;

    console.log("Attempting to connect to gorillionaire database...");

    await mongoose.connect(connectionString, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // Verify connection
    console.log("Connected to database:", mongoose.connection.db.databaseName);

    // Create HTTP server
    const server = http.createServer(app);

    // Initialize WebSocket server
    const wss = initWebSocketServer(server);

    // Initialize cron jobs
    initTokenHoldersCron();
    initPriceUpdateCron();
    // Start server
    server.listen(PORT, () => {
      console.log(`HTTP server running on port ${PORT}`);
      console.log(`WebSocket server initialized`);
    });

    // Error handling for the server
    server.on("error", (error) => {
      console.error("Server error:", error);
      restartServer();
    });

    // Handle unexpected errors
    process.on("uncaughtException", (error) => {
      console.error("Uncaught Exception:", error);
      restartServer();
    });

    process.on("unhandledRejection", (error) => {
      console.error("Unhandled Rejection:", error);
      restartServer();
    });

    // Return the server instance
    return server;
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error);
    restartServer();
  }
}

async function restartServer() {
  console.log("Attempting to restart server...");

  try {
    // Close existing connections
    await mongoose.connection.close();
    console.log("MongoDB connection closed.");

    // Wait a bit before restarting
    await new Promise((resolve) => setTimeout(resolve, 5000));

    console.log("Restarting server...");
    try {
      await startServer();
    } catch (error) {
      console.error("Failed to restart server:", error);
      // If restart fails, wait longer and try again
      setTimeout(restartServer, 10000);
    }
  } catch (error) {
    console.error("Error during server restart:", error);
    setTimeout(restartServer, 10000);
  }
}

// Start the server and store the instance
let serverInstance;
startServer().then((server) => {
  serverInstance = server;
});

// Export the server instance and the startServer function
module.exports = {
  getServer: () => serverState.instance,
  startServer,
};
