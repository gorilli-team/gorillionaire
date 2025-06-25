const mongoose = require("mongoose");
const UserActivity = require("../models/UserActivity");
const Activity = require("../models/Activity");

// Connect to MongoDB
const connectDB = async () => {
  try {
    const connectionString = process.env.MONGODB_CONNECTION_STRING;
    console.log("🔍 Debug Connection Info:");
    console.log(
      "Connection string:",
      connectionString ? connectionString.substring(0, 50) + "..." : "undefined"
    );
    console.log(
      "Database name:",
      connectionString
        ? connectionString.split("/").pop().split("?")[0]
        : "unknown"
    );

    await mongoose.connect(connectionString);
    console.log("MongoDB connected successfully");

    // Show current database
    const dbName = mongoose.connection.db.databaseName;
    console.log("Connected to database:", dbName);
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
};

// Check unmigrated users
const checkUnmigratedUsers = async () => {
  try {
    console.log("\n🔍 Checking for unmigrated users...\n");

    // Get all UserActivity documents with activities
    const userActivities = await UserActivity.find({
      activitiesList: { $exists: true, $ne: [] },
    });

    console.log(
      `📊 Found ${userActivities.length} users with activities in old collection`
    );

    let unmigratedUsers = [];
    let migratedUsers = [];
    let totalActivitiesInOld = 0;
    let totalActivitiesInNew = 0;

    for (const userActivity of userActivities) {
      // Count activities in old collection
      const oldActivityCount = userActivity.activitiesList
        ? userActivity.activitiesList.length
        : 0;
      totalActivitiesInOld += oldActivityCount;

      // Check if user has activities in new collection
      const newActivities = await Activity.find({
        userAddress: userActivity.address,
      });

      const newActivityCount = newActivities.length;
      totalActivitiesInNew += newActivityCount;

      if (newActivityCount === 0) {
        // User has no migrated activities
        unmigratedUsers.push({
          address: userActivity.address,
          oldActivityCount,
          newActivityCount: 0,
        });
      } else {
        // User has migrated activities
        migratedUsers.push({
          address: userActivity.address,
          oldActivityCount,
          newActivityCount,
        });
      }
    }

    // Display results
    console.log("\n📈 Migration Summary:");
    console.log(`✅ Migrated users: ${migratedUsers.length}`);
    console.log(`❌ Unmigrated users: ${unmigratedUsers.length}`);
    console.log(
      `📊 Total activities in old collection: ${totalActivitiesInOld}`
    );
    console.log(
      `📊 Total activities in new collection: ${totalActivitiesInNew}`
    );
    console.log(
      `📊 Migration progress: ${(
        (migratedUsers.length / userActivities.length) *
        100
      ).toFixed(2)}%`
    );

    if (unmigratedUsers.length > 0) {
      console.log("\n❌ Users without migrated activities:");
      console.log("=".repeat(80));

      unmigratedUsers.forEach((user, index) => {
        console.log(`${index + 1}. ${user.address}`);
        console.log(`   Old activities: ${user.oldActivityCount}`);
        console.log(`   New activities: ${user.newActivityCount}`);
        console.log("");
      });

      console.log(
        `\n💡 To migrate these users, run: npm run migrate:activities`
      );
    } else {
      console.log("\n🎉 All users have been migrated successfully!");
    }

    // Show some migrated users for verification
    if (migratedUsers.length > 0) {
      console.log("\n✅ Sample of migrated users:");
      console.log("=".repeat(80));

      migratedUsers.slice(0, 5).forEach((user, index) => {
        console.log(`${index + 1}. ${user.address}`);
        console.log(`   Old activities: ${user.oldActivityCount}`);
        console.log(`   New activities: ${user.newActivityCount}`);
        console.log("");
      });

      if (migratedUsers.length > 5) {
        console.log(`... and ${migratedUsers.length - 5} more migrated users`);
      }
    }

    // Check for any discrepancies
    const discrepancies = migratedUsers.filter(
      (user) => user.oldActivityCount !== user.newActivityCount
    );
    if (discrepancies.length > 0) {
      console.log("\n⚠️  Users with activity count discrepancies:");
      console.log("=".repeat(80));

      discrepancies.slice(0, 10).forEach((user, index) => {
        console.log(`${index + 1}. ${user.address}`);
        console.log(`   Old activities: ${user.oldActivityCount}`);
        console.log(`   New activities: ${user.newActivityCount}`);
        console.log(
          `   Difference: ${user.oldActivityCount - user.newActivityCount}`
        );
        console.log("");
      });

      if (discrepancies.length > 10) {
        console.log(
          `... and ${discrepancies.length - 10} more users with discrepancies`
        );
      }
    }

    return {
      unmigratedUsers,
      migratedUsers,
      totalActivitiesInOld,
      totalActivitiesInNew,
      discrepancies,
    };
  } catch (error) {
    console.error("Error checking unmigrated users:", error);
    throw error;
  }
};

// Run the check
const runCheck = async () => {
  try {
    await connectDB();
    await checkUnmigratedUsers();
    console.log("\n✅ Check completed successfully");
    process.exit(0);
  } catch (error) {
    console.error("❌ Check failed:", error);
    process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  runCheck();
}

module.exports = { checkUnmigratedUsers };
