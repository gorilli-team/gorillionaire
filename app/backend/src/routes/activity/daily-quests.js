const express = require("express");
const router = express.Router();
const UserDailyQuest = require("../../models/UserDailyQuest");
const DailyQuest = require("../../models/DailyQuest");
const UserActivity = require("../../models/UserActivity");
const { trackOnDiscordXpGained } = require("../../controllers/points");

// Helper function to get today's date (start of day)
const getTodayDate = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

// Helper function to count today's transactions for a user
const getTodayTransactionCount = (activitiesList) => {
  const today = getTodayDate();

  return activitiesList.filter((activity) => {
    const activityDate = new Date(activity.date);
    activityDate.setHours(0, 0, 0, 0);
    return (
      activityDate.getTime() === today.getTime() &&
      (activity.name === "Trade" || activity.name === "Trade (2x XP)")
    );
  }).length;
};

// Helper function to calculate today's total volume
const getTodayVolume = (activitiesList) => {
  const today = getTodayDate();

  return activitiesList
    .filter((activity) => {
      const activityDate = new Date(activity.date);
      activityDate.setHours(0, 0, 0, 0);
      return (
        activityDate.getTime() === today.getTime() &&
        (activity.name === "Trade" || activity.name === "Trade (2x XP)") &&
        activity.intentId?.usdValue
      );
    })
    .reduce((total, activity) => {
      return total + (activity.intentId?.usdValue || 0);
    }, 0);
};

// Get user's daily quests
router.get("/:address", async (req, res) => {
  const { address } = req.params;

  try {
    const user = await UserActivity.findOne({
      address: { $in: [address, address.toLowerCase()] },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const today = getTodayDate();

    // Get or create daily quests for today
    let userDailyQuests = await UserDailyQuest.find({
      address: { $regex: new RegExp(`^${address}$`, "i") },
      questDate: today,
    }).populate("questId");

    // If no daily quests exist for today, create them
    if (userDailyQuests.length === 0) {
      const dailyQuests = await DailyQuest.find({ isActive: true }).sort({
        questOrder: 1,
      });

      userDailyQuests = await Promise.all(
        dailyQuests.map(async (quest, index) => {
          const userDailyQuest = new UserDailyQuest({
            questId: quest._id,
            address: address.toLowerCase(),
            questDate: today,
            questOrder: index + 1,
            currentProgress: 0,
            isCompleted: false,
          });
          return await userDailyQuest.save();
        })
      );

      // Populate the quest data
      userDailyQuests = await UserDailyQuest.find({
        address: { $regex: new RegExp(`^${address}$`, "i") },
        questDate: today,
      }).populate("questId");
    }

    // Calculate current progress for each quest
    const todayTransactionCount = getTodayTransactionCount(user.activitiesList);

    const questsWithProgress = userDailyQuests.map((userQuest, index) => {
      const quest = userQuest.questId;
      let currentProgress = userQuest.currentProgress;

      // Calculate cumulative progress for each quest
      if (index === 0) {
        // First quest: show actual progress
        currentProgress = Math.min(
          todayTransactionCount,
          quest.questRequirement
        );
      } else {
        // For subsequent quests, calculate progress beyond previous cumulative requirements
        let previousCumulativeRequirement = 0;
        for (let i = 0; i < index; i++) {
          previousCumulativeRequirement +=
            userDailyQuests[i].questId.questRequirement;
        }

        // Progress is trades beyond what's needed for previous quests
        const availableTrades = Math.max(
          0,
          todayTransactionCount - previousCumulativeRequirement
        );
        currentProgress = Math.min(availableTrades, quest.questRequirement);
      }

      // Update the user quest progress if it changed
      if (currentProgress !== userQuest.currentProgress) {
        userQuest.currentProgress = currentProgress;
        userQuest.lastProgressUpdate = new Date();

        // Check if quest is completed
        if (
          currentProgress >= quest.questRequirement &&
          !userQuest.isCompleted
        ) {
          userQuest.isCompleted = true;
          userQuest.completedAt = new Date();
        }

        userQuest.save();
      }

      // Calculate progress percentage
      const progressPercentage =
        quest.questRequirement > 0
          ? Math.min((currentProgress / quest.questRequirement) * 100, 100)
          : 0;

      return {
        _id: userQuest._id,
        questId: quest._id,
        questName: quest.questName,
        questDescription: quest.questDescription,
        questImage: quest.questImage,
        questType: quest.questType,
        questRequirement: quest.questRequirement,
        questRewardType: quest.questRewardType,
        questRewardAmount: quest.questRewardAmount,
        questLevel: quest.questLevel,
        questOrder: quest.questOrder,
        currentProgress,
        isCompleted: userQuest.isCompleted,
        completedAt: userQuest.completedAt,
        claimedAt: userQuest.claimedAt,
        isClaimed: !!userQuest.claimedAt,
        progressPercentage: Math.round(progressPercentage),
        isActive: userQuest.isActive,
      };
    });

    // Sort by quest order
    questsWithProgress.sort((a, b) => a.questOrder - b.questOrder);

    res.json({
      quests: questsWithProgress,
      todayTransactionCount,
    });
  } catch (error) {
    console.error("Error fetching daily quests:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Claim daily quest reward
router.post("/claim", async (req, res) => {
  try {
    const { address, questId } = req.body;

    if (!address || !questId) {
      return res.status(400).json({
        error: "Missing required fields: address and questId",
      });
    }

    const today = getTodayDate();

    // Find the user daily quest
    const userDailyQuest = await UserDailyQuest.findOne({
      questId: questId,
      address: { $in: [address, address.toLowerCase()] },
      questDate: today,
    }).populate("questId");

    if (!userDailyQuest) {
      return res.status(404).json({ error: "Daily quest not found" });
    }

    const quest = userDailyQuest.questId;

    // Check if quest is completed
    if (!userDailyQuest.isCompleted) {
      return res.status(400).json({ error: "Quest is not completed yet" });
    }

    // Check if already claimed
    if (userDailyQuest.claimedAt) {
      return res.status(400).json({ error: "Quest reward already claimed" });
    }

    // Find user activity to award points
    const userActivity = await UserActivity.findOne({
      address: { $in: [address, address.toLowerCase()] },
    });

    if (!userActivity) {
      return res.status(404).json({ error: "User activity not found" });
    }

    userDailyQuest.claimedAt = new Date();
    await userDailyQuest.save();

    // Award points based on quest reward
    if (quest.questRewardType === "points" && quest.questRewardAmount) {
      const rewardPoints = quest.questRewardAmount;
      userActivity.points += rewardPoints;
      userActivity.activitiesList.push({
        name: `Daily Quest Completed: ${quest.questName}`,
        points: rewardPoints,
        date: new Date(),
        questId: questId,
      });
      await userActivity.save();

      await trackOnDiscordXpGained(
        `Daily Quest Completed: ${quest.questName}`,
        address,
        rewardPoints,
        userActivity.points
      );
    }

    res.json({
      message: "Quest reward claimed successfully",
      rewardPoints: quest.questRewardAmount,
      newTotalPoints: userActivity.points,
    });
  } catch (error) {
    console.error("Error claiming daily quest:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Reset daily quests (for testing)
router.post("/reset", async (req, res) => {
  try {
    const { address } = req.body;

    if (!address) {
      return res.status(400).json({ error: "Address is required" });
    }

    const today = getTodayDate();

    // Delete today's daily quests
    await UserDailyQuest.deleteMany({
      address: { $in: [address, address.toLowerCase()] },
      questDate: today,
    });

    res.json({ message: "Daily quests reset successfully" });
  } catch (error) {
    console.error("Error resetting daily quests:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get user's completed daily quests
router.get("/:address/completed", async (req, res) => {
  const { address } = req.params;
  const { page = 1, limit = 10 } = req.query;
  const skip = (page - 1) * limit;

  try {
    const user = await UserActivity.findOne({
      address: { $in: [address, address.toLowerCase()] },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Get all completed daily quests for this user
    const completedQuests = await UserDailyQuest.find({
      address: { $regex: new RegExp(`^${address}$`, "i") },
      isCompleted: true,
    })
      .populate("questId")
      .sort({ completedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count of completed quests
    const totalCompleted = await UserDailyQuest.countDocuments({
      address: { $regex: new RegExp(`^${address}$`, "i") },
      isCompleted: true,
    });

    const questsWithDetails = completedQuests.map((userQuest) => {
      const quest = userQuest.questId;

      return {
        _id: userQuest._id,
        questId: quest._id,
        questName: quest.questName,
        questDescription: quest.questDescription,
        questImage: quest.questImage,
        questType: quest.questType,
        questRequirement: quest.questRequirement,
        questRewardType: quest.questRewardType,
        questRewardAmount: quest.questRewardAmount,
        questLevel: quest.questLevel,
        questOrder: quest.questOrder,
        currentProgress: userQuest.currentProgress,
        isCompleted: userQuest.isCompleted,
        completedAt: userQuest.completedAt,
        claimedAt: userQuest.claimedAt,
        isClaimed: !!userQuest.claimedAt,
        questDate: userQuest.questDate,
      };
    });

    res.json({
      quests: questsWithDetails,
      pagination: {
        total: totalCompleted,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(totalCompleted / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching completed daily quests:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
