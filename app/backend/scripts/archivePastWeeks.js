const mongoose = require("mongoose");
const WeeklyLeaderboardService = require("../src/services/WeeklyLeaderboardService");
require("dotenv").config();

async function archivePastWeeks() {
  try {
    console.log("Connecting to MongoDB...");

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

    console.log("Connected to MongoDB successfully");

    // Archive past weeks
    console.log("Starting to archive past weeks...");
    const archivedWeeks = await WeeklyLeaderboardService.archivePastWeeks();

    console.log(`Successfully archived ${archivedWeeks.length} weeks:`);
    archivedWeeks.forEach((week, index) => {
      console.log(
        `${index + 1}. Week ${week.weekNumber} (${week.year}) - ${
          week.totalParticipants
        } participants`
      );
    });

    // Also try to archive current week if it's over
    if (WeeklyLeaderboardService.isWeekOver()) {
      console.log("Current week is over, archiving...");
      const currentWeek = await WeeklyLeaderboardService.archiveCurrentWeek();
      if (currentWeek) {
        console.log(
          `Current week archived: Week ${currentWeek.weekNumber} (${currentWeek.year})`
        );
      }
    }

    console.log("Archive process completed successfully");
  } catch (error) {
    console.error("Error archiving past weeks:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
    process.exit(0);
  }
}

// Run the script
archivePastWeeks();
