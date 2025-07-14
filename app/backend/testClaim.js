const mongoose = require("mongoose");
const UserDailyQuest = require("./src/models/UserDailyQuest");
const DailyQuest = require("./src/models/DailyQuest");
require("dotenv").config();

// Connect to MongoDB using the same logic as server.js
const baseConnectionString = process.env.MONGODB_CONNECTION_STRING;
if (!baseConnectionString) {
  throw new Error("MONGODB_CONNECTION_STRING environment variable is required");
}

const cleanConnectionString = baseConnectionString
  .split("/")
  .slice(0, -1)
  .join("/");
const connectionString = `${cleanConnectionString}/signals`;

console.log("🔗 Connecting to database:", connectionString);

mongoose.connect(connectionString, {
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
});

async function testClaim() {
  try {
    console.log("🔍 Getting a completed quest for testing...");

    // Get a completed quest for the test user
    const completedQuest = await UserDailyQuest.findOne({
      address: "0x3c016742defdefbcff91c3bfbc3619f8d5331480",
      isCompleted: true,
      claimedAt: null, // Not yet claimed
    }).populate("questId");

    if (!completedQuest) {
      console.log("❌ No completed unclaimed quests found for test user");

      // Let's check what quests exist
      const allQuests = await UserDailyQuest.find({
        address: "0x3c016742defdefbcff91c3bfbc3619f8d5331480",
      }).populate("questId");

      console.log("\n📋 All quests for test user:");
      allQuests.forEach((quest, index) => {
        console.log(
          `${index + 1}. ${quest.questId?.questName} - Completed: ${
            quest.isCompleted
          } - Claimed: ${!!quest.claimedAt}`
        );
      });
      return;
    }

    console.log(
      `✅ Found completed quest: ${completedQuest.questId.questName}`
    );
    console.log(`📝 Quest ID: ${completedQuest.questId._id}`);
    console.log(
      `💰 Reward: ${completedQuest.questId.questRewardAmount} points`
    );

    // Test the claim endpoint
    const response = await fetch(
      "http://localhost:3003/activity/daily-quests/claim",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          address: "0x3c016742defdefbcff91c3bfbc3619f8d5331480",
          questId: completedQuest.questId._id.toString(),
        }),
      }
    );

    const result = await response.json();
    console.log("\n🎯 Claim endpoint response:");
    console.log(`Status: ${response.status}`);
    console.log(`Response:`, JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("❌ Error testing claim:", error);
  } finally {
    mongoose.connection.close();
    console.log("🔌 Database connection closed");
  }
}

// Run the test
testClaim();
