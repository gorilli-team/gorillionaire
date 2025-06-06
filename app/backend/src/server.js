// server.js
const http = require("http");
const app = require("./app");
const { initWebSocketServer } = require("./websocket");
const { initTokenHoldersCron } = require("./cron/blockvision");
const { initPriceUpdateCron } = require("./cron/prices");
require("dotenv").config();
const mongoose = require("mongoose");

const PORT = process.env.PORT || 3001;
const MAX_RESTART_ATTEMPTS = 5;
const RESTART_DELAY = 5000;

let serverInstance = null;
let restartAttempts = 0;
let isShuttingDown = false;

async function startServer() {
  try {
    // Prevent multiple simultaneous starts
    if (serverInstance) {
      console.log("Server is already running");
      return serverInstance;
    }

    console.log("Starting server...");

    // Setup database connection
    const baseConnectionString = process.env.MONGODB_CONNECTION_STRING;
    if (!baseConnectionString) {
      throw new Error(
        "MONGODB_CONNECTION_STRING environment variable is required"
      );
    }

    // Clean and construct connection string
    const cleanConnectionString = baseConnectionString
      .split("/")
      .slice(0, -1)
      .join("/");
    const connectionString = `${cleanConnectionString}/signals`;

    // Connect to MongoDB with proper error handling
    await mongoose.connect(connectionString, {
      serverSelectionTimeoutMS: 10000, // 10 second timeout
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    });

    console.log("Connected to MongoDB successfully");

    // Create HTTP server
    const server = http.createServer(app);

    // Initialize WebSocket server
    const wss = initWebSocketServer(server);

    // Initialize cron jobs with error handling
    try {
      initTokenHoldersCron();
      initPriceUpdateCron();
      console.log("Cron jobs initialized successfully");
    } catch (cronError) {
      console.error("Failed to initialize cron jobs:", cronError);
      // Don't restart for cron job failures, just log and continue
    }

    // Start server
    await new Promise((resolve, reject) => {
      server.listen(PORT, (error) => {
        if (error) {
          reject(error);
        } else {
          console.log(`HTTP server running on port ${PORT}`);
          resolve();
        }
      });
    });

    // Store server instance
    serverInstance = server;
    restartAttempts = 0; // Reset restart attempts on successful start

    // Setup error handlers
    setupErrorHandlers(server);

    return server;
  } catch (error) {
    console.error("Failed to start server:", error);

    // Only attempt restart if we haven't exceeded max attempts
    if (restartAttempts < MAX_RESTART_ATTEMPTS && !isShuttingDown) {
      restartAttempts++;
      console.log(`Restart attempt ${restartAttempts}/${MAX_RESTART_ATTEMPTS}`);
      await gracefulRestart();
    } else {
      console.error("Max restart attempts reached or shutting down. Exiting.");
      process.exit(1);
    }
  }
}

function setupErrorHandlers(server) {
  // Server error handling
  server.on("error", (error) => {
    console.error("Server error:", error);

    // Only restart for critical errors
    if (error.code === "EADDRINUSE" || error.code === "EACCES") {
      console.error("Critical server error, attempting restart...");
      gracefulRestart();
    }
  });

  // MongoDB connection error handling
  mongoose.connection.on("error", (error) => {
    console.error("MongoDB connection error:", error);
    // Don't immediately restart on MongoDB errors, they might be temporary
  });

  mongoose.connection.on("disconnected", () => {
    console.warn("MongoDB disconnected. Attempting to reconnect...");
    // Mongoose will automatically try to reconnect
  });

  mongoose.connection.on("reconnected", () => {
    console.log("MongoDB reconnected successfully");
  });

  // Process error handling - be more selective about what causes restarts
  process.on("uncaughtException", (error) => {
    console.error("Uncaught Exception:", error);
    console.error("Stack:", error.stack);

    // Only restart for critical errors, not all uncaught exceptions
    if (isCriticalError(error)) {
      gracefulRestart();
    }
  });

  process.on("unhandledRejection", (reason, promise) => {
    console.error("Unhandled Rejection at:", promise, "reason:", reason);

    // Most unhandled rejections don't require a restart
    // Log them but continue running unless it's critical
    if (isCriticalError(reason)) {
      gracefulRestart();
    }
  });

  // Graceful shutdown handlers
  process.on("SIGTERM", () => {
    console.log("SIGTERM received, shutting down gracefully...");
    gracefulShutdown();
  });

  process.on("SIGINT", () => {
    console.log("SIGINT received, shutting down gracefully...");
    gracefulShutdown();
  });
}

function isCriticalError(error) {
  // Define what constitutes a critical error that requires restart
  const criticalErrors = ["EADDRINUSE", "EACCES", "ENOTFOUND", "ECONNREFUSED"];

  return (
    error &&
    (criticalErrors.includes(error.code) ||
      (error.message && error.message.includes("MongoDB")) ||
      (error.message && error.message.includes("listen")))
  );
}

async function gracefulRestart() {
  if (isShuttingDown) {
    console.log("Already shutting down, ignoring restart request");
    return;
  }

  if (restartAttempts >= MAX_RESTART_ATTEMPTS) {
    console.error("Max restart attempts reached, exiting");
    process.exit(1);
  }

  console.log("Initiating graceful restart...");
  isShuttingDown = true;

  try {
    // Close server if it exists
    if (serverInstance) {
      await new Promise((resolve) => {
        serverInstance.close((error) => {
          if (error) {
            console.error("Error closing server:", error);
          }
          resolve();
        });
      });
      serverInstance = null;
    }

    // Close MongoDB connection
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      console.log("MongoDB connection closed");
    }

    // Wait before restarting
    console.log(`Waiting ${RESTART_DELAY}ms before restart...`);
    await new Promise((resolve) => setTimeout(resolve, RESTART_DELAY));

    isShuttingDown = false;

    // Restart server
    console.log("Attempting to restart server...");
    await startServer();
  } catch (error) {
    console.error("Error during graceful restart:", error);
    isShuttingDown = false;

    // If graceful restart fails, try again after a longer delay
    if (restartAttempts < MAX_RESTART_ATTEMPTS) {
      setTimeout(() => gracefulRestart(), RESTART_DELAY * 2);
    } else {
      process.exit(1);
    }
  }
}

async function gracefulShutdown() {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  console.log("Starting graceful shutdown...");

  try {
    // Close server
    if (serverInstance) {
      await new Promise((resolve) => {
        serverInstance.close(() => {
          console.log("HTTP server closed");
          resolve();
        });
      });
    }

    // Close MongoDB connection
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      console.log("MongoDB connection closed");
    }

    console.log("Graceful shutdown completed");
    process.exit(0);
  } catch (error) {
    console.error("Error during graceful shutdown:", error);
    process.exit(1);
  }
}

// Start the server
startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});

// Export functions for testing or external use
module.exports = {
  get server() {
    return serverInstance;
  },
  startServer,
  gracefulShutdown,
};
