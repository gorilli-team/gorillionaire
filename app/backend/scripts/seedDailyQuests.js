const mongoose = require("mongoose");
const DailyQuest = require("../src/models/DailyQuest");
require("dotenv").config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const dailyQuests = [
  {
    questName: "First Steps",
    questDescription: "Complete your first trade of the day",
    questImage: "/propic.png",
    questType: "dailyTransactions",
    questRequirement: 1,
    questRewardType: "points",
    questRewardAmount: 50,
    questLevel: 1,
    questOrder: 1,
    isActive: true,
  },
  {
    questName: "Getting Started",
    questDescription: "Complete 3 trades today",
    questImage: "/propic.png",
    questType: "dailyTransactions",
    questRequirement: 3,
    questRewardType: "points",
    questRewardAmount: 100,
    questLevel: 2,
    questOrder: 2,
    isActive: true,
  },
  {
    questName: "Active Trader",
    questDescription: "Complete 5 trades today",
    questImage: "/propic.png",
    questType: "dailyTransactions",
    questRequirement: 5,
    questRewardType: "points",
    questRewardAmount: 150,
    questLevel: 3,
    questOrder: 3,
    isActive: true,
  },
  {
    questName: "Volume Builder",
    questDescription: "Trade $100 worth of tokens today",
    questImage: "/propic.png",
    questType: "dailyVolume",
    questRequirement: 100,
    questRewardType: "points",
    questRewardAmount: 200,
    questLevel: 4,
    questOrder: 4,
    isActive: true,
  },
  {
    questName: "Dedicated Trader",
    questDescription: "Complete 8 trades today",
    questImage: "/propic.png",
    questType: "dailyTransactions",
    questRequirement: 8,
    questRewardType: "points",
    questRewardAmount: 250,
    questLevel: 5,
    questOrder: 5,
    isActive: true,
  },
  {
    questName: "Volume Master",
    questDescription: "Trade $500 worth of tokens today",
    questImage: "/propic.png",
    questType: "dailyVolume",
    questRequirement: 500,
    questRewardType: "points",
    questRewardAmount: 300,
    questLevel: 6,
    questOrder: 6,
    isActive: true,
  },
  {
    questName: "Signal Hunter",
    questDescription: "Respond to 2 trading signals today",
    questImage: "/propic.png",
    questType: "dailySignals",
    questRequirement: 2,
    questRewardType: "points",
    questRewardAmount: 100,
    questLevel: 7,
    questOrder: 7,
    isActive: true,
  },
  {
    questName: "Trading Pro",
    questDescription: "Complete 12 trades today",
    questImage: "/propic.png",
    questType: "dailyTransactions",
    questRequirement: 12,
    questRewardType: "points",
    questRewardAmount: 400,
    questLevel: 8,
    questOrder: 8,
    isActive: true,
  },
  {
    questName: "Volume Champion",
    questDescription: "Trade $1000 worth of tokens today",
    questImage: "/propic.png",
    questType: "dailyVolume",
    questRequirement: 1000,
    questRewardType: "points",
    questRewardAmount: 500,
    questLevel: 9,
    questOrder: 9,
    isActive: true,
  },
  {
    questName: "Signal Master",
    questDescription: "Respond to 5 trading signals today",
    questImage: "/propic.png",
    questType: "dailySignals",
    questRequirement: 5,
    questRewardType: "points",
    questRewardAmount: 200,
    questLevel: 10,
    questOrder: 10,
    isActive: true,
  },
  {
    questName: "Trading Legend",
    questDescription: "Complete 15 trades today",
    questImage: "/propic.png",
    questType: "dailyTransactions",
    questRequirement: 15,
    questRewardType: "points",
    questRewardAmount: 600,
    questLevel: 11,
    questOrder: 11,
    isActive: true,
  },
  {
    questName: "Volume Legend",
    questDescription: "Trade $2500 worth of tokens today",
    questImage: "/propic.png",
    questType: "dailyVolume",
    questRequirement: 2500,
    questRewardType: "points",
    questRewardAmount: 750,
    questLevel: 12,
    questOrder: 12,
    isActive: true,
  },
  {
    questName: "Ultimate Trader",
    questDescription: "Complete 20 trades today",
    questImage: "/propic.png",
    questType: "dailyTransactions",
    questRequirement: 20,
    questRewardType: "points",
    questRewardAmount: 1000,
    questLevel: 13,
    questOrder: 13,
    isActive: true,
  },
  {
    questName: "Volume God",
    questDescription: "Trade $5000 worth of tokens today",
    questImage: "/propic.png",
    questType: "dailyVolume",
    questRequirement: 5000,
    questRewardType: "points",
    questRewardAmount: 1500,
    questLevel: 14,
    questOrder: 14,
    isActive: true,
  },
  {
    questName: "Signal Legend",
    questDescription: "Respond to 10 trading signals today",
    questImage: "/propic.png",
    questType: "dailySignals",
    questRequirement: 10,
    questRewardType: "points",
    questRewardAmount: 500,
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
