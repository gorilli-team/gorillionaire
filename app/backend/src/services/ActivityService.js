const UserActivity = require("../models/UserActivity");
const Activity = require("../models/Activity");

// Feature flag to control which collection to use
// Set to true to use the new Activity collection, false to use UserActivity.activitiesList
const USE_NEW_ACTIVITY_COLLECTION =
  process.env.USE_NEW_ACTIVITY_COLLECTION === "true";

class ActivityService {
  /**
   * Add a new activity for a user
   */
  static async addActivity(userAddress, activityData) {
    const activity = {
      userAddress: userAddress.toLowerCase(),
      name: activityData.name,
      points: activityData.points,
      date: activityData.date || new Date(),
      intentId: activityData.intentId,
      txHash: activityData.txHash,
      signalId: activityData.signalId,
      referredUserAddress: activityData.referredUserAddress,
      originalTradePoints: activityData.originalTradePoints,
      referralId: activityData.referralId,
      activityType: this.getActivityType(activityData.name),
      metadata: activityData.metadata || {},
    };

    if (USE_NEW_ACTIVITY_COLLECTION) {
      // Use new Activity collection
      const newActivity = new Activity(activity);
      await newActivity.save();
      return newActivity;
    } else {
      // Use old UserActivity.activitiesList
      const userActivity = await UserActivity.findOne({
        address: userAddress.toLowerCase(),
      });
      if (!userActivity) {
        throw new Error("User activity not found");
      }

      userActivity.activitiesList.push(activity);
      await userActivity.save();
      return activity;
    }
  }

  /**
   * Get activities for a user with pagination
   */
  static async getUserActivities(userAddress, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    if (USE_NEW_ACTIVITY_COLLECTION) {
      // Use new Activity collection
      const [activities, total] = await Promise.all([
        Activity.find({ userAddress: userAddress.toLowerCase() })
          .sort({ date: -1 })
          .skip(skip)
          .limit(limit)
          .populate("intentId")
          .populate("signalId"),
        Activity.countDocuments({ userAddress: userAddress.toLowerCase() }),
      ]);

      return {
        activities,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } else {
      // Use old UserActivity.activitiesList
      const userActivity = await UserActivity.findOne(
        { address: userAddress.toLowerCase() },
        { activitiesList: 1 }
      ).populate("activitiesList.intentId");

      if (!userActivity) {
        return {
          activities: [],
          pagination: {
            total: 0,
            page,
            limit,
            totalPages: 0,
          },
        };
      }

      const sortedActivities = userActivity.activitiesList.sort(
        (a, b) => new Date(b.date) - new Date(a.date)
      );

      const activities = sortedActivities.slice(skip, skip + limit);
      const total = userActivity.activitiesList.length;

      return {
        activities,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    }
  }

  /**
   * Get weekly activities for a user
   */
  static async getWeeklyActivities(userAddress, startOfWeek) {
    if (USE_NEW_ACTIVITY_COLLECTION) {
      // Use new Activity collection
      const activities = await Activity.find({
        userAddress: userAddress.toLowerCase(),
        date: { $gte: startOfWeek },
        name: { $ne: "Account Connected" },
      }).sort({ date: -1 });

      return activities;
    } else {
      // Use old UserActivity.activitiesList
      const userActivity = await UserActivity.findOne({
        address: userAddress.toLowerCase(),
      });
      if (!userActivity) return [];

      return userActivity.activitiesList.filter(
        (activity) =>
          new Date(activity.date) >= startOfWeek &&
          activity.name !== "Account Connected"
      );
    }
  }

  /**
   * Get weekly leaderboard data
   */
  static async getWeeklyLeaderboard(startOfWeek, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    if (USE_NEW_ACTIVITY_COLLECTION) {
      // Use new Activity collection with aggregation
      const pipeline = [
        {
          $match: {
            date: { $gte: startOfWeek },
            name: { $ne: "Account Connected" },
          },
        },
        {
          $group: {
            _id: "$userAddress",
            weeklyPoints: { $sum: "$points" },
            weeklyActivities: { $sum: 1 },
          },
        },
        { $match: { weeklyPoints: { $gt: 0 } } },
        {
          $sort: {
            weeklyPoints: -1,
          },
        },
        {
          $facet: {
            users: [{ $skip: skip }, { $limit: limit }],
            total: [{ $count: "count" }],
          },
        },
      ];

      const result = await Activity.aggregate(pipeline);
      const users = result[0].users || [];
      const total = result[0].total[0]?.count || 0;

      return { users, total };
    } else {
      // Use old UserActivity.activitiesList with aggregation
      const pipeline = [
        { $unwind: "$activitiesList" },
        {
          $match: {
            "activitiesList.date": { $gte: startOfWeek },
            "activitiesList.name": { $ne: "Account Connected" },
          },
        },
        {
          $group: {
            _id: "$address",
            weeklyPoints: { $sum: "$activitiesList.points" },
            weeklyActivities: { $sum: 1 },
          },
        },
        { $match: { weeklyPoints: { $gt: 0 } } },
        {
          $sort: {
            weeklyPoints: -1,
          },
        },
      ];

      const users = await UserActivity.aggregate(pipeline);
      const total = users.length;
      const paginatedUsers = users.slice(skip, skip + limit);

      return { users: paginatedUsers, total };
    }
  }

  /**
   * Get total weekly points across all users
   */
  static async getTotalWeeklyPoints(startOfWeek) {
    if (USE_NEW_ACTIVITY_COLLECTION) {
      const result = await Activity.aggregate([
        {
          $match: {
            date: { $gte: startOfWeek },
            name: { $ne: "Account Connected" },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$points" },
          },
        },
      ]);

      return result[0]?.total || 0;
    } else {
      const result = await UserActivity.aggregate([
        { $unwind: "$activitiesList" },
        {
          $match: {
            "activitiesList.date": { $gte: startOfWeek },
            "activitiesList.name": { $ne: "Account Connected" },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$activitiesList.points" },
          },
        },
      ]);

      return result[0]?.total || 0;
    }
  }

  /**
   * Helper function to determine activity type
   */
  static getActivityType(activityName) {
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
  }

  /**
   * Check if new collection is being used
   */
  static isUsingNewCollection() {
    return USE_NEW_ACTIVITY_COLLECTION;
  }
}

module.exports = ActivityService;
