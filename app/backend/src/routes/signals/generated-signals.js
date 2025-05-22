const express = require("express");
const router = express.Router();
const GeneratedSignal = require("../../models/GeneratedSignal");
const UserSignal = require("../../models/UserSignal");
const UserAuth = require("../../models/UserAuth");
const { awardRefuseSignalPoints } = require("../../controllers/points");

router.get("/", async (req, res) => {
  try {
    // Get pagination parameters from query string
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5; // 5 signals per type
    const skip = (page - 1) * limit;

    // Get total count for each type
    const totalBuyCount = await GeneratedSignal.countDocuments({
      signal_text: { $regex: "^BUY" },
    });
    const totalSellCount = await GeneratedSignal.countDocuments({
      signal_text: { $regex: "^SELL" },
    });

    // Fetch buy signals
    const buySignals = await GeneratedSignal.find({
      signal_text: { $regex: "^BUY" },
    })
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit);

    // Fetch sell signals
    const sellSignals = await GeneratedSignal.find({
      signal_text: { $regex: "^SELL" },
    })
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit);

    // Process signals
    const processSignals = (signals) => {
      return signals.map((signal) => {
        if (signal?.signal_text?.startsWith("BUY")) {
          signal.type = "Buy";
        } else if (signal?.signal_text?.startsWith("SELL")) {
          signal.type = "Sell";
        }
        const confidenceScore = signal.signal_text.match(
          /Confidence Score of (\d+\.\d+)/
        );
        if (confidenceScore) {
          signal.confidenceScore = confidenceScore[1];
        }
        signal.level = "Conservative";
        if (
          signal.events &&
          Array.isArray(signal.events) &&
          signal.events.length > 0
        ) {
          signal.events = signal.events[0].split("\n\n").map((event) => {
            const splitEvents = event.split("\n");
            const splitEvents2 = splitEvents.map((splitEvent) => {
              const items = splitEvent.split("\n\n");
              return items.filter(
                (item) => item && item.toString().trim() !== ""
              );
            });
            return splitEvents2;
          });
          signal.events = signal.events
            .flat()
            .filter((item) => item && item.toString().trim() !== "");
        }
        return signal;
      });
    };

    const processedBuySignals = processSignals(buySignals);
    const processedSellSignals = processSignals(sellSignals);

    if (req.query.userAddress) {
      const userSignals = await UserSignal.find({
        userAddress: req.query.userAddress,
      });

      const expandSignals = (signals) => {
        return signals.map((s) => ({
          ...s.toObject(),
          userSignal: userSignals.find((us) => {
            return us.signalId === s._id.toString();
          }),
        }));
      };

      res.json({
        buySignals: expandSignals(processedBuySignals),
        sellSignals: expandSignals(processedSellSignals),
        pagination: {
          buy: {
            total: totalBuyCount,
            page,
            limit,
            pages: Math.ceil(totalBuyCount / limit),
          },
          sell: {
            total: totalSellCount,
            page,
            limit,
            pages: Math.ceil(totalSellCount / limit),
          },
        },
      });
    } else {
      res.json({
        buySignals: processedBuySignals,
        sellSignals: processedSellSignals,
        pagination: {
          buy: {
            total: totalBuyCount,
            page,
            limit,
            pages: Math.ceil(totalBuyCount / limit),
          },
          sell: {
            total: totalSellCount,
            page,
            limit,
            pages: Math.ceil(totalSellCount / limit),
          },
        },
      });
    }
  } catch (error) {
    console.error("ERROR", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", async (req, res) => {
  const signal = await GeneratedSignal.findById(req.params.id);
  const userSignals = await UserSignal.find({
    signalId: signal._id,
  });
  res.json({ signal, userSignals });
});

router.post("/user-signal", async (req, res) => {
  const { userAddress, signalId, choice } = req.body;
  const privyToken = req.headers.authorization.replace("Bearer ", "");

  if (!userAddress || !signalId || !choice) {
    const missing = [];
    if (!userAddress) missing.push("userAddress");
    if (!signalId) missing.push("signalId");
    if (!choice) missing.push("choice");
    return res
      .status(400)
      .json({ error: `Missing required fields: ${missing.join(", ")}` });
  }

  const userAuth = await UserAuth.findOne({
    userAddress,
    privyAccessToken: privyToken,
  });

  if (!userAuth) {
    return res.status(400).json({ error: "User not found" });
  }

  const userSignal = await UserSignal.findOne({
    userAddress,
    signalId,
  });
  if (userSignal) {
    return res.status(400).json({ error: "User signal already exists" });
  }

  const newUserSignal = await UserSignal.create({
    userAddress,
    signalId,
    choice,
  });

  if (choice === "No") {
    await awardRefuseSignalPoints(userAddress, signalId);
  }

  res.json(newUserSignal);
});

module.exports = router;
