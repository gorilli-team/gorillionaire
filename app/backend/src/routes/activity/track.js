const express = require("express");
const router = express.Router();
const { ethers } = require("ethers");
const UserActivity = require("../../models/UserActivity");
const Intent = require("../../models/Intent");
const { broadcastNotification } = require("../../websocket");
const UserAuth = require("../../models/UserAuth");
const { trackOnDiscordXpGained } = require("../../controllers/points");

//track user signin
router.post("/signin", async (req, res) => {
  try {
    const { address } = req.body;
    const privyToken = req.headers.authorization.replace("Bearer ", "");

    if (!address) {
      return res.status(400).json({ error: "No address provided" });
    }

    const userAuth = await UserAuth.findOne({
      userAddress: address,
      privyAccessToken: privyToken,
    });

    if (!userAuth) {
      return res.status(400).json({ error: "User not found" });
    }

    const userActivity = await UserActivity.findOne({
      address: address.toLowerCase(),
    });

    if (!userActivity) {
      //create user activity
      const newUserActivity = new UserActivity({
        address: address.toLowerCase(),
        points: 50,
        lastSignIn: new Date(),
        streak: 1,
        activitiesList: [
          {
            name: "Account Connected",
            points: 50,
            date: new Date(),
          },
        ],
      });
      await newUserActivity.save();
      await trackOnDiscordXpGained("Account Connected", address, 50, 50);
      res.json({ message: "User activity created" });
    } else {
      //update user activity
      userActivity.lastSignIn = new Date();
      //check if the user has connected their account in the last 24 hours
      const lastSignIn = new Date(userActivity.lastSignIn);
      const oneDayAgo = new Date();
      const twoDaysAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      if (lastSignIn < twoDaysAgo) {
        // More than 48 hours ago - reset streak to 1
        userActivity.streak = 1;
      } else if (lastSignIn < oneDayAgo) {
        // Between 24 and 48 hours ago - increment streak
        userActivity.streak += 1;
        userActivity.points += 10;
        userActivity.activitiesList.push({
          name: "Streak Extended",
          points: 10,
          date: new Date(),
        });
      } else {
        // Less than 24 hours ago - keep same streak
        // Do nothing to maintain current streak
      }
      await userActivity.save();
      res.json({ message: "User activity updated" });
    }
  } catch (error) {
    console.error("Error fetching points:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/trade-points", async (req, res) => {
  try {
    const { address, txHash, intentId, signalId } = req.body;

    if (!signalId) {
      return res.status(400).json({ error: "Signal ID is required" });
    }

    const privyToken = req.headers.authorization.replace("Bearer ", "");
    if (!address || !txHash || !intentId) {
      return res
        .status(400)
        .json({ error: "Missing required fields: address, txHash, intentId" });
    }

    const userAuth = await UserAuth.findOne({
      userAddress: address,
      privyAccessToken: privyToken,
    });

    if (!userAuth) {
      return res.status(400).json({ error: "User not found in Trade Points" });
    }

    const userActivity = await UserActivity.findOne({
      address: address.toLowerCase(),
    });

    if (!userActivity) {
      return res.status(400).json({ error: "User activity not found" });
    }

    //check if the txHash is already in the userActivity.activitiesList
    if (
      userActivity.activitiesList.some((activity) => activity.txHash === txHash)
    ) {
      return res.status(400).json({ error: "TxHash already exists" });
    }

    const intent = await Intent.findById(intentId);
    if (!intent) {
      return res.status(400).json({ error: "Intent not found" });
    }

    if (intent.status !== "pending") {
      return res.status(400).json({ error: "Intent already completed" });
    }
    if (intent.userAddress.toLowerCase !== address.toLowerCase) {
      return res.status(400).json({
        error: "Intent not for this address",
        intentUserAddress: intent.userAddress,
        address,
      });
    }

    const provider = new ethers.JsonRpcProvider(
      "https://testnet-rpc.monad.xyz"
    );
    const tx = await provider.getTransaction(txHash);
    if (!tx) {
      return res.status(400).json({ error: "Tx not found" });
    }

    if (!tx.data.includes(intent.data)) {
      return res
        .status(400)
        .json({ error: "Intent not corresponding to tx data" });
    }

    //add the txHash to the userActivity.activitiesList
    const points = Math.ceil(intent.usdValue);
    userActivity.activitiesList.push({
      name: "Trade",
      points: points,
      date: new Date(),
      intentId: intentId,
      signalId: signalId,
      txHash: txHash,
    });
    const totalPoints = userActivity.points + points;
    userActivity.points += points;
    await userActivity.save();

    await trackOnDiscordXpGained("Trade", address, points, totalPoints);

    //update intent status to completed
    intent.status = "completed";
    intent.txHash = txHash;
    await intent.save();

    //broadcast notification to all clients
    broadcastNotification({
      type: "NOTIFICATION",
      data: intent.toObject(),
    });

    res.json({ message: "Points added" });
  } catch (error) {
    console.error("Error fetching points:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get user points
router.get("/points", async (req, res) => {
  try {
    const { address } = req.query;
    if (!address) {
      return res.status(400).json({ error: "No address provided" });
    }

    const userActivity = await UserActivity.findOne({
      address: address.toLowerCase(),
    });

    if (!userActivity) {
      return res.json({ points: 0 });
    }

    res.json({
      points: userActivity.points,
      lastSignIn: userActivity.lastSignIn,
      nextRewardAvailable: userActivity.isRewarded
        ? new Date(userActivity.lastSignIn.getTime() + 24 * 60 * 60 * 1000)
        : new Date(),
    });
  } catch (error) {
    console.error("Error fetching points:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/leaderboard", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      UserActivity.find()
        .sort({ points: -1, createdAt: 1 })
        .skip(skip)
        .limit(limit),
      UserActivity.countDocuments(),
    ]);

    // Calculate the real rank by adding the skip value
    const usersWithRank = users.map((user, index) => {
      // Create a new object with all user properties plus the rank
      return {
        ...user.toObject(), // Convert Mongoose document to plain object
        rank: skip + index + 1, // Adjust rank based on pagination
      };
    });

    res.json({
      users: usersWithRank,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + users.length < total,
      },
    });
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/me", async (req, res) => {
  try {
    const { address } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    if (!address) {
      return res.status(400).json({ error: "No address provided" });
    }

    const dollarValue = await Intent.aggregate([
      { $match: { userAddress: address.toLowerCase(), status: "completed" } },
      { $group: { _id: null, total: { $sum: "$usdValue" } } },
    ]);

    // Get user activity with paginated activities
    const userActivity = await UserActivity.findOne(
      { address: address.toLowerCase() },
      {
        activitiesList: 1,
        points: 1,
        address: 1,
        createdAt: 1,
      }
    )
      .sort({ "activitiesList.date": -1 })
      .populate({
        path: "activitiesList.intentId",
        model: "Intent",
      });

    userActivity.activitiesList = userActivity.activitiesList.sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );

    userActivity.activitiesList = userActivity.activitiesList.slice(
      skip,
      skip + limit
    );

    if (!userActivity) {
      return res.status(404).json({ error: "User activity not found" });
    }

    // Get total count of activities
    const totalActivities = await UserActivity.aggregate([
      { $match: { address: address.toLowerCase() } },
      { $project: { count: { $size: "$activitiesList" } } },
    ]);

    //count the number of users with more points than the user
    const count = await UserActivity.countDocuments({
      $or: [
        { points: { $gt: userActivity.points } },
        {
          points: userActivity.points,
          createdAt: { $lt: userActivity.createdAt },
        },
      ],
    });

    //rank is the number of users with more points than the user + 1
    const result = {
      ...userActivity.toObject(),
      rank: count + 1,
    };

    res.json({
      userActivity: {
        ...result,
        dollarValue: dollarValue ? dollarValue[0].total : 0,
        pagination: {
          total: totalActivities[0]?.count || 0,
          page,
          limit,
          totalPages: Math.ceil((totalActivities[0]?.count || 0) / limit),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching user activity:", error);
    res.status(500).json({ error: "Internal server error", error: error });
  }
});

module.exports = router;
