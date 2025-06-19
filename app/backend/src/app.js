// app.js
// IMPORTANT: Import instrument first before any other imports
require("./instrument");

const express = require("express");
const cors = require("cors");
const Sentry = require("@sentry/node");
const { expressIntegration, expressErrorHandler } = require("@sentry/node");
require("dotenv").config();

const app = express();

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS setup
app.use(cors());
app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE,PATCH");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, X-Auth, admin, Authorization"
  );
  next();
});

// Routes
app.use("/events/spike", require("./routes/events/spike"));
app.use("/events/listings", require("./routes/events/listings"));
app.use("/events/transfers", require("./routes/events/transfers"));
app.use("/events/prices", require("./routes/events/prices"));
app.use("/events/token", require("./routes/events/token"));
app.use("/trade", require("./routes/trade/0x"));
app.use("/nillion/data", require("./routes/nillion/data"));
app.use("/activity/track", require("./routes/activity/track"));
app.use("/activity/quests", require("./routes/activity/quests"));
// app.use("/activity/badges", require("./routes/activity/badges"));
app.use("/token/holders", require("./routes/token/holders"));
app.use("/gorilli-nft/holders", require("./routes/gorilliNft/holders"));
app.use(
  "/signals/generated-signals",
  require("./routes/signals/generated-signals")
);
app.use("/auth/privy", require("./routes/auth/privy"));
app.use("/referral", require("./routes/referral"));

// Sentry error handler must be registered after all controllers but before other error handlers
app.use(expressErrorHandler());
app.use("/discord/membership", require("./routes/discord/membership"));

// Basic error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message });
});

module.exports = app;
