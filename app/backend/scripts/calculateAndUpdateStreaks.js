const mongoose = require("mongoose");
require("dotenv").config();

const UserActivity = require("../src/models/UserActivity");

async function calculateAndUpdateStreaks(activityTypes = null) {
  try {
    const activityTypeFilter = activityTypes
      ? `for activities: ${activityTypes.join(", ")}`
      : "for all activities";
    console.log(`🔄 Calculating streaks ${activityTypeFilter}...`);

    // Connect to MongoDB
    const baseConnectionString = process.env.MONGODB_CONNECTION_STRING;
    if (!baseConnectionString) {
      throw new Error(
        "MONGODB_CONNECTION_STRING environment variable is required"
      );
    }

    const cleanConnectionString = baseConnectionString
      .split("/")
      .slice(0, -1)
      .join("/");
    const connectionString = `${cleanConnectionString}/signals`;

    await mongoose.connect(connectionString, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });

    console.log("✅ Connected to MongoDB");

    // Get top 10 users by points
    const users = await UserActivity.find({
      streakLastUpdate: { $exists: false },
    })
      .sort({ points: -1 })
      .limit(20);
    console.log(`📊 Found ${users.length} top users to process (by points)`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const user of users) {
      try {
        console.log(`🔍 Processing user: ${user.address}`);

        // Filter activities by type if specified
        let filteredActivities = user.activitiesList;
        if (activityTypes && activityTypes.length > 0) {
          filteredActivities = user.activitiesList.filter((activity) =>
            activityTypes.includes(activity.name)
          );
        }

        if (filteredActivities.length === 0) {
          console.log(
            `  ⚠️  No matching activities found for user ${user.address}`
          );
          //store streakLastUpdate to now
          user.streakLastUpdate = new Date();
          await user.save();
          skippedCount++;
          continue;
        }

        // Group activities by date
        const activitiesByDate = {};
        filteredActivities.forEach((activity) => {
          const date = new Date(activity.date);
          const dateKey = date.toISOString().split("T")[0];
          if (!activitiesByDate[dateKey]) {
            activitiesByDate[dateKey] = [];
          }
          activitiesByDate[dateKey].push(activity);
        });

        // Sort dates
        const sortedDates = Object.keys(activitiesByDate).sort();

        // Find the longest consecutive streak
        let currentStreak = 0;
        let maxStreak = 0;
        let lastDate = null;

        for (let i = 0; i < sortedDates.length; i++) {
          const currentDate = new Date(sortedDates[i]);

          if (lastDate === null) {
            // First activity day
            currentStreak = 1;
            lastDate = currentDate;
          } else {
            const daysDiff = (currentDate - lastDate) / (1000 * 60 * 60 * 24);

            if (daysDiff === 1) {
              // Consecutive day
              currentStreak++;
            } else {
              // Gap found, reset streak
              currentStreak = 1;
            }
            lastDate = currentDate;
          }

          maxStreak = Math.max(maxStreak, currentStreak);
        }

        // Get the last activity date
        const lastActivityDate = new Date(sortedDates[sortedDates.length - 1]);
        lastActivityDate.setHours(0, 0, 0, 0);

        // Check if the streak is current (last activity was today or yesterday)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        let finalStreak = 0;
        let streakLastUpdate = null;

        if (
          lastActivityDate.getTime() === today.getTime() ||
          lastActivityDate.getTime() === yesterday.getTime()
        ) {
          // Streak is current
          finalStreak = maxStreak;
          streakLastUpdate = lastActivityDate; // Set to last activity date
        } else {
          // Streak is not current
          finalStreak = 0;
          streakLastUpdate = null;
        }

        // Update the user
        user.streak = finalStreak;
        user.streakLastUpdate = streakLastUpdate;

        await user.save();

        const activityTypeLabel = activityTypes
          ? activityTypes.join(", ")
          : "all activities";
        console.log(`  📈 User ${user.address} (${activityTypeLabel}):`);
        console.log(`     - Old streak: ${user.streak}`);
        console.log(`     - New streak: ${finalStreak}`);
        console.log(
          `     - Last activity date: ${sortedDates[sortedDates.length - 1]}`
        );
        console.log(`     - Streak last update: ${streakLastUpdate}`);
        console.log(`     - Total activity days: ${sortedDates.length}`);
        console.log(
          `     - Activity types: ${[
            ...new Set(filteredActivities.map((a) => a.name)),
          ].join(", ")}`
        );

        updatedCount++;
      } catch (error) {
        console.error(`  ❌ Error processing user ${user.address}:`, error);
      }
    }

    console.log(`\n✅ Summary:`);
    console.log(`   - Updated: ${updatedCount} users`);
    console.log(`   - Skipped: ${skippedCount} users (no matching activities)`);
    console.log(`   - Total processed: ${updatedCount + skippedCount} users`);
    console.log(
      `   - Activity filter: ${
        activityTypes ? activityTypes.join(", ") : "all activities"
      }`
    );

    await mongoose.connection.close();
    console.log("✅ Disconnected from MongoDB");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

// Get activity types from command line arguments
const activityTypes = process.argv.slice(2);
if (activityTypes.length > 0) {
  console.log(
    `🎯 Calculating streaks for specific activity types: ${activityTypes.join(
      ", "
    )}`
  );
  calculateAndUpdateStreaks(activityTypes);
} else {
  console.log(`🎯 Calculating streaks for all activities`);
  calculateAndUpdateStreaks();
}
