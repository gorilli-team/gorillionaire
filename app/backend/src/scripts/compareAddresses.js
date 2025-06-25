const mongoose = require("mongoose");
const UserActivity = require("../models/UserActivity");
const Activity = require("../models/Activity");

// Connect to MongoDB
const connectDB = async () => {
  try {
    const connectionString = process.env.MONGODB_CONNECTION_STRING;
    if (!connectionString) {
      console.error(
        "❌ MONGODB_CONNECTION_STRING environment variable is required"
      );
      process.exit(1);
    }

    console.log("🔍 Connecting to MongoDB...");
    await mongoose.connect(connectionString);
    console.log("✅ MongoDB connected successfully");

    const dbName = mongoose.connection.db.databaseName;
    console.log("📊 Connected to database:", dbName);
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  }
};

// Compare addresses between collections
const compareAddresses = async () => {
  try {
    console.log(
      "\n🔍 Comparing addresses between UserActivities and Activities collections...\n"
    );

    // Get all addresses from UserActivities
    const userActivities = await UserActivity.find({}, { address: 1 });
    const userActivityAddresses = userActivities.map((ua) =>
      ua.address.toLowerCase()
    );

    console.log(
      `📊 Found ${userActivityAddresses.length} addresses in UserActivities collection`
    );

    // Get all unique addresses from Activities
    const activities = await Activity.find({}, { userAddress: 1 });
    const activityAddresses = [
      ...new Set(activities.map((a) => a.userAddress.toLowerCase())),
    ];

    console.log(
      `📊 Found ${activityAddresses.length} unique addresses in Activities collection`
    );

    // Find addresses that are in UserActivities but not in Activities
    const unmigratedAddresses = userActivityAddresses.filter(
      (address) => !activityAddresses.includes(address)
    );

    // Find addresses that are in Activities but not in UserActivities
    const orphanedAddresses = activityAddresses.filter(
      (address) => !userActivityAddresses.includes(address)
    );

    console.log("\n📈 Comparison Results:");
    console.log(
      `✅ Addresses in both collections: ${
        userActivityAddresses.length - unmigratedAddresses.length
      }`
    );
    console.log(
      `❌ Unmigrated addresses (in UserActivities but not in Activities): ${unmigratedAddresses.length}`
    );
    console.log(
      `⚠️  Orphaned addresses (in Activities but not in UserActivities): ${orphanedAddresses.length}`
    );

    if (unmigratedAddresses.length > 0) {
      console.log("\n❌ Unmigrated Addresses:");
      console.log("=".repeat(80));
      unmigratedAddresses.forEach((address, index) => {
        console.log(`${index + 1}. ${address}`);
      });

      console.log(
        `\n💡 Total unmigrated addresses: ${unmigratedAddresses.length}`
      );
    } else {
      console.log("\n🎉 All addresses have been migrated successfully!");
    }

    if (orphanedAddresses.length > 0) {
      console.log(
        "\n⚠️  Orphaned Addresses (in Activities but not in UserActivities):"
      );
      console.log("=".repeat(80));
      orphanedAddresses.forEach((address, index) => {
        console.log(`${index + 1}. ${address}`);
      });
    }

    // Get additional details for unmigrated addresses
    if (unmigratedAddresses.length > 0) {
      console.log("\n📋 Detailed information for unmigrated addresses:");
      console.log("=".repeat(80));

      for (const address of unmigratedAddresses.slice(0, 10)) {
        // Show first 10 for brevity
        const userActivity = await UserActivity.findOne({ address });
        if (userActivity) {
          const activityCount = userActivity.activitiesList
            ? userActivity.activitiesList.length
            : 0;
          const totalPoints = userActivity.points || 0;
          console.log(`Address: ${address}`);
          console.log(`  Activities count: ${activityCount}`);
          console.log(`  Total points: ${totalPoints}`);
          console.log(`  Created: ${userActivity.createdAt}`);
          console.log("");
        }
      }

      if (unmigratedAddresses.length > 10) {
        console.log(
          `... and ${unmigratedAddresses.length - 10} more unmigrated addresses`
        );
      }
    }

    return {
      userActivityAddresses,
      activityAddresses,
      unmigratedAddresses,
      orphanedAddresses,
      totalUserActivities: userActivityAddresses.length,
      totalActivities: activityAddresses.length,
      migrationProgress: (
        ((userActivityAddresses.length - unmigratedAddresses.length) /
          userActivityAddresses.length) *
        100
      ).toFixed(2),
    };
  } catch (error) {
    console.error("❌ Error comparing addresses:", error);
    throw error;
  }
};

// Run the comparison
const runComparison = async () => {
  try {
    await connectDB();
    const results = await compareAddresses();

    console.log("\n📊 Summary:");
    console.log(`Migration Progress: ${results.migrationProgress}%`);
    console.log(`Total UserActivities: ${results.totalUserActivities}`);
    console.log(`Total Activities: ${results.totalActivities}`);
    console.log(`Unmigrated: ${results.unmigratedAddresses.length}`);

    console.log("\n✅ Comparison completed successfully");
    process.exit(0);
  } catch (error) {
    console.error("❌ Comparison failed:", error);
    process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  runComparison();
}

module.exports = { compareAddresses };
