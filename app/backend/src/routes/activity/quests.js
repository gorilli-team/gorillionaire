//create a route to get the badges for a user

const express = require("express");
const router = express.Router();
const UserQuest = require("../../models/UserQuest");
const Quest = require("../../models/Quest");
const UserActivity = require("../../models/UserActivity");

router.get("/:address", async (req, res) => {
  const { address } = req.params;

  const user = await UserActivity.findOne({ address: address.toLowerCase() });

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  const quests = await Quest.find({}).sort({ questRequirement: 1 });

  res.json({ quests });
});

router.post("/", async (req, res) => {
  //post a dummy quest]
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
