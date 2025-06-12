// server.js
// IMPORTANT: Import Sentry instrument first, before any other imports
require("./instrument");

const http = require("http");
const app = require("./app");
const { initWebSocketServer } = require("./websocket");
const { initTokenHoldersCron } = require("./cron/blockvision");
const { initPriceUpdateCron } = require("./cron/prices");
require("dotenv").config();
const mongoose = require("mongoose");
const Sentry = require("@sentry/node");

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
  return Sentry.startSpan({ name: "server-startup" }, async () => {
    try {
      // Prevent multiple simultaneous starts
      if (serverState.instance) {
        console.log("Server is already running");
        return serverState.instance;
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

      // Set Sentry context
      Sentry.setContext("database", {
        status: "connected",
        database: "signals",
      });

      // Create HTTP server
      const server = http.createServer(app);

      // Initialize WebSocket server
      const wss = initWebSocketServer(server);

      // Initialize cron jobs with error handling
      try {
        initTokenHoldersCron();
        initPriceUpdateCron();
        console.log("Cron jobs initialized successfully");

        Sentry.setContext("services", {
          cronJobs: "initialized",
          websocket: "initialized",
        });
      } catch (cronError) {
        console.error("Failed to initialize cron jobs:", cronError);
        Sentry.captureException(cronError, {
          tags: { component: "cron-initialization" },
        });
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
      serverState.instance = server;
      serverState.restartAttempts = 0; // Reset restart attempts on successful start

      // Setup error handlers
      setupErrorHandlers(server);

      // Set Sentry user context (optional)
      Sentry.setUser({
        id: "signals-server",
        serverPort: PORT,
      });

      return server;
    } catch (error) {
      console.error("Failed to start server:", error);

      // Capture error in Sentry
      Sentry.captureException(error, {
        tags: {
          component: "server-startup",
          restartAttempt: serverState.restartAttempts,
        },
      });

      // Only attempt restart if we haven't exceeded max attempts
      if (
        serverState.restartAttempts < MAX_RESTART_ATTEMPTS &&
        !serverState.isShuttingDown
      ) {
        serverState.restartAttempts++;
        console.log(
          `Restart attempt ${serverState.restartAttempts}/${MAX_RESTART_ATTEMPTS}`
        );
        await gracefulRestart();
      } else {
        console.error(
          "Max restart attempts reached or shutting down. Exiting."
        );
        Sentry.captureMessage("Server exceeded max restart attempts", "fatal");
        await Sentry.flush(2000); // Wait 2 seconds for Sentry to send
        process.exit(1);
      }
    }
  });
}

function setupErrorHandlers(server) {
  // Server error handling
  server.on("error", (error) => {
    console.error("Server error:", error);

    // Capture in Sentry
    Sentry.captureException(error, {
      tags: { component: "http-server" },
    });

    // Only restart for critical errors
    if (error.code === "EADDRINUSE" || error.code === "EACCES") {
      console.error("Critical server error, attempting restart...");
      gracefulRestart();
    }
  });

  // MongoDB connection error handling
  mongoose.connection.on("error", (error) => {
    console.error("MongoDB connection error:", error);

    Sentry.captureException(error, {
      tags: { component: "mongodb" },
    });
    // Don't immediately restart on MongoDB errors, they might be temporary
  });

  mongoose.connection.on("disconnected", () => {
    console.warn("MongoDB disconnected. Attempting to reconnect...");

    Sentry.captureMessage("MongoDB disconnected", "warning");
    Sentry.setContext("database", { status: "disconnected" });
    // Mongoose will automatically try to reconnect
  });

  mongoose.connection.on("reconnected", () => {
    console.log("MongoDB reconnected successfully");

    Sentry.captureMessage("MongoDB reconnected", "info");
    Sentry.setContext("database", { status: "reconnected" });
  });

  // Process error handling - be more selective about what causes restarts
  process.on("uncaughtException", (error) => {
    console.error("Uncaught Exception:", error);
    console.error("Stack:", error.stack);

    // Always capture uncaught exceptions in Sentry
    Sentry.captureException(error, {
      tags: {
        component: "process",
        errorType: "uncaughtException",
      },
    });

    // Only restart for critical errors, not all uncaught exceptions
    if (isCriticalError(error)) {
      gracefulRestart();
    }
  });

  process.on("unhandledRejection", (reason, promise) => {
    console.error("Unhandled Rejection at:", promise, "reason:", reason);

    // Capture in Sentry
    Sentry.captureException(reason, {
      tags: {
        component: "process",
        errorType: "unhandledRejection",
      },
      extra: {
        promise: promise.toString(),
      },
    });

    // Most unhandled rejections don't require a restart
    // Log them but continue running unless it's critical
    if (isCriticalError(reason)) {
      gracefulRestart();
    }
  });

  // Graceful shutdown handlers
  process.on("SIGTERM", () => {
    console.log("SIGTERM received, shutting down gracefully...");
    Sentry.captureMessage("Server received SIGTERM", "info");
    gracefulShutdown();
  });

  process.on("SIGINT", () => {
    console.log("SIGINT received, shutting down gracefully...");
    Sentry.captureMessage("Server received SIGINT", "info");
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
  if (serverState.isShuttingDown) {
    console.log("Already shutting down, ignoring restart request");
    return;
  }

  if (serverState.restartAttempts >= MAX_RESTART_ATTEMPTS) {
    console.error("Max restart attempts reached, exiting");
    Sentry.captureMessage("Max restart attempts exceeded", "fatal");
    await Sentry.flush(2000);
    process.exit(1);
  }

  console.log("Initiating graceful restart...");
  Sentry.captureMessage(
    `Initiating graceful restart (attempt ${serverState.restartAttempts})`,
    "warning"
  );
  serverState.isShuttingDown = true;

  try {
    // Close server if it exists
    if (serverState.instance) {
      await new Promise((resolve) => {
        serverState.instance.close((error) => {
          if (error) {
            console.error("Error closing server:", error);
            Sentry.captureException(error, {
              tags: { component: "server-shutdown" },
            });
          }
          resolve();
        });
      });
      serverState.instance = null;
    }

    // Close MongoDB connection
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      console.log("MongoDB connection closed");
    }

    // Wait before restarting
    console.log(`Waiting ${RESTART_DELAY}ms before restart...`);
    await new Promise((resolve) => setTimeout(resolve, RESTART_DELAY));

    serverState.isShuttingDown = false;

    // Restart server
    console.log("Attempting to restart server...");
    await startServer();

    Sentry.captureMessage("Server restarted successfully", "info");
  } catch (error) {
    console.error("Error during graceful restart:", error);
    Sentry.captureException(error, {
      tags: { component: "graceful-restart" },
    });
    serverState.isShuttingDown = false;

    // If graceful restart fails, try again after a longer delay
    if (serverState.restartAttempts < MAX_RESTART_ATTEMPTS) {
      setTimeout(() => gracefulRestart(), RESTART_DELAY * 2);
    } else {
      await Sentry.flush(2000);
      process.exit(1);
    }
  }
}

async function gracefulShutdown() {
  if (serverState.isShuttingDown) {
    return;
  }

  serverState.isShuttingDown = true;
  console.log("Starting graceful shutdown...");

  try {
    // Close server
    if (serverState.instance) {
      await new Promise((resolve) => {
        serverState.instance.close(() => {
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

    // Flush Sentry before exiting
    await Sentry.flush(5000);
    process.exit(0);
  } catch (error) {
    console.error("Error during graceful shutdown:", error);
    Sentry.captureException(error, {
      tags: { component: "graceful-shutdown" },
    });
    await Sentry.flush(2000);
    process.exit(1);
  }
}

// Start the server
startServer().catch(async (error) => {
  console.error("Failed to start server:", error);
  Sentry.captureException(error, {
    tags: { component: "initial-startup" },
  });
  await Sentry.flush(2000);
  process.exit(1);
});

// Export functions for testing or external use
module.exports = {
  getServer: () => serverState.instance,
  startServer,
  gracefulShutdown,
  // Export state for testing
  _serverState: serverState,
};