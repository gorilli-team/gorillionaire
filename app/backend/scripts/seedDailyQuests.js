const mongoose = require("mongoose");
const DailyQuest = require("../src/models/DailyQuest");
require("dotenv").config();

// Connect to MongoDB
mongoose.connect(
  process.env.MONGODB_URI || "mongodb://localhost:27017/gorillionaire",
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }
);

// Fibonacci sequence for trade requirements
const fibonacciSequence = [
  1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987,
];

// Progressive point rewards based on difficulty (1x for first 10, 3x for 10-100, 5x for 100+)
const pointRewards = [
  1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 267, 699, 1131, 1830, 4935,
];

const dailyQuests = [
  {
    questName: "First Trade",
    questDescription: "Complete your first trade of the day",
    questImage: "/propic.png",
    questType: "dailyTransactions",
    questRequirement: 1,
    questRewardType: "points",
    questRewardAmount: 1,
    questLevel: 1,
    questOrder: 1,
    isActive: true,
  },
  {
    questName: "Getting Started",
    questDescription: "Complete 2 trades today",
    questImage: "/propic.png",
    questType: "dailyTransactions",
    questRequirement: 2,
    questRewardType: "points",
    questRewardAmount: 2,
    questLevel: 2,
    questOrder: 2,
    isActive: true,
  },
  {
    questName: "Active Trader",
    questDescription: "Complete 3 trades today",
    questImage: "/propic.png",
    questType: "dailyTransactions",
    questRequirement: 3,
    questRewardType: "points",
    questRewardAmount: 3,
    questLevel: 3,
    questOrder: 3,
    isActive: true,
  },
  {
    questName: "Dedicated Trader",
    questDescription: "Complete 5 trades today",
    questImage: "/propic.png",
    questType: "dailyTransactions",
    questRequirement: 5,
    questRewardType: "points",
    questRewardAmount: 5,
    questLevel: 4,
    questOrder: 4,
    isActive: true,
  },
  {
    questName: "Trading Enthusiast",
    questDescription: "Complete 8 trades today",
    questImage: "/propic.png",
    questType: "dailyTransactions",
    questRequirement: 8,
    questRewardType: "points",
    questRewardAmount: 8,
    questLevel: 5,
    questOrder: 5,
    isActive: true,
  },
  {
    questName: "Trading Pro",
    questDescription: "Complete 13 trades today",
    questImage: "/propic.png",
    questType: "dailyTransactions",
    questRequirement: 13,
    questRewardType: "points",
    questRewardAmount: 13,
    questLevel: 6,
    questOrder: 6,
    isActive: true,
  },
  {
    questName: "Trading Master",
    questDescription: "Complete 21 trades today",
    questImage: "/propic.png",
    questType: "dailyTransactions",
    questRequirement: 21,
    questRewardType: "points",
    questRewardAmount: 21,
    questLevel: 7,
    questOrder: 7,
    isActive: true,
  },
  {
    questName: "Trading Champion",
    questDescription: "Complete 34 trades today",
    questImage: "/propic.png",
    questType: "dailyTransactions",
    questRequirement: 34,
    questRewardType: "points",
    questRewardAmount: 34,
    questLevel: 8,
    questOrder: 8,
    isActive: true,
  },
  {
    questName: "Trading Legend",
    questDescription: "Complete 55 trades today",
    questImage: "/propic.png",
    questType: "dailyTransactions",
    questRequirement: 55,
    questRewardType: "points",
    questRewardAmount: 55,
    questLevel: 9,
    questOrder: 9,
    isActive: true,
  },
  {
    questName: "Trading God",
    questDescription: "Complete 89 trades today",
    questImage: "/propic.png",
    questType: "dailyTransactions",
    questRequirement: 89,
    questRewardType: "points",
    questRewardAmount: 267,
    questLevel: 10,
    questOrder: 10,
    isActive: true,
  },
  {
    questName: "Trading Titan",
    questDescription: "Complete 144 trades today",
    questImage: "/propic.png",
    questType: "dailyTransactions",
    questRequirement: 144,
    questRewardType: "points",
    questRewardAmount: 699,
    questLevel: 11,
    questOrder: 11,
    isActive: true,
  },
  {
    questName: "Trading Emperor",
    questDescription: "Complete 233 trades today",
    questImage: "/propic.png",
    questType: "dailyTransactions",
    questRequirement: 233,
    questRewardType: "points",
    questRewardAmount: 1131,
    questLevel: 12,
    questOrder: 12,
    isActive: true,
  },
  {
    questName: "Trading Sovereign",
    questDescription: "Complete 377 trades today",
    questImage: "/propic.png",
    questType: "dailyTransactions",
    questRequirement: 377,
    questRewardType: "points",
    questRewardAmount: 1830,
    questLevel: 13,
    questOrder: 13,
    isActive: true,
  },
  {
    questName: "Trading Overlord",
    questDescription: "Complete 610 trades today",
    questImage: "/propic.png",
    questType: "dailyTransactions",
    questRequirement: 610,
    questRewardType: "points",
    questRewardAmount: 4935,
    questLevel: 14,
    questOrder: 14,
    isActive: true,
  },
  {
    questName: "Trading Deity",
    questDescription: "Complete 987 trades today",
    questImage: "/propic.png",
    questType: "dailyTransactions",
    questRequirement: 987,
    questRewardType: "points",
    questRewardAmount: 4935,
    questLevel: 15,
    questOrder: 15,
    isActive: true,
  },
];

async function seedDailyQuests() {
  try {
    console.log("🌱 Starting daily quests seeding...");

    // Clear existing daily quests
    await DailyQuest.deleteMany({});
    console.log("🗑️  Cleared existing daily quests");

    // Insert new daily quests
    const insertedQuests = await DailyQuest.insertMany(dailyQuests);
    console.log(`✅ Successfully seeded ${insertedQuests.length} daily quests`);

    // Log the quests for verification
    console.log("\n📋 Seeded Daily Quests:");
    insertedQuests.forEach((quest, index) => {
      console.log(
        `${index + 1}. ${quest.questName} - ${quest.questRequirement} ${
          quest.questType
        } (${quest.questRewardAmount} pts)`
      );
    });

    console.log("\n🎉 Daily quests seeding completed successfully!");
  } catch (error) {
    console.error("❌ Error seeding daily quests:", error);
  } finally {
    mongoose.connection.close();
    console.log("🔌 Database connection closed");
  }
}

// Run the seeding function
seedDailyQuests();
