const UserActivity = require("../models/UserActivity");
const { broadcastNotification } = require("../websocket");

// Configuration constants
const STREAK_CONFIG = {
  XP_MULTIPLIER: 10,
  GRACE_PERIOD_HOURS: 6, // Allow 6 hours past midnight for "yesterday's" activity
  MAX_STREAK_BONUS_DAYS: 365, // Cap streak bonus to prevent overflow
};

/**
 * Validates input parameters
 * @param {string} address - User's wallet address
 * @param {string} activityName - Name of the activity
 * @param {number} points - Points for the activity
 * @returns {Object} - Validation result
 */
function validateInputs(address, activityName, points) {
  const errors = [];

  if (!address || typeof address !== "string" || address.trim().length === 0) {
    errors.push("Invalid address: must be a non-empty string");
  }

  if (
    !activityName ||
    typeof activityName !== "string" ||
    activityName.trim().length === 0
  ) {
    errors.push("Invalid activityName: must be a non-empty string");
  }

  if (typeof points !== "number" || points < 0 || !Number.isFinite(points)) {
    errors.push("Invalid points: must be a non-negative finite number");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Normalizes date to start of day in UTC
 * @param {Date} date - Date to normalize
 * @returns {Date} - Normalized date
 */
function normalizeToStartOfDay(date = new Date()) {
  const normalized = new Date(date);
  normalized.setUTCHours(0, 0, 0, 0);
  return normalized;
}

/**
 * Determines streak status based on dates
 * @param {Date|null} lastUpdate - Last update date (normalized)
 * @param {Date} today - Today's date (normalized)
 * @returns {Object} - Streak status
 */
function determineStreakStatus(lastUpdate, today) {
  if (!lastUpdate) {
    return { type: "FIRST_TIME", shouldUpdate: true };
  }

  const timeDiff = today.getTime() - lastUpdate.getTime();
  const daysDiff = timeDiff / (24 * 60 * 60 * 1000);

  if (daysDiff === 0) {
    return { type: "SAME_DAY", shouldUpdate: false };
  } else if (daysDiff === 1) {
    return { type: "CONSECUTIVE", shouldUpdate: true };
  } else if (daysDiff <= 1 + STREAK_CONFIG.GRACE_PERIOD_HOURS / 24) {
    // Allow grace period for timezone differences and late activity
    return { type: "GRACE_PERIOD", shouldUpdate: true };
  } else {
    return { type: "RESET", shouldUpdate: true };
  }
}

/**
 * Calculates streak XP based on current streak
 * @param {number} streak - Current streak count
 * @returns {number} - XP to award
 */
function calculateStreakXP(streak) {
  const cappedStreak = Math.min(streak, STREAK_CONFIG.MAX_STREAK_BONUS_DAYS);
  return cappedStreak * STREAK_CONFIG.XP_MULTIPLIER;
}

/**
 * Updates user streak and adds XP rewards with proper concurrency handling
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
  // Validate inputs
  const validation = validateInputs(address, activityName, points);
  if (!validation.isValid) {
    const error = new Error(
      `Input validation failed: ${validation.errors.join(", ")}`
    );
    error.name = "ValidationError";
    throw error;
  }

  // Normalize address to lowercase for consistency
  const normalizedAddress = address.toLowerCase().trim();
  console.log(`🔄 Updating streak for address: ${normalizedAddress}`);
  console.log(`📝 Activity: ${activityName}, Base points: ${points}`);

  // Get normalized today date
  const today = normalizeToStartOfDay();
  console.log(`📅 Today (normalized): ${today.toISOString()}`);

  let session;
  try {
    // Start a database session for atomic operations
    session = await UserActivity.startSession();

    return await session.withTransaction(async () => {
      // Find user with session for atomic read-write
      let userActivity = await UserActivity.findOne({
        address: normalizedAddress,
      }).session(session);

      if (!userActivity) {
        console.log(
          `👤 Creating new user activity for address: ${normalizedAddress}`
        );
        userActivity = new UserActivity({
          address: normalizedAddress,
          points: 0,
          streak: 0,
          streakLastUpdate: null,
          activitiesList: [],
        });
      }

      // Get last update date normalized to start of day
      const lastUpdateNormalized = userActivity.streakLastUpdate
        ? normalizeToStartOfDay(userActivity.streakLastUpdate)
        : null;

      console.log(
        `📅 Last update (normalized): ${
          lastUpdateNormalized?.toISOString() || "None"
        }`
      );
      console.log(`🔥 Current streak: ${userActivity.streak}`);

      // Determine streak status
      const streakStatus = determineStreakStatus(lastUpdateNormalized, today);
      console.log(`📊 Streak status: ${streakStatus.type}`);

      let oldStreak = userActivity.streak;
      let streakChanged = false;

      // Update streak based on status
      switch (streakStatus.type) {
        case "FIRST_TIME":
          console.log(`🎯 First time user, starting streak`);
          userActivity.streak = 1;
          streakChanged = true;
          break;

        case "CONSECUTIVE":
        case "GRACE_PERIOD":
          console.log(`🔥 Consecutive day activity, extending streak`);
          userActivity.streak += 1;
          streakChanged = true;
          break;

        case "RESET":
          console.log(`💔 Gap in streak detected, resetting to 1`);
          userActivity.streak = 1;
          streakChanged = true;
          break;

        case "SAME_DAY":
          console.log(`✅ Additional activity today, no streak change`);
          streakChanged = false;
          break;
      }

      // Always update streakLastUpdate when there's activity
      if (streakStatus.shouldUpdate || streakStatus.type === "SAME_DAY") {
        userActivity.streakLastUpdate = today;
      }

      // Add the base activity (always recorded)
      const baseActivity = {
        name: activityName,
        points: points,
        date: new Date(),
        ...metadata,
      };

      userActivity.points += points;
      userActivity.activitiesList.push(baseActivity);
      console.log(
        `➕ Added base activity: ${activityName} (+${points} points)`
      );

      // Add streak bonus if streak was updated
      let streakXp = 0;
      if (streakChanged) {
        console.log(
          `🔄 Streak updated from ${oldStreak} to ${userActivity.streak}`
        );

        streakXp = calculateStreakXP(userActivity.streak);
        userActivity.points += streakXp;

        const streakActivity = {
          name: `Streak extended to ${userActivity.streak} 🔥`,
          points: streakXp,
          date: new Date(),
          type: "streak_bonus",
        };

        userActivity.activitiesList.push(streakActivity);
        console.log(
          `🎉 Awarded ${streakXp} XP for ${userActivity.streak}-day streak`
        );
      }

      // Save the updated user activity (atomic within transaction)
      await userActivity.save({ session });
      console.log(`💾 User activity saved successfully`);

      const result = {
        userActivity: {
          address: userActivity.address,
          streak: userActivity.streak,
          points: userActivity.points,
          streakLastUpdate: userActivity.streakLastUpdate,
          activitiesCount: userActivity.activitiesList.length,
        },
        streakChanged,
        oldStreak,
        newStreak: userActivity.streak,
        streakXpAwarded: streakXp,
        basePointsAwarded: points,
        streakStatus: streakStatus.type,
      };

      console.log(`📊 Final result:`, result);

      // Broadcast streak update via WebSocket (outside transaction to avoid blocking)
      if (streakChanged) {
        // Note: Broadcasting after transaction commits
        setImmediate(() => {
          broadcastNotification({
            type: "STREAK_UPDATE",
            data: {
              userAddress: normalizedAddress,
              streak: userActivity.streak,
              streakLastUpdate: userActivity.streakLastUpdate,
              streakXpAwarded: streakXp,
              oldStreak,
              newStreak: userActivity.streak,
            },
          });
        });
      }

      return result;
    });
  } catch (error) {
    console.error(`❌ Error updating user streak for ${address}:`, error);

    // Add context to the error
    if (error.name === "ValidationError") {
      throw error; // Re-throw validation errors as-is
    }

    const enhancedError = new Error(
      `Failed to update user streak: ${error.message}`
    );
    enhancedError.originalError = error;
    enhancedError.userAddress = normalizedAddress;
    throw enhancedError;
  } finally {
    // Clean up session
    if (session) {
      await session.endSession();
    }
  }
}

module.exports = {
  updateUserStreak,
  // Export for testing
  validateInputs,
  normalizeToStartOfDay,
  determineStreakStatus,
  calculateStreakXP,
  STREAK_CONFIG,
};
