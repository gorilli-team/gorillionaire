const mongoose = require("mongoose");
const UserDailyQuest = require("./src/models/UserDailyQuest");
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

async function checkUserDailyQuests() {
  try {
    console.log("🔍 Checking UserDailyQuest records in database...");

    // Count total UserDailyQuest records
    const totalUserQuests = await UserDailyQuest.countDocuments();
    console.log(
      `📊 Total UserDailyQuest records in database: ${totalUserQuests}`
    );

    if (totalUserQuests === 0) {
      console.log("❌ No UserDailyQuest records found in database!");
      console.log(
        "💡 This means daily quests are not being created for users."
      );
      return;
    }

    // Get all UserDailyQuest records with populated quest data
    const userQuests = await UserDailyQuest.find({})
      .populate("questId")
      .sort({ createdAt: -1 })
      .limit(10);

    console.log("\n📋 Recent UserDailyQuest Records:");
    userQuests.forEach((userQuest, index) => {
      console.log(
        `${index + 1}. User: ${userQuest.address} - Quest: ${
          userQuest.questId?.questName || "Unknown"
        } - Progress: ${userQuest.currentProgress}/${
          userQuest.questId?.questRequirement || "Unknown"
        } - Completed: ${userQuest.isCompleted} - Date: ${userQuest.questDate}`
      );
    });

    // Check by date
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayQuests = await UserDailyQuest.find({
      questDate: today,
    }).populate("questId");

    console.log(`\n📅 Today's UserDailyQuest records: ${todayQuests.length}`);

    if (todayQuests.length > 0) {
      console.log("✅ UserDailyQuest records are being created for today!");
    } else {
      console.log("❌ No UserDailyQuest records found for today!");
    }

    // Check unique users
    const uniqueUsers = await UserDailyQuest.distinct("address");
    console.log(`\n👥 Unique users with daily quests: ${uniqueUsers.length}`);

    if (uniqueUsers.length > 0) {
      console.log("📝 Sample users:", uniqueUsers.slice(0, 5));
    }

    console.log("\n🎯 UserDailyQuest check completed!");
  } catch (error) {
    console.error("❌ Error checking UserDailyQuest records:", error);
  } finally {
    mongoose.connection.close();
    console.log("🔌 Database connection closed");
  }
}

// Run the check function
checkUserDailyQuests();
