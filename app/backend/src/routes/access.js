const express = require("express");
const router = express.Router();
const AccessCode = require("../models/AccessCode");
const UserActivity = require("../models/UserActivity");

// Verify access code
router.post("/verify", async (req, res) => {
  try {
    const { code, address } = req.body;

    if (!code || !address) {
      return res.status(400).json({
        success: false,
        message: "Code and address are required",
      });
    }

    // Handle empty code (special case for direct access)
    if (code.trim() === "") {
      // Check if user already has V2 access
      let userActivity = await UserActivity.findOne({
        address: address.toLowerCase(),
      });

      if (!userActivity) {
        // Create new user activity if doesn't exist
        userActivity = new UserActivity({
          address: address.toLowerCase(),
          v2Access: {
            enabled: true,
            enabledAt: new Date(),
            accessCodeUsed: "DIRECT_ACCESS",
          },
        });
      } else {
        // Enable V2 access if not already enabled
        if (!userActivity.v2Access.enabled) {
          userActivity.v2Access = {
            enabled: true,
            enabledAt: new Date(),
            accessCodeUsed: "DIRECT_ACCESS",
          };
        }
      }

      await userActivity.save();

      return res.json({
        success: true,
        message: "V2 access granted",
        v2Enabled: true,
      });
    }

    // Verify access code
    const accessCode = await AccessCode.findOne({
      code: code.toUpperCase(),
      isActive: true,
    });

    if (!accessCode) {
      return res.status(400).json({
        success: false,
        message: "Invalid access code",
      });
    }

    if (!accessCode.canRedeem) {
      return res.status(400).json({
        success: false,
        message: "Access code has reached maximum redemptions or is expired",
      });
    }

    // Check if user already redeemed this code
    const alreadyRedeemed = accessCode.redeemedBy.some(
      (redemption) => redemption.address.toLowerCase() === address.toLowerCase()
    );

    if (alreadyRedeemed) {
      return res.status(400).json({
        success: false,
        message: "You have already redeemed this access code",
      });
    }

    // Redeem the code
    await accessCode.redeem(address);

    // Enable V2 access for user
    let userActivity = await UserActivity.findOne({
      address: address.toLowerCase(),
    });

    let isNewV2Access = false;

    if (!userActivity) {
      // Create new user activity if doesn't exist
      userActivity = new UserActivity({
        address: address.toLowerCase(),
        v2Access: {
          enabled: true,
          enabledAt: new Date(),
          accessCodeUsed: code.toUpperCase(),
        },
      });
      isNewV2Access = true;
    } else {
      // Enable V2 access if not already enabled
      if (!userActivity.v2Access.enabled) {
        userActivity.v2Access = {
          enabled: true,
          enabledAt: new Date(),
          accessCodeUsed: code.toUpperCase(),
        };
        isNewV2Access = true;
      }
    }

    // Award 100 XP for new V2 access
    if (isNewV2Access) {
      userActivity.points += 100;
      userActivity.activitiesList.push({
        name: "V2 Access Granted",
        points: 100,
        date: new Date(),
      });
    }

    await userActivity.save();

    res.json({
      success: true,
      message: "Access code redeemed successfully",
      v2Enabled: true,
    });
  } catch (error) {
    console.error("Error verifying access code:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Check V2 access status
router.get("/status/:address", async (req, res) => {
  try {
    const { address } = req.params;

    if (!address) {
      return res.status(400).json({
        success: false,
        message: "Address is required",
      });
    }

    const userActivity = await UserActivity.findOne({
      address: address.toLowerCase(),
    });

    if (!userActivity) {
      return res.json({
        success: true,
        v2Enabled: false,
      });
    }

    res.json({
      success: true,
      v2Enabled: userActivity.v2Access?.enabled || false,
      enabledAt: userActivity.v2Access?.enabledAt,
      accessCodeUsed: userActivity.v2Access?.accessCodeUsed,
    });
  } catch (error) {
    console.error("Error checking V2 access status:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Admin routes for managing access codes
router.post("/admin/create", async (req, res) => {
  try {
    const { code, maxRedeems, expiresAt, createdBy } = req.body;

    if (!code || !createdBy) {
      return res.status(400).json({
        success: false,
        message: "Code and createdBy are required",
      });
    }

    const accessCode = new AccessCode({
      code: code.toUpperCase(),
      maxRedeems: maxRedeems || 1,
      expiresAt: expiresAt || null,
      createdBy,
    });

    await accessCode.save();

    res.json({
      success: true,
      message: "Access code created successfully",
      accessCode,
    });
  } catch (error) {
    console.error("Error creating access code:", error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Access code already exists",
      });
    }
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Get all access codes (admin)
router.get("/admin/codes", async (req, res) => {
  try {
    const accessCodes = await AccessCode.find({}).sort({ createdAt: -1 });

    res.json({
      success: true,
      accessCodes,
    });
  } catch (error) {
    console.error("Error fetching access codes:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Deactivate access code (admin)
router.put("/admin/deactivate/:code", async (req, res) => {
  try {
    const { code } = req.params;

    const accessCode = await AccessCode.findOneAndUpdate(
      { code: code.toUpperCase() },
      { isActive: false },
      { new: true }
    );

    if (!accessCode) {
      return res.status(404).json({
        success: false,
        message: "Access code not found",
      });
    }

    res.json({
      success: true,
      message: "Access code deactivated successfully",
      accessCode,
    });
  } catch (error) {
    console.error("Error deactivating access code:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

module.exports = router;