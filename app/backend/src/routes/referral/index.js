const express = require("express");
const router = express.Router();
const Referral = require("../../models/Referral");
const UserActivity = require("../../models/UserActivity");
const { trackOnDiscordXpGained } = require("../../controllers/points");
const crypto = require("crypto");

// Generate a unique referral code for a user
router.post("/generate-code", async (req, res) => {
  try {
    const { address } = req.body;

    if (!address) {
      return res.status(400).json({ error: "Address is required" });
    }

    // Check if user already has a referral code
    const existingReferral = await Referral.findOne({
      referrerAddress: address.toLowerCase(),
    });
    if (existingReferral) {
      return res.json({
        referralCode: existingReferral.referralCode,
        message: "Referral code already exists",
      });
    }

    // Generate a unique 8-character referral code
    const referralCode = crypto.randomBytes(4).toString("hex").toUpperCase();

    // Create new referral entry
    const referral = new Referral({
      referrerAddress: address.toLowerCase(),
      referralCode: referralCode,
      referredUsers: [],
      totalPointsEarned: 0,
    });

    await referral.save();

    res.json({
      referralCode: referralCode,
      message: "Referral code generated successfully",
    });
  } catch (error) {
    console.error("Error generating referral code:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get referral statistics for a user
router.get("/stats/:address", async (req, res) => {
  try {
    const { address } = req.params;

    if (!address) {
      return res.status(400).json({ error: "Address is required" });
    }

    // Get referral data
    const referral = await Referral.findOne({
      referrerAddress: address.toLowerCase(),
    });

    if (!referral) {
      return res.json({
        referralCode: null,
        totalReferred: 0,
        totalPointsEarned: 0,
        referredUsers: [],
      });
    }

    // Get detailed info for each referred user
    const referredUsersDetails = await Promise.all(
      referral.referredUsers.map(async (referredUser) => {
        const userActivity = await UserActivity.findOne({
          address: referredUser.address,
        });

        return {
          address: referredUser.address,
          joinedAt: referredUser.joinedAt,
          pointsEarned: referredUser.pointsEarned,
          totalPoints: userActivity ? userActivity.points : 0,
          nadName: userActivity?.nadName || null,
          nadAvatar: userActivity?.nadAvatar || null,
        };
      })
    );

    res.json({
      referralCode: referral.referralCode,
      totalReferred: referral.referredUsers.length,
      totalPointsEarned: referral.totalPointsEarned,
      referredUsers: referredUsersDetails,
    });
  } catch (error) {
    console.error("Error fetching referral stats:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Process a referral when a new user signs up
router.post("/process", async (req, res) => {
  try {
    const { referralCode, newUserAddress } = req.body;

    if (!referralCode || !newUserAddress) {
      return res
        .status(400)
        .json({ error: "Referral code and new user address are required" });
    }

    // Find the referrer by referral code
    const referrer = await Referral.findOne({
      referralCode: referralCode.toUpperCase(),
    });

    if (!referrer) {
      return res.status(404).json({ error: "Invalid referral code" });
    }

    // Check if the new user is not the same as the referrer
    if (referrer.referrerAddress === newUserAddress.toLowerCase()) {
      return res.status(400).json({ error: "Cannot refer yourself" });
    }

    // Check if the new user is already referred by checking all referrals
    const existingReferral = await Referral.findOne({
      "referredUsers.address": newUserAddress.toLowerCase(),
    });

    if (existingReferral) {
      return res.status(400).json({ error: "User already has a referrer" });
    }

    // Determine points earned based on the number of referred users
    const pointsEarned = referrer.referredUsers.length < 3 ? 100 : 0;

    // Add the new user to the referrer's referredUsers array
    referrer.referredUsers.push({
      address: newUserAddress.toLowerCase(),
      joinedAt: new Date(),
      pointsEarned: pointsEarned,
      isActive: true,
    });

    // Update total points earned
    referrer.totalPointsEarned += pointsEarned;
    await referrer.save();

    // Award points to the referrer
    const referrerActivity = await UserActivity.findOne({
      address: referrer.referrerAddress,
    });

    if (referrerActivity) {
      referrerActivity.points += pointsEarned;
      referrerActivity.activitiesList.push({
        name: "Referral Bonus",
        points: pointsEarned,
        date: new Date(),
        referralId: referrer._id,
      });
      await referrerActivity.save();

      // Track on Discord
      await trackOnDiscordXpGained(
        "Referral Bonus",
        referrer.referrerAddress,
        pointsEarned,
        referrerActivity.points
      );
    }

    res.json({
      message: "Referral processed successfully",
      referrerAddress: referrer.referrerAddress,
      pointsAwarded: pointsEarned,
    });
  } catch (error) {
    console.error("Error processing referral:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get all referrals for a user (paginated)
router.get("/list/:address", async (req, res) => {
  try {
    const { address } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    if (!address) {
      return res.status(400).json({ error: "Address is required" });
    }

    // Get referral data
    const referral = await Referral.findOne({
      referrerAddress: address.toLowerCase(),
    });

    if (!referral) {
      return res.json({
        referrals: [],
        pagination: {
          total: 0,
          page,
          limit,
          totalPages: 0,
        },
      });
    }

    // Get total count
    const totalCount = referral.referredUsers.length;

    // Get paginated referrals
    const paginatedReferredUsers = referral.referredUsers
      .sort((a, b) => new Date(b.joinedAt) - new Date(a.joinedAt))
      .slice(skip, skip + limit);

    // Get detailed info for each referral
    const referralsWithDetails = await Promise.all(
      paginatedReferredUsers.map(async (referredUser) => {
        const userActivity = await UserActivity.findOne({
          address: referredUser.address,
        });

        return {
          address: referredUser.address,
          joinedAt: referredUser.joinedAt,
          pointsEarned: referredUser.pointsEarned,
          totalPoints: userActivity ? userActivity.points : 0,
          nadName: userActivity?.nadName || null,
          nadAvatar: userActivity?.nadAvatar || null,
        };
      })
    );

    res.json({
      referrals: referralsWithDetails,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching referrals:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Check if a user has a referrer
router.get("/check-referrer/:address", async (req, res) => {
  try {
    const { address } = req.params;

    if (!address) {
      return res.status(400).json({ error: "Address is required" });
    }

    // Check if user has been referred by someone else
    const referral = await Referral.findOne({
      "referredUsers.address": address.toLowerCase(),
    });

    if (!referral) {
      return res.json({
        hasReferrer: false,
        referrerAddress: null,
        joinedAt: null,
      });
    }

    // Find the specific referred user to get their join date
    const referredUser = referral.referredUsers.find(
      (user) => user.address === address.toLowerCase()
    );

    res.json({
      hasReferrer: true,
      referrerAddress: referral.referrerAddress,
      joinedAt: referredUser ? referredUser.joinedAt : null,
    });
  } catch (error) {
    console.error("Error checking referrer status:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Check if a user is eligible to enter a referral code
router.get("/check-eligibility/:address", async (req, res) => {
  try {
    const { address } = req.params;

    if (!address) {
      return res.status(400).json({ error: "Address is required" });
    }

    // Check if user has been referred by someone else
    const referral = await Referral.findOne({
      "referredUsers.address": address.toLowerCase(),
    });

    // Get user activity to check activities count
    const UserActivity = require("../../models/UserActivity");
    const userActivity = await UserActivity.findOne({
      address: address.toLowerCase(),
    });

    const activitiesCount = userActivity
      ? userActivity.activitiesList.length
      : 0;
    const hasReferrer = !!referral;
    const isEligible = !hasReferrer && activitiesCount < 3;

    res.json({
      hasReferrer,
      activitiesCount,
      isEligible,
    });
  } catch (error) {
    console.error("Error checking referral eligibility:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
