const express = require("express");
const router = express.Router();
const UserQuest = require("../../models/UserQuest");
const Quest = require("../../models/Quest");
const UserActivity = require("../../models/UserActivity");
const { trackOnDiscordXpGained } = require("../../controllers/points");
const { updateUserStreak } = require("../../utils/streakUtils");

router.get("/:address", async (req, res) => {
  const { address } = req.params;

  const user = await UserActivity.findOne({
    address: { $in: [address, address.toLowerCase()] },
  });

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  try {
    // Get all quests sorted by requirement
    const quests = await Quest.find({}).sort({ questRequirement: 1 });

    // Get all user quests for this address
    const userQuests = await UserQuest.find({
      address: { $regex: new RegExp(`^${address}$`, "i") },
    });

    // Create a map for quick lookup of user progress
    const userQuestMap = {};
    userQuests.forEach((uq) => {
      userQuestMap[uq.questId.toString()] = uq;
    });

    // Combine quest data with user progress
    const questsWithProgress = quests.map((quest) => {
      const userQuest = userQuestMap[quest._id.toString()];

      const currentProgress = userQuest ? userQuest.currentProgress : 0;
      const isCompleted = userQuest ? userQuest.isCompleted : false;
      const completedAt = userQuest ? userQuest.completedAt : null;
      const claimedAt = userQuest ? userQuest.claimedAt : null;

      // Calculate progress percentage
      const progressPercentage =
        quest.questRequirement > 0
          ? Math.min((currentProgress / quest.questRequirement) * 100, 100)
          : 0;

      return {
        ...quest.toObject(),
        currentProgress,
        isCompleted,
        completedAt,
        claimedAt,
        isClaimed: !!claimedAt,
        progressPercentage: Math.round(progressPercentage),
      };
    });

    res.json({ quests: questsWithProgress });
  } catch (error) {
    console.error("Error fetching quests with progress:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/claim", async (req, res) => {
  try {
    const { address, questId } = req.body;

    if (!address || !questId) {
      return res.status(400).json({
        error: "Missing required fields: address and questId",
      });
    }

    // Find the quest to get reward information
    const quest = await Quest.findById(questId);
    if (!quest) {
      return res.status(404).json({ error: "Quest not found" });
    }

    // Find the user quest
    const userQuest = await UserQuest.findOne({
      questId: questId,
      address: { $in: [address, address.toLowerCase()] },
    });

    if (!userQuest) {
      return res.status(404).json({ error: "User quest not found" });
    }

    // Check if quest is completed
    if (!userQuest.isCompleted) {
      return res.status(400).json({ error: "Quest is not completed yet" });
    }

    // Check if already claimed
    if (userQuest.claimedAt) {
      return res.status(400).json({ error: "Quest reward already claimed" });
    }

    // Find user activity to award points
    const userActivity = await UserActivity.findOne({
      address: { $in: [address, address.toLowerCase()] },
    });

    if (!userActivity) {
      return res.status(404).json({ error: "User activity not found" });
    }

    userQuest.claimedAt = new Date();
    await userQuest.save();

    // Award points based on quest reward
    if (quest.questRewardType === "points" && quest.questRewardAmount) {
      const rewardPoints = quest.questRewardAmount;
      userActivity.points += rewardPoints;
      userActivity.activitiesList.push({
        name: `Quest Completed: ${quest.questName}`,
        points: rewardPoints,
        date: new Date(),
        questId: questId,
      });

      await userActivity.save();

      await trackOnDiscordXpGained(
        `Quest Completed: ${quest.questName}`,
        address,
        rewardPoints,
        userActivity.points
      );
    }

    res.json({
      success: true,
      message: "Quest reward claimed successfully",
      reward: {
        type: quest.questRewardType,
        amount: quest.questRewardAmount,
      },
      claimedAt: userQuest.claimedAt,
    });
  } catch (error) {
    console.error("Error claiming quest reward:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    //post a dummy quest
    const quest = await Quest.create({
      questName: "Accept 10 Signals",
      questDescription: "Accept 10 signals to complete this quest",
      questImage: "https://via.placeholder.com/150",
      questType: "acceptedSignals",
      questRequirement: 10,
      questRewardType: "points",
      questRewardAmount: 5,
    });

    res.json({ quest });
  } catch (error) {
    console.error("Error creating quest:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
