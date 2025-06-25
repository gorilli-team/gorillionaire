const mongoose = require("mongoose");
const UserActivity = require("../models/UserActivity");
const Activity = require("../models/Activity");

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_CONNECTION_STRING);
    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
};

// Migration function
const migrateActivities = async () => {
  try {
    console.log("Starting activities migration...");

    // Get all UserActivity documents
    const userActivities = await UserActivity.find({});
    console.log(`Found ${userActivities.length} user activity documents`);

    let totalActivitiesMigrated = 0;
    let totalUsersProcessed = 0;

    for (const userActivity of userActivities) {
      if (
        !userActivity.activitiesList ||
        userActivity.activitiesList.length === 0
      ) {
        console.log(`No activities for user ${userActivity.address}`);
        continue;
      }

      console.log(
        `Processing user ${userActivity.address} with ${userActivity.activitiesList.length} activities`
      );

      // Check if activities already exist for this user
      const existingActivities = await Activity.find({
        userAddress: userActivity.address,
      });

      if (existingActivities.length > 0) {
        console.log(
          `Activities already exist for user ${userActivity.address}, skipping...`
        );
        continue;
      }

      // Prepare activities for migration
      const activitiesToInsert = userActivity.activitiesList.map(
        (activity) => ({
          userAddress: userActivity.address,
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

      // Insert activities in batches
      if (activitiesToInsert.length > 0) {
        await Activity.insertMany(activitiesToInsert);
        totalActivitiesMigrated += activitiesToInsert.length;
        console.log(
          `Migrated ${activitiesToInsert.length} activities for user ${userActivity.address}`
        );
      }

      totalUsersProcessed++;
    }

    console.log(`\nMigration completed successfully!`);
    console.log(`Total users processed: ${totalUsersProcessed}`);
    console.log(`Total activities migrated: ${totalActivitiesMigrated}`);
  } catch (error) {
    console.error("Migration error:", error);
    throw error;
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

// Run migration
const runMigration = async () => {
  try {
    await connectDB();
    await migrateActivities();
    console.log("Migration script completed successfully");
    process.exit(0);
  } catch (error) {
    console.error("Migration script failed:", error);
    process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  runMigration();
}

module.exports = { migrateActivities, getActivityType };
