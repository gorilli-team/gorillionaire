const WeeklyLeaderboard = require("../models/WeeklyLeaderboard");
const UserActivity = require("../models/UserActivity");
const Referral = require("../models/Referral");

class WeeklyLeaderboardService {
  /**
   * Check if a week is over (past Sunday 23:59:59)
   */
  static isWeekOver(date = new Date()) {
    const now = new Date(date);
    const { endOfWeek } = this.getWeekBoundaries(now);
    return now > endOfWeek;
  }

  /**
   * Get the week boundaries for a given date
   */
  static getWeekBoundaries(date = new Date()) {
    const now = new Date(date);

    // Create a new date object to avoid mutating the input
    const startOfWeek = new Date(now);
    const dayOfWeek = now.getUTCDay();
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

    // Set to start of week (Monday 00:00:00 UTC)
    startOfWeek.setUTCDate(now.getUTCDate() - daysToSubtract);
    startOfWeek.setUTCHours(0, 0, 0, 0);

    // Set to end of week (Sunday 23:59:59.999 UTC)
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setUTCDate(startOfWeek.getUTCDate() + 6);
    endOfWeek.setUTCHours(23, 59, 59, 999);

    return { startOfWeek, endOfWeek };
  }

  /**
   * Get week number and year for a given date
   */
  static getWeekInfo(date = new Date()) {
    // Calculate ISO week number
    const d = new Date(date);
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(d.getUTCFullYear(), 0, 1);
    const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
    const year = date.getUTCFullYear();
    return { weekNumber: weekNo, year };
  }

  /**
   * Check if a weekly leaderboard already exists for a given week
   */
  static async existsForWeek(weekStart) {
    const { weekNumber, year } = this.getWeekInfo(weekStart);
    const existing = await WeeklyLeaderboard.findOne({ weekNumber, year });
    return !!existing;
  }

  /**
   * Archive the current weekly leaderboard
   */
  static async archiveCurrentWeek(date = new Date()) {
    try {
      const { startOfWeek, endOfWeek } = this.getWeekBoundaries(date);
      const { weekNumber, year } = this.getWeekInfo(startOfWeek);

      // Check if already archived
      const existing = await this.existsForWeek(startOfWeek);
      if (existing) {
        console.log(
          `Weekly leaderboard for week ${weekNumber} (${year}) already archived`
        );
        return existing;
      }

      // Get all users with weekly activity
      const pipeline = [
        { $unwind: "$activitiesList" },
        {
          $match: {
            "activitiesList.date": {
              $gte: startOfWeek,
              $lte: endOfWeek,
            },
            "activitiesList.name": {
              $nin: [
                "Account Connected",
                "Streak Extended",
                "Referral Trade Bonus",
              ],
            },
          },
        },
        {
          $addFields: {
            "activitiesList.weekStart": startOfWeek,
            "activitiesList.weekEnd": endOfWeek,
            "activitiesList.isInWeek": {
              $and: [
                { $gte: ["$activitiesList.date", startOfWeek] },
                { $lte: ["$activitiesList.date", endOfWeek] },
              ],
            },
          },
        },
        {
          $match: {
            "activitiesList.isInWeek": true,
          },
        },
        {
          $group: {
            _id: "$address",
            address: { $first: "$address" },
            weeklyPoints: { $sum: "$activitiesList.points" },
            weeklyActivities: { $sum: 1 },
            createdAt: { $first: "$createdAt" },
            discordUsername: { $first: "$discordUsername" },
            // Debug: show all activities for this user
            allActivities: {
              $push: {
                name: "$activitiesList.name",
                points: "$activitiesList.points",
                date: "$activitiesList.date",
                txHash: "$activitiesList.txHash",
              },
            },
          },
        },
        { $match: { weeklyPoints: { $gt: 0 } } },
        {
          $sort: {
            weeklyPoints: -1,
            createdAt: 1,
          },
        },
      ];

      const users = await UserActivity.aggregate(pipeline);

      if (!users || users.length === 0) {
        console.log(
          `No weekly activity found for week ${weekNumber} (${year})`
        );
        return null;
      }

      // Debug: Show top users and their activities
      console.log(`Found ${users.length} users with weekly activity`);
      console.log(
        `Week boundaries: ${startOfWeek.toISOString()} to ${endOfWeek.toISOString()}`
      );
      console.log("Top 5 users by points:");
      users.slice(0, 5).forEach((user, index) => {
        console.log(
          `${index + 1}. ${user.address} - ${user.weeklyPoints} points (${
            user.weeklyActivities
          } activities)`
        );

        // Show the activities that contributed to this user's points
        if (user.allActivities && user.allActivities.length > 0) {
          console.log(`   Activities:`);
          user.allActivities.forEach((activity, actIndex) => {
            console.log(
              `     ${actIndex + 1}. ${activity.name} - ${
                activity.points
              } points (${activity.date})`
            );
          });
        }
      });

      // Calculate total weekly points
      const totalWeeklyPoints = users.reduce(
        (sum, user) => sum + user.weeklyPoints,
        0
      );

      console.log(`Total weekly points across all users: ${totalWeeklyPoints}`);

      // Get referral data for all users
      const userAddresses = users.map((user) => user.address);
      const referrals = await Referral.find({
        referrerAddress: { $in: userAddresses },
      });

      // Create referral map
      const referralMap = new Map();
      referrals.forEach((referral) => {
        const weeklyReferredUsers = referral.referredUsers.filter(
          (referredUser) => new Date(referredUser.joinedAt) >= startOfWeek
        );

        const weeklyReferralPoints = weeklyReferredUsers.reduce(
          (total, referredUser) => total + (referredUser.pointsEarned || 0),
          0
        );

        referralMap.set(referral.referrerAddress, {
          totalReferred: weeklyReferredUsers.length,
          totalReferralPoints: weeklyReferralPoints,
        });
      });

      // Build leaderboard entries
      const leaderboard = users.map((user, index) => {
        const referralData = referralMap.get(user.address) || {
          totalReferred: 0,
          totalReferralPoints: 0,
        };

        const winningChances =
          totalWeeklyPoints > 0
            ? (user.weeklyPoints / totalWeeklyPoints) * 100
            : 0;

        return {
          rank: index + 1,
          address: user.address,
          weeklyPoints: user.weeklyPoints,
          weeklyActivities: user.weeklyActivities,
          totalReferred: referralData.totalReferred,
          totalReferralPoints: referralData.totalReferralPoints,
          createdAt: user.createdAt,
          discordUsername: user.discordUsername,
          nadName: null, // Will be populated later if needed
          nadAvatar: null, // Will be populated later if needed
          winningChances: Math.round(winningChances * 100) / 100, // Round to 2 decimal places
        };
      });

      // Select raffle winners (top 5 or random selection based on winning chances)
      const raffleWinners = this.selectRaffleWinners(leaderboard);

      // Create the archived leaderboard
      const archivedLeaderboard = new WeeklyLeaderboard({
        weekStart: startOfWeek,
        weekEnd: endOfWeek,
        weekNumber,
        year,
        totalWeeklyPoints,
        totalParticipants: leaderboard.length,
        isCompleted: true,
        completedAt: new Date(),
        leaderboard,
        raffleWinners,
        metadata: {
          cacheHits: 0,
          cacheMisses: 0,
          totalRequests: 0,
          averageResponseTime: 0,
        },
      });

      await archivedLeaderboard.save();

      console.log(
        `Successfully archived weekly leaderboard for week ${weekNumber} (${year}) with ${leaderboard.length} participants`
      );

      return archivedLeaderboard;
    } catch (error) {
      console.error("Error archiving weekly leaderboard:", error);
      throw error;
    }
  }

  /**
   * Select raffle winners based on winning chances
   */
  static selectRaffleWinners(leaderboard, winnerCount = 5) {
    if (leaderboard.length === 0) return [];

    // Simple random selection based on winning chances
    const winners = [];
    const participants = [...leaderboard];

    for (let i = 0; i < Math.min(winnerCount, participants.length); i++) {
      // Calculate total winning chances
      const totalChances = participants.reduce(
        (sum, p) => sum + p.winningChances,
        0
      );

      if (totalChances <= 0) break;

      // Random selection weighted by winning chances
      let random = Math.random() * totalChances;
      let selectedIndex = -1;

      for (let j = 0; j < participants.length; j++) {
        random -= participants[j].winningChances;
        if (random <= 0) {
          selectedIndex = j;
          break;
        }
      }

      if (selectedIndex >= 0) {
        const winner = participants[selectedIndex];
        winners.push({
          address: winner.address,
          rank: winner.rank,
          weeklyPoints: winner.weeklyPoints,
          prizeAmount: 50, // 50 MON
        });

        // Remove selected winner from participants
        participants.splice(selectedIndex, 1);
      }
    }

    return winners;
  }

  /**
   * Get archived leaderboard for a specific week
   */
  static async getArchivedLeaderboard(weekNumber, year) {
    try {
      const leaderboard = await WeeklyLeaderboard.findOne({ weekNumber, year });
      return leaderboard;
    } catch (error) {
      console.error("Error fetching archived leaderboard:", error);
      throw error;
    }
  }

  /**
   * Get all archived leaderboards
   */
  static async getAllArchivedLeaderboards(page = 1, limit = 10) {
    try {
      const skip = (page - 1) * limit;

      const leaderboards = await WeeklyLeaderboard.find()
        .sort({ year: -1, weekNumber: -1 })
        .skip(skip)
        .limit(limit);

      const total = await WeeklyLeaderboard.countDocuments();

      return {
        leaderboards,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error("Error fetching archived leaderboards:", error);
      throw error;
    }
  }

  /**
   * Get user's historical performance across weeks
   */
  static async getUserHistory(address, page = 1, limit = 10) {
    try {
      const skip = (page - 1) * limit;

      const userHistory = await WeeklyLeaderboard.aggregate([
        {
          $unwind: "$leaderboard",
        },
        {
          $match: {
            "leaderboard.address": address.toLowerCase(),
          },
        },
        {
          $project: {
            weekStart: 1,
            weekEnd: 1,
            weekNumber: 1,
            year: 1,
            rank: "$leaderboard.rank",
            weeklyPoints: "$leaderboard.weeklyPoints",
            weeklyActivities: "$leaderboard.weeklyActivities",
            totalReferred: "$leaderboard.totalReferred",
            totalReferralPoints: "$leaderboard.totalReferralPoints",
            winningChances: "$leaderboard.winningChances",
            isWinner: {
              $in: [address.toLowerCase(), "$raffleWinners.address"],
            },
          },
        },
        {
          $sort: { year: -1, weekNumber: -1 },
        },
        {
          $skip: skip,
        },
        {
          $limit: limit,
        },
      ]);

      const total = await WeeklyLeaderboard.aggregate([
        {
          $unwind: "$leaderboard",
        },
        {
          $match: {
            "leaderboard.address": address.toLowerCase(),
          },
        },
        {
          $count: "total",
        },
      ]);

      const totalCount = total.length > 0 ? total[0].total : 0;

      return {
        userHistory,
        pagination: {
          total: totalCount,
          page,
          limit,
          totalPages: Math.ceil(totalCount / limit),
        },
      };
    } catch (error) {
      console.error("Error fetching user history:", error);
      throw error;
    }
  }

  /**
   * Archive all past weeks that haven't been archived yet
   */
  static async archivePastWeeks() {
    try {
      const now = new Date();
      const currentWeekBoundaries = this.getWeekBoundaries(now);

      // Go back up to 52 weeks (1 year) to check for unarchived weeks
      const weeksToCheck = [];
      for (let i = 1; i <= 52; i++) {
        const checkDate = new Date(currentWeekBoundaries.startOfWeek);
        checkDate.setDate(checkDate.getDate() - i * 7);
        weeksToCheck.push(checkDate);
      }

      const archivedWeeks = [];

      for (const weekDate of weeksToCheck) {
        const { startOfWeek } = this.getWeekBoundaries(weekDate);
        const exists = await this.existsForWeek(startOfWeek);

        if (!exists && this.isWeekOver(weekDate)) {
          try {
            const archived = await this.archiveCurrentWeek(weekDate);
            if (archived) {
              archivedWeeks.push(archived);
            }
          } catch (error) {
            console.error(
              `Error archiving week starting ${startOfWeek}:`,
              error
            );
          }
        }
      }

      console.log(`Archived ${archivedWeeks.length} past weeks`);
      return archivedWeeks;
    } catch (error) {
      console.error("Error archiving past weeks:", error);
      throw error;
    }
  }
}

module.exports = WeeklyLeaderboardService;
