const express = require("express");
const router = express.Router();
const { ethers } = require("ethers");
const UserActivity = require("../../models/UserActivity");
const crypto = require("crypto");

//track user signin
router.post("/signin", async (req, res) => {
  try {
    const { address } = req.body;
    if (!address) {
      return res.status(400).json({ error: "No address provided" });
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

// Get all users ranked by points
router.get("/leaderboard", async (req, res) => {
  try {
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      UserActivity.find().sort({ points: -1 }).skip(skip).limit(limit),
      UserActivity.countDocuments(),
    ]);

    //add rank to each user
    users.forEach((user, index) => {
      user.rank = index + 1;
    });

    res.json({
      users,
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
    if (!address) {
      return res.status(400).json({ error: "No address provided" });
    }
    const userActivity = await UserActivity.findOne({
      address: address.toLowerCase(),
    });
    if (userActivity && userActivity.activitiesList) {
      userActivity?.activitiesList.sort((a, b) => {
        return new Date(b.date) - new Date(a.date);
      });
    }
    res.json(userActivity);
  } catch (error) {
    console.error("Error fetching user activity:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
module.exports = router;
