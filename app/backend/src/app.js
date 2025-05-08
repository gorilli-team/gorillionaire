// app.js
const express = require("express");
const cors = require("cors");
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
app.use("/pyth", require("./routes/pyth/mon-price"));
app.use("/nillion/data", require("./routes/nillion/data"));
app.use("/activity/track", require("./routes/activity/track"));
app.use("/token/holders", require("./routes/token/holders"));
app.use("/gorilli-nft/holders", require("./routes/gorilliNft/holders"));
app.use(
  "/signals/generated-signals",
  require("./routes/signals/generated-signals")
);
app.use("/auth/privy", require("./routes/auth/privy"));
// Basic error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message });
});

module.exports = app;
