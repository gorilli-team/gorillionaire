const express = require("express");
const router = express.Router();
const UserQuest = require("../../models/UserQuest");
const Quest = require("../../models/Quest");
const UserActivity = require("../../models/UserActivity");

router.get("/:address", async (req, res) => {
  const { address } = req.params;
  
  const user = await UserActivity.findOne({ 
    address: { $in: [address, address.toLowerCase()] }
  });

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  try {
    // Get all quests sorted by requirement
    const quests = await Quest.find({}).sort({ questRequirement: 1 });
    
    // Get all user quests for this address
    const userQuests = await UserQuest.find({ 
      address: { $in: [address, address.toLowerCase()] }
    });
    
    // Create a map for quick lookup of user progress
    const userQuestMap = {};
    userQuests.forEach(uq => {
      userQuestMap[uq.questId.toString()] = uq;
    });

    // Combine quest data with user progress
    const questsWithProgress = quests.map(quest => {
      const userQuest = userQuestMap[quest._id.toString()];
      
      const currentProgress = userQuest ? userQuest.currentProgress : 0;
      const isCompleted = userQuest ? userQuest.isCompleted : false;
      const completedAt = userQuest ? userQuest.completedAt : null;
      
      // Calculate progress percentage
      const progressPercentage = quest.questRequirement > 0 
        ? Math.min((currentProgress / quest.questRequirement) * 100, 100)
        : 0;


      return {
        ...quest.toObject(),
        currentProgress,
        isCompleted,
        completedAt,
        progressPercentage: Math.round(progressPercentage)
      };
    });

    res.json({ quests: questsWithProgress });
  } catch (error) {
    console.error("Error fetching quests with progress:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
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
});

module.exports = router;