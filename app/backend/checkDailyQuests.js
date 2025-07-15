const mongoose = require("mongoose");
const DailyQuest = require("./src/models/DailyQuest");
require("dotenv").config();

// Connect to MongoDB using the same logic as server.js
const baseConnectionString = process.env.MONGODB_CONNECTION_STRING;
if (!baseConnectionString) {
  throw new Error("MONGODB_CONNECTION_STRING environment variable is required");
}

// Clean and construct connection string to connect to signals database
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

async function checkDailyQuests() {
  try {
    console.log("🔍 Checking daily quests in database...");

    // Count total daily quests
    const totalQuests = await DailyQuest.countDocuments();
    console.log(`📊 Total daily quests in database: ${totalQuests}`);

    // Get all daily quests
    const quests = await DailyQuest.find({});
    console.log("\n📋 All Daily Quests in Database:");
    quests.forEach((quest, index) => {
      console.log(
        `${index + 1}. ${quest.questName} - ${quest.questRequirement} ${
          quest.questType
        } (${quest.questRewardAmount} pts) - Active: ${quest.isActive}`
      );
    });

    // Check active quests
    const activeQuests = await DailyQuest.find({ isActive: true });
    console.log(`\n✅ Active quests: ${activeQuests.length}`);

    // Check inactive quests
    const inactiveQuests = await DailyQuest.find({ isActive: false });
    console.log(`❌ Inactive quests: ${inactiveQuests.length}`);

    console.log("\n🎯 Database check completed!");
  } catch (error) {
    console.error("❌ Error checking daily quests:", error);
  } finally {
    mongoose.connection.close();
    console.log("🔌 Database connection closed");
  }
}

// Run the check function
checkDailyQuests();
