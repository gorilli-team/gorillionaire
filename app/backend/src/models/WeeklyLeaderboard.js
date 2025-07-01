const mongoose = require("mongoose");

const weeklyLeaderboardSchema = new mongoose.Schema(
  {
    weekStart: {
      type: Date,
      required: true,
      index: true,
    },
    weekEnd: {
      type: Date,
      required: true,
    },
    weekNumber: {
      type: Number,
      required: true,
      index: true,
    },
    year: {
      type: Number,
      required: true,
      index: true,
    },
    totalWeeklyPoints: {
      type: Number,
      default: 0,
    },
    totalParticipants: {
      type: Number,
      default: 0,
    },
    isCompleted: {
      type: Boolean,
      default: true,
    },
    completedAt: {
      type: Date,
      default: Date.now,
    },
    leaderboard: [
      {
        rank: {
          type: Number,
          required: true,
        },
        address: {
          type: String,
          required: true,
        },
        weeklyPoints: {
          type: Number,
          required: true,
        },
        weeklyActivities: {
          type: Number,
          default: 0,
        },
        totalReferred: {
          type: Number,
          default: 0,
        },
        totalReferralPoints: {
          type: Number,
          default: 0,
        },
        createdAt: {
          type: Date,
        },
        discordUsername: {
          type: String,
        },
        // Store NNS profile data if available
        nadName: {
          type: String,
        },
        nadAvatar: {
          type: String,
        },
        // Store winning chances percentage
        winningChances: {
          type: Number,
          default: 0,
        },
      },
    ],
    // Store raffle winners if any
    raffleWinners: [
      {
        address: {
          type: String,
          required: true,
        },
        rank: {
          type: Number,
          required: true,
        },
        weeklyPoints: {
          type: Number,
          required: true,
        },
        prizeAmount: {
          type: Number,
          default: 50, // 50 MON
        },
        nadName: {
          type: String,
        },
      },
    ],
    // Metadata
    metadata: {
      cacheHits: {
        type: Number,
        default: 0,
      },
      cacheMisses: {
        type: Number,
        default: 0,
      },
      totalRequests: {
        type: Number,
        default: 0,
      },
      averageResponseTime: {
        type: Number,
        default: 0,
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound index for efficient queries
weeklyLeaderboardSchema.index({ year: 1, weekNumber: 1 }, { unique: true });
weeklyLeaderboardSchema.index({ weekStart: 1, weekEnd: 1 });

// Virtual for week range display
weeklyLeaderboardSchema.virtual("weekRange").get(function () {
  if (!this.weekStart || !this.weekEnd) return "";
  const start = this.weekStart.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const end = this.weekEnd.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  return `${start} - ${end}`;
});

// Static method to get week number from date
weeklyLeaderboardSchema.statics.getWeekNumber = function (date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return weekNo;
};

// Static method to get week boundaries
weeklyLeaderboardSchema.statics.getWeekBoundaries = function (date) {
  const now = new Date(date);
  const startOfWeek = new Date(now);
  const dayOfWeek = now.getDay();
  const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  startOfWeek.setDate(now.getDate() - daysToSubtract);
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  return { startOfWeek, endOfWeek };
};

module.exports = mongoose.model("WeeklyLeaderboard", weeklyLeaderboardSchema);
