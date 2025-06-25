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

// Helper function to determine activity type
const getActivityType = (activityName) => {
  const name = activityName.toLowerCase();

  if (name.includes("trade") || name === "trade") {
    return "trade";
  } else if (name.includes("quest") || name.includes("completed")) {
    return "quest";
  } else if (name.includes("referral") || name.includes("bonus")) {
    return "referral";
  } else if (name.includes("signin") || name.includes("connected")) {
    return "signin";
  } else if (name.includes("streak")) {
    return "streak";
  } else {
    return "other";
  }
};

// Migration function for specific addresses
const migrateSpecificAddresses = async (addresses) => {
  try {
    console.log(
      `\n🚀 Starting migration for ${addresses.length} specific addresses...\n`
    );

    let totalActivitiesMigrated = 0;
    let totalUsersProcessed = 0;
    let successfulMigrations = [];
    let failedMigrations = [];

    for (const address of addresses) {
      const normalizedAddress = address.toLowerCase();

      console.log(`\n📋 Processing address: ${normalizedAddress}`);

      try {
        // Find user activity for this address
        const userActivity = await UserActivity.findOne({
          address: normalizedAddress,
        });

        if (!userActivity) {
          console.log(
            `❌ No UserActivity found for address: ${normalizedAddress}`
          );
          failedMigrations.push({
            address: normalizedAddress,
            reason: "No UserActivity found",
          });
          continue;
        }

        if (
          !userActivity.activitiesList ||
          userActivity.activitiesList.length === 0
        ) {
          console.log(
            `⚠️  No activities found for address: ${normalizedAddress}`
          );
          failedMigrations.push({
            address: normalizedAddress,
            reason: "No activities found",
          });
          continue;
        }

        console.log(
          `📊 Found ${userActivity.activitiesList.length} activities for ${normalizedAddress}`
        );

        // Check if activities already exist for this user
        const existingActivities = await Activity.find({
          userAddress: normalizedAddress,
        });

        if (existingActivities.length > 0) {
          console.log(
            `⚠️  Activities already exist for ${normalizedAddress}, skipping...`
          );
          failedMigrations.push({
            address: normalizedAddress,
            reason: "Activities already exist",
            existingCount: existingActivities.length,
          });
          continue;
        }

        // Prepare activities for migration
        const activitiesToInsert = userActivity.activitiesList.map(
          (activity) => ({
            userAddress: normalizedAddress,
            name: activity.name,
            points: activity.points,
            date: activity.date,
            intentId: activity.intentId,
            txHash: activity.txHash,
            signalId: activity.signalId,
            // Determine activity type based on name
            activityType: getActivityType(activity.name),
            // Add metadata for referral activities
            ...(activity.referredUserAddress && {
              referredUserAddress: activity.referredUserAddress,
            }),
            ...(activity.originalTradePoints && {
              originalTradePoints: activity.originalTradePoints,
            }),
            ...(activity.referralId && { referralId: activity.referralId }),
          })
        );

        // Insert activities
        if (activitiesToInsert.length > 0) {
          await Activity.insertMany(activitiesToInsert);
          totalActivitiesMigrated += activitiesToInsert.length;
          console.log(
            `✅ Migrated ${activitiesToInsert.length} activities for ${normalizedAddress}`
          );

          successfulMigrations.push({
            address: normalizedAddress,
            activitiesCount: activitiesToInsert.length,
            totalPoints: userActivity.points || 0,
          });
        }

        totalUsersProcessed++;
      } catch (error) {
        console.error(
          `❌ Error processing ${normalizedAddress}:`,
          error.message
        );
        failedMigrations.push({
          address: normalizedAddress,
          reason: error.message,
        });
      }
    }

    // Print summary
    console.log("\n" + "=".repeat(80));
    console.log("📊 MIGRATION SUMMARY");
    console.log("=".repeat(80));
    console.log(`✅ Successful migrations: ${successfulMigrations.length}`);
    console.log(`❌ Failed migrations: ${failedMigrations.length}`);
    console.log(`📊 Total users processed: ${totalUsersProcessed}`);
    console.log(`📊 Total activities migrated: ${totalActivitiesMigrated}`);

    if (successfulMigrations.length > 0) {
      console.log("\n✅ Successfully migrated addresses:");
      successfulMigrations.forEach((migration, index) => {
        console.log(
          `${index + 1}. ${migration.address} (${
            migration.activitiesCount
          } activities, ${migration.totalPoints} points)`
        );
      });
    }

    if (failedMigrations.length > 0) {
      console.log("\n❌ Failed migrations:");
      failedMigrations.forEach((migration, index) => {
        console.log(`${index + 1}. ${migration.address} - ${migration.reason}`);
      });
    }

    return {
      successfulMigrations,
      failedMigrations,
      totalActivitiesMigrated,
      totalUsersProcessed,
    };
  } catch (error) {
    console.error("❌ Migration error:", error);
    throw error;
  }
};

// Run migration for specific addresses
const runSpecificMigration = async () => {
  try {
    // The addresses that need to be migrated
    const addressesToMigrate = [
      "0xf91eadd30c0e8ab39a6941beaa79d80ac4686ba3",
      "0xfd710eeb8fe08942f14fae4d0c35d5e02686055a",
      "0x279d9968f373b40a3640dafb64eb8697835a05bf",
      "0x9588d210cd2505dce27a6011ed03fd2d1b394441",
      "0xdfb82b6600a16f92f38ca78679e54111f6276a06",
      "0xaf24de53746233c56b0dbee614e138c470e309d3",
      "0xdbd0dd344e06dc4bc0977ce6e757c71e993695ba",
      "0xae57ce1ab4087ffe25bc6833bc95970b08d945d2",
      "0x7afe12a3e5e0f6e49937947ac4969535a42ce8f2",
      "0x762cbb35e282d710d0e12ac477778e924e920598",
      "0x5955167016eaf4e17a95acea0b39efe0330206b4",
      "0x628cf09d011f9f34c01613a7c1a7d39bdd303df3",
    ];

    await connectDB();
    const results = await migrateSpecificAddresses(addressesToMigrate);

    console.log("\n🎉 Specific address migration completed!");
    console.log(
      `Migration success rate: ${(
        (results.successfulMigrations.length / addressesToMigrate.length) *
        100
      ).toFixed(2)}%`
    );

    process.exit(0);
  } catch (error) {
    console.error("❌ Specific migration failed:", error);
    process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  runSpecificMigration();
}

module.exports = { migrateSpecificAddresses };
