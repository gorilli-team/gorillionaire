// instrument.js
const Sentry = require("@sentry/node");
require("dotenv").config();

// Only import profiling if Node.js version is supported
let nodeProfilingIntegration = null;
try {
  const profilingModule = require("@sentry/profiling-node");
  nodeProfilingIntegration = profilingModule.nodeProfilingIntegration;
} catch (error) {
  console.warn(
    "Sentry profiling not available for this Node.js version, continuing without profiling"
  );
}

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Environment configuration
  environment: process.env.NODE_ENV || "development",

  // Integrations
  integrations: [
    // Only add profiling integration if available
    ...(nodeProfilingIntegration ? [nodeProfilingIntegration()] : []),
    // Add Express integration
    Sentry.expressIntegration(),
    // Add HTTP integration for better request tracking
    Sentry.httpIntegration(),
    // Add MongoDB integration if you want to track database queries
    Sentry.mongoIntegration(),
  ],

  // Performance monitoring
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0, // Lower sampling in production
  profileSessionSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  profileLifecycle: "trace",

  // Error filtering - don't send every error in production
  beforeSend(event, hint) {
    // Don't send errors in development unless SENTRY_DEBUG is set
    if (process.env.NODE_ENV === "development" && !process.env.SENTRY_DEBUG) {
      return null;
    }

    // Filter out common non-critical errors
    const error = hint.originalException;
    if (error && error.message) {
      // Skip common network errors that don't need tracking
      if (
        error.message.includes("ECONNRESET") ||
        error.message.includes("ECONNREFUSED") ||
        error.message.includes("socket hang up")
      ) {
        return null;
      }
    }

    return event;
  },

  // Additional context
  sendDefaultPii: false, // Set to false for privacy, enable only if needed

  // Release tracking (optional)
  release: process.env.npm_package_version || "1.0.0",

  // Custom tags
  initialScope: {
    tags: {
      component: "signals-server",
    },
  },
});

module.exports = Sentry;
