const UserActivity = require("../models/UserActivity");
const { broadcastNotification } = require("../websocket");

/**
 * Updates user streak and adds XP rewards
 * @param {string} address - User's wallet address
 * @param {string} activityName - Name of the activity that triggered the streak update
 * @param {number} points - Points for the activity (before streak bonus)
 * @param {Object} metadata - Additional metadata for the activity (optional)
 * @returns {Promise<Object>} - Updated user activity data
 */
async function updateUserStreak(
  address,
  activityName,
  points = 0,
  metadata = {}
) {
  console.log(`🔄 Updating streak for address: ${address}`);
  console.log(`📝 Activity: ${activityName}, Base points: ${points}`);

  try {
    // Find or create user activity
    let userActivity = await UserActivity.findOne({ address });

    if (!userActivity) {
      console.log(`👤 Creating new user activity for address: ${address}`);
      userActivity = new UserActivity({
        address,
        points: 0,
        streak: 0,
        streakLastUpdate: null,
        activitiesList: [],
      });
    }

    // Get today's date normalized to start of day
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get last update date normalized to start of day
    const lastUpdate = userActivity.streakLastUpdate
      ? new Date(userActivity.streakLastUpdate)
      : null;
    const lastUpdateNormalized = lastUpdate
      ? new Date(lastUpdate.setHours(0, 0, 0, 0))
      : null;

    console.log(`📅 Today: ${today.toISOString()}`);
    console.log(
      `📅 Last update: ${lastUpdateNormalized?.toISOString() || "None"}`
    );
    console.log(`🔥 Current streak: ${userActivity.streak}`);

    let updateStreak = false;
    let oldStreak = userActivity.streak;

    // Check if we need to update the streak
    if (!lastUpdateNormalized) {
      // First time user - start streak
      console.log(`🎯 First time user, starting streak`);
      userActivity.streak = 1;
      userActivity.streakLastUpdate = today;
      updateStreak = true;
    } else if (lastUpdateNormalized.getTime() === today.getTime()) {
      // Already updated today
      console.log(`✅ Already updated today, no change needed`);
      updateStreak = false;
    } else if (
      lastUpdateNormalized.getTime() ===
      today.getTime() - 24 * 60 * 60 * 1000
    ) {
      // Consecutive day - extend streak
      console.log(`🔥 Consecutive day, extending streak`);
      userActivity.streak += 1;
      userActivity.streakLastUpdate = today;
      updateStreak = true;
    } else {
      // Gap in streak - reset to 1
      console.log(`💔 Gap in streak, resetting to 1`);
      userActivity.streak = 1;
      userActivity.streakLastUpdate = today;
      updateStreak = true;
    }

    // Add the base activity
    userActivity.points += points;
    userActivity.activitiesList.push({
      name: activityName,
      points: points,
      date: new Date(),
      ...metadata,
    });

    // Add streak extension activity with XP rewards if streak was updated
    if (updateStreak) {
      console.log(`🔄 Streak updated to: ${userActivity.streak}`);

      // Add streak extension activity with XP rewards
      const streakXp = userActivity.streak * 10;
      userActivity.points += streakXp;
      userActivity.activitiesList.push({
        name: `Streak extended to ${userActivity.streak} 🔥`,
        points: streakXp,
        date: new Date(),
      });

      console.log(
        `🎉 Awarded ${streakXp} XP for ${userActivity.streak}-day streak`
      );

      // Broadcast streak update via WebSocket
      broadcastNotification({
        type: "STREAK_UPDATE",
        data: {
          userAddress: userActivity.address,
          streak: userActivity.streak,
          streakLastUpdate: userActivity.streakLastUpdate,
        },
      });
    } else {
      console.log(`⏭️ No streak update needed, updating last update date`);
      userActivity.streakLastUpdate = new Date();
      await userActivity.save();
    }

    // Save the updated user activity
    await userActivity.save();
    console.log(`💾 User activity saved successfully`);
    console.log(`📊 Final userActivity state:`, {
      address: userActivity.address,
      streak: userActivity.streak,
      points: userActivity.points,
      streakLastUpdate: userActivity.streakLastUpdate,
      activitiesCount: userActivity.activitiesList.length,
    });

    // Verify the save by fetching from database
    const verification = await UserActivity.findOne({ address });
    console.log(`🔍 Database verification:`, {
      address: verification?.address,
      streak: verification?.streak,
      points: verification?.points,
      streakLastUpdate: verification?.streakLastUpdate,
      activitiesCount: verification?.activitiesList?.length,
    });

    return {
      userActivity,
      updateStreak,
      oldStreak,
      newStreak: userActivity.streak,
    };
  } catch (error) {
    console.error(`❌ Error updating user streak for ${address}:`, error);
    throw error;
  }
}

module.exports = {
  updateUserStreak,
};
