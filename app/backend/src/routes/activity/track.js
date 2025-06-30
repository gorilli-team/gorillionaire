const express = require("express");
const router = express.Router();
const { ethers } = require("ethers");
const UserActivity = require("../../models/UserActivity");
const Intent = require("../../models/Intent");
const { broadcastNotification } = require("../../websocket");
const UserAuth = require("../../models/UserAuth");
const { trackOnDiscordXpGained } = require("../../controllers/points");
const Referral = require("../../models/Referral");
const WeeklyLeaderboardService = require("../../services/WeeklyLeaderboardService");
const {
  manualArchive,
  archiveSpecificWeek,
} = require("../../cron/weeklyLeaderboard");

// Simple in-memory cache for weekly leaderboard
const weeklyCache = {
  data: null,
  timestamp: null,
  weekStart: null,
  ttl: 5 * 60 * 1000, // 5 minutes cache
};

// Helper function to get cache key for the current week
const getWeeklyCacheKey = () => {
  const now = new Date();
  const startOfWeek = new Date(now);
  const dayOfWeek = now.getDay();
  const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  startOfWeek.setDate(now.getDate() - daysToSubtract);
  startOfWeek.setHours(0, 0, 0, 0);
  return startOfWeek.getTime();
};

// Helper function to check if cache is valid
const isCacheValid = () => {
  if (!weeklyCache.data || !weeklyCache.timestamp || !weeklyCache.weekStart) {
    return false;
  }

  const currentWeek = getWeeklyCacheKey();
  const now = Date.now();

  return (
    weeklyCache.weekStart === currentWeek &&
    now - weeklyCache.timestamp < weeklyCache.ttl
  );
};

// Helper function to invalidate cache
const invalidateWeeklyCache = () => {
  weeklyCache.data = null;
  weeklyCache.timestamp = null;
  weeklyCache.weekStart = null;
};

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
      // Invalidate weekly cache since new user activity was created
      invalidateWeeklyCache();
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
      // Invalidate weekly cache since activity was updated
      invalidateWeeklyCache();
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

    // Invalidate weekly cache since new activity was added
    invalidateWeeklyCache();

    await trackOnDiscordXpGained("Trade", address, points, totalPoints);

    // Check if user has a referrer and award referral bonus
    const referral = await Referral.findOne({
      "referredUsers.address": address.toLowerCase(),
    });

    if (referral) {
      const referralBonus = Math.ceil(points * 0.1); // 10% of trade points

      // Award points to the referrer
      const referrerActivity = await UserActivity.findOne({
        address: referral.referrerAddress,
      });

      if (referrerActivity) {
        referrerActivity.points += referralBonus;
        referrerActivity.activitiesList.push({
          name: "Referral Trade Bonus",
          points: referralBonus,
          date: new Date(),
          referralId: referral._id,
          referredUserAddress: address.toLowerCase(),
          originalTradePoints: points,
        });
        await referrerActivity.save();

        // Invalidate weekly cache since referral activity was added
        invalidateWeeklyCache();

        // Update the referral record
        const referredUser = referral.referredUsers.find(
          (user) => user.address === address.toLowerCase()
        );
        if (referredUser) {
          referredUser.pointsEarned += referralBonus;
        }
        referral.totalPointsEarned += referralBonus;
        await referral.save();

        // Track on Discord
        await trackOnDiscordXpGained(
          "Referral Trade Bonus",
          referral.referrerAddress,
          referralBonus,
          referrerActivity.points
        );

        console.log(
          `Awarded ${referralBonus} referral bonus points to ${referral.referrerAddress} for trade by ${address}`
        );
      }
    }

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

    // Get referral data for all users in the current page
    const userAddresses = users.map((user) => user.address);
    const referrals = await Referral.find({
      referrerAddress: { $in: userAddresses },
    });

    // Create a map of referral data for quick lookup
    const referralMap = new Map();
    referrals.forEach((referral) => {
      referralMap.set(referral.referrerAddress, {
        totalReferred: referral.referredUsers.length,
        totalReferralPoints: referral.totalPointsEarned,
      });
    });

    // Calculate the real rank by adding the skip value
    const usersWithRank = users.map((user, index) => {
      const referralData = referralMap.get(user.address) || {
        totalReferred: 0,
        totalReferralPoints: 0,
      };

      // Create a new object with all user properties plus the rank and referral data
      return {
        ...user.toObject(), // Convert Mongoose document to plain object
        rank: skip + index + 1, // Adjust rank based on pagination
        totalReferred: referralData.totalReferred,
        totalReferralPoints: referralData.totalReferralPoints,
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

router.get("/leaderboard/weekly", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Calculate the start of the current week (Monday)
    const now = new Date();
    const startOfWeek = new Date(now);
    const dayOfWeek = now.getDay();
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Sunday = 0, Monday = 1
    startOfWeek.setDate(now.getDate() - daysToSubtract);
    startOfWeek.setHours(0, 0, 0, 0);

    // Check if we have valid cached data
    if (isCacheValid()) {
      const cachedData = weeklyCache.data;
      const total = cachedData.length;
      const paginatedUsers = cachedData.slice(skip, skip + limit);

      // Calculate total weekly points for percentage calculation
      const totalWeeklyPoints = cachedData.reduce(
        (sum, user) => sum + user.weeklyPoints,
        0
      );

      // Get referral data for users in the current page
      const userAddresses = paginatedUsers.map((user) => user.address);
      const referrals = await Referral.find({
        referrerAddress: { $in: userAddresses },
      });

      // Create a map of referral data for quick lookup
      const referralMap = new Map();
      referrals.forEach((referral) => {
        // Filter referred users to only include those who joined this week
        const weeklyReferredUsers = referral.referredUsers.filter(
          (referredUser) => new Date(referredUser.joinedAt) >= startOfWeek
        );

        // Calculate weekly referral points (only from users who joined this week)
        const weeklyReferralPoints = weeklyReferredUsers.reduce(
          (total, referredUser) => total + (referredUser.pointsEarned || 0),
          0
        );

        referralMap.set(referral.referrerAddress, {
          totalReferred: weeklyReferredUsers.length,
          totalReferralPoints: weeklyReferralPoints,
        });
      });

      // Add rank and referral data
      const usersWithRank = paginatedUsers.map((user, index) => {
        const referralData = referralMap.get(user.address) || {
          totalReferred: 0,
          totalReferralPoints: 0,
        };

        return {
          ...user,
          rank: skip + index + 1,
          points: user.weeklyPoints,
          totalReferred: referralData.totalReferred,
          totalReferralPoints: referralData.totalReferralPoints,
        };
      });

      return res.json({
        users: usersWithRank,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          hasMore: skip + usersWithRank.length < total,
        },
        weekStart: startOfWeek,
        weekEnd: new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000 - 1),
        totalWeeklyPoints,
      });
    }

    // Use MongoDB aggregation pipeline for better performance
    const pipeline = [
      // Unwind activitiesList to work with individual activities
      { $unwind: "$activitiesList" },

      // Filter activities from this week only, excluding "Account Connected"
      {
        $match: {
          "activitiesList.date": { $gte: startOfWeek },
          "activitiesList.name": { $ne: "Account Connected" },
        },
      },

      // Group by user and calculate weekly stats
      {
        $group: {
          _id: "$address",
          address: { $first: "$address" },
          weeklyPoints: { $sum: "$activitiesList.points" },
          weeklyActivities: { $sum: 1 },
          createdAt: { $first: "$createdAt" },
          // Keep other user fields
          nonce: { $first: "$nonce" },
          points: { $first: "$points" },
          lastSignIn: { $first: "$lastSignIn" },
          streak: { $first: "$streak" },
          isRewarded: { $first: "$isRewarded" },
          discordUsername: { $first: "$discordUsername" },
          updatedAt: { $first: "$updatedAt" },
        },
      },

      // Filter out users with 0 weekly points
      { $match: { weeklyPoints: { $gt: 0 } } },

      // Sort by weekly points (descending), then by creation date
      {
        $sort: {
          weeklyPoints: -1,
          createdAt: 1,
        },
      },
    ];

    const users = await UserActivity.aggregate(pipeline);

    // Cache the results
    weeklyCache.data = users;
    weeklyCache.timestamp = Date.now();
    weeklyCache.weekStart = getWeeklyCacheKey();

    if (!users || users.length === 0) {
      return res.json({
        users: [],
        pagination: {
          total: 0,
          page,
          limit,
          totalPages: 0,
          hasMore: false,
        },
        weekStart: startOfWeek,
        weekEnd: new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000 - 1),
        totalWeeklyPoints: 0,
      });
    }

    const total = users.length;
    const paginatedUsers = users.slice(skip, skip + limit);

    // Calculate total weekly points for percentage calculation
    const totalWeeklyPoints = users.reduce(
      (sum, user) => sum + user.weeklyPoints,
      0
    );

    // Get referral data for users in the current page
    const userAddresses = paginatedUsers.map((user) => user.address);
    const referrals = await Referral.find({
      referrerAddress: { $in: userAddresses },
    });

    // Create a map of referral data for quick lookup
    const referralMap = new Map();
    referrals.forEach((referral) => {
      // Filter referred users to only include those who joined this week
      const weeklyReferredUsers = referral.referredUsers.filter(
        (referredUser) => new Date(referredUser.joinedAt) >= startOfWeek
      );

      // Calculate weekly referral points (only from users who joined this week)
      const weeklyReferralPoints = weeklyReferredUsers.reduce(
        (total, referredUser) => total + (referredUser.pointsEarned || 0),
        0
      );

      referralMap.set(referral.referrerAddress, {
        totalReferred: weeklyReferredUsers.length,
        totalReferralPoints: weeklyReferralPoints,
      });
    });

    // Add rank and referral data
    const usersWithRank = paginatedUsers.map((user, index) => {
      const referralData = referralMap.get(user.address) || {
        totalReferred: 0,
        totalReferralPoints: 0,
      };

      return {
        ...user,
        rank: skip + index + 1,
        points: user.weeklyPoints, // Use weekly points instead of total points
        totalReferred: referralData.totalReferred,
        totalReferralPoints: referralData.totalReferralPoints,
      };
    });

    res.json({
      users: usersWithRank,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + usersWithRank.length < total,
      },
      weekStart: startOfWeek,
      weekEnd: new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000 - 1),
      totalWeeklyPoints,
    });
  } catch (error) {
    console.error("Error fetching weekly leaderboard:", error);
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

    if (!userActivity) {
      return res.status(404).json({ error: "User activity not found" });
    }

    userActivity.activitiesList = userActivity.activitiesList.sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );

    userActivity.activitiesList = userActivity.activitiesList.slice(
      skip,
      skip + limit
    );

    // Get total count of activities
    const totalActivities = await UserActivity.aggregate([
      { $match: { address: address.toLowerCase() } },
      { $project: { count: { $size: "$activitiesList" } } },
    ]);

    const totalCount =
      totalActivities && totalActivities.length > 0 && totalActivities[0]
        ? totalActivities[0].count
        : 0;

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
        dollarValue:
          dollarValue && dollarValue.length > 0 ? dollarValue[0].total : 0,
        pagination: {
          total: totalCount,
          page,
          limit,
          totalPages: Math.ceil(totalCount / limit),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching user activity:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get user's weekly leaderboard info
router.get("/me/weekly", async (req, res) => {
  try {
    const { address } = req.query;
    if (!address) {
      return res.status(400).json({ error: "No address provided" });
    }

    // Calculate the start of the current week (Monday)
    const now = new Date();
    const startOfWeek = new Date(now);
    const dayOfWeek = now.getDay();
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Sunday = 0, Monday = 1
    startOfWeek.setDate(now.getDate() - daysToSubtract);
    startOfWeek.setHours(0, 0, 0, 0);

    // Use aggregation pipeline to get user's weekly stats efficiently
    const userWeeklyPipeline = [
      { $match: { address: address.toLowerCase() } },
      { $unwind: "$activitiesList" },
      {
        $match: {
          "activitiesList.date": { $gte: startOfWeek },
          "activitiesList.name": { $ne: "Account Connected" },
        },
      },
      {
        $group: {
          _id: "$address",
          weeklyPoints: { $sum: "$activitiesList.points" },
          weeklyActivities: { $sum: 1 },
          createdAt: { $first: "$createdAt" },
        },
      },
    ];

    const userWeeklyResult = await UserActivity.aggregate(userWeeklyPipeline);
    const myWeeklyPoints =
      userWeeklyResult.length > 0 ? userWeeklyResult[0].weeklyPoints : 0;
    const myWeeklyActivities =
      userWeeklyResult.length > 0 ? userWeeklyResult[0].weeklyActivities : 0;
    const myCreatedAt =
      userWeeklyResult.length > 0 ? userWeeklyResult[0].createdAt : new Date();

    // Get user's rank using aggregation pipeline
    const rankPipeline = [
      { $unwind: "$activitiesList" },
      {
        $match: {
          "activitiesList.date": { $gte: startOfWeek },
          "activitiesList.name": { $ne: "Account Connected" },
        },
      },
      {
        $group: {
          _id: "$address",
          weeklyPoints: { $sum: "$activitiesList.points" },
          createdAt: { $first: "$createdAt" },
        },
      },
      { $match: { weeklyPoints: { $gt: 0 } } },
      {
        $sort: {
          weeklyPoints: -1,
          createdAt: 1,
        },
      },
      {
        $group: {
          _id: null,
          users: { $push: { address: "$_id", weeklyPoints: "$weeklyPoints" } },
        },
      },
      {
        $project: {
          rank: {
            $add: [
              1,
              {
                $indexOfArray: ["$users.address", address.toLowerCase()],
              },
            ],
          },
        },
      },
    ];

    const rankResult = await UserActivity.aggregate(rankPipeline);
    const myRank = rankResult.length > 0 ? rankResult[0].rank : null;

    // Get referral data for this user (filtered by weekly period)
    let totalReferred = 0;
    let totalReferralPoints = 0;
    const referral = await Referral.findOne({
      referrerAddress: address.toLowerCase(),
    });
    if (referral) {
      // Filter referred users to only include those who joined this week
      const weeklyReferredUsers = referral.referredUsers.filter(
        (referredUser) => new Date(referredUser.joinedAt) >= startOfWeek
      );

      // Calculate weekly referral points (only from users who joined this week)
      const weeklyReferralPoints = weeklyReferredUsers.reduce(
        (total, referredUser) => total + (referredUser.pointsEarned || 0),
        0
      );

      totalReferred = weeklyReferredUsers.length;
      totalReferralPoints = weeklyReferralPoints;
    }

    // Get referral trade bonuses from user's weekly activities
    const referralBonusPipeline = [
      { $match: { address: address.toLowerCase() } },
      { $unwind: "$activitiesList" },
      {
        $match: {
          "activitiesList.date": { $gte: startOfWeek },
          "activitiesList.name": "Referral Trade Bonus",
        },
      },
      {
        $group: {
          _id: null,
          totalBonus: { $sum: "$activitiesList.points" },
        },
      },
    ];

    const referralBonusResult = await UserActivity.aggregate(
      referralBonusPipeline
    );
    const weeklyReferralTradeBonuses =
      referralBonusResult.length > 0 ? referralBonusResult[0].totalBonus : 0;
    totalReferralPoints += weeklyReferralTradeBonuses;

    res.json({
      address,
      weeklyPoints: myWeeklyPoints,
      weeklyActivities: myWeeklyActivities,
      rank: myRank,
      totalReferred,
      totalReferralPoints,
    });
  } catch (error) {
    console.error("Error fetching weekly user leaderboard info:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Performance monitoring endpoint
router.get("/performance", async (req, res) => {
  try {
    const cacheStats = {
      cacheHit: weeklyCache.data !== null,
      cacheAge: weeklyCache.timestamp
        ? Date.now() - weeklyCache.timestamp
        : null,
      cacheSize: weeklyCache.data ? weeklyCache.data.length : 0,
      weekStart: weeklyCache.weekStart,
      currentWeek: getWeeklyCacheKey(),
      isValid: isCacheValid(),
    };

    res.json({
      cache: cacheStats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching performance stats:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get all archived weekly leaderboards
router.get("/leaderboard/archived", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const result = await WeeklyLeaderboardService.getAllArchivedLeaderboards(
      page,
      limit
    );

    res.json(result);
  } catch (error) {
    console.error("Error fetching archived leaderboards:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get archived leaderboard for a specific week
router.get("/leaderboard/archived/:weekNumber/:year", async (req, res) => {
  try {
    const { weekNumber, year } = req.params;
    const parsedWeekNumber = parseInt(weekNumber);
    const parsedYear = parseInt(year);

    if (isNaN(parsedWeekNumber) || isNaN(parsedYear)) {
      return res.status(400).json({ error: "Invalid week number or year" });
    }

    const leaderboard = await WeeklyLeaderboardService.getArchivedLeaderboard(
      parsedWeekNumber,
      parsedYear
    );

    if (!leaderboard) {
      return res.status(404).json({ error: "Archived leaderboard not found" });
    }

    res.json(leaderboard);
  } catch (error) {
    console.error("Error fetching archived leaderboard:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get user's historical performance across weeks
router.get("/leaderboard/history/:address", async (req, res) => {
  try {
    const { address } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    if (!address) {
      return res.status(400).json({ error: "No address provided" });
    }

    const result = await WeeklyLeaderboardService.getUserHistory(
      address,
      page,
      limit
    );

    res.json(result);
  } catch (error) {
    console.error("Error fetching user history:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Manually trigger weekly leaderboard archive (admin endpoint)
router.post("/leaderboard/archive", async (req, res) => {
  try {
    const { date } = req.body;

    let archived;
    if (date) {
      // Archive specific week
      archived = await archiveSpecificWeek(new Date(date));
    } else {
      // Archive current week if it's over
      archived = await manualArchive();
    }

    if (archived) {
      res.json({
        success: true,
        message: "Weekly leaderboard archived successfully",
        data: archived,
      });
    } else {
      res.json({
        success: false,
        message: "No data to archive or week not over yet",
      });
    }
  } catch (error) {
    console.error("Error archiving weekly leaderboard:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get current week status
router.get("/leaderboard/status", async (req, res) => {
  try {
    const now = new Date();
    const { startOfWeek, endOfWeek } =
      WeeklyLeaderboardService.getWeekBoundaries(now);
    const { weekNumber, year } =
      WeeklyLeaderboardService.getWeekInfo(startOfWeek);
    const isWeekOver = WeeklyLeaderboardService.isWeekOver();
    const exists = await WeeklyLeaderboardService.existsForWeek(startOfWeek);

    res.json({
      currentWeek: {
        weekNumber,
        year,
        startOfWeek,
        endOfWeek,
        isWeekOver,
        isArchived: exists,
      },
      timeRemaining: isWeekOver ? 0 : endOfWeek.getTime() - now.getTime(),
    });
  } catch (error) {
    console.error("Error fetching leaderboard status:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
