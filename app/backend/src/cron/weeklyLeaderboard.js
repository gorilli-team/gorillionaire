const cron = require("node-cron");
const WeeklyLeaderboardService = require("../services/WeeklyLeaderboardService");

// Schedule the job to run every Monday at 00:00 (midnight)
const scheduleWeeklyLeaderboardArchive = () => {
  cron.schedule(
    "0 0 * * 1",
    async () => {
      try {
        console.log(
          "Running weekly leaderboard archive check (Monday 00:00)..."
        );

        // Check if previous week is over and archive it
        const now = new Date();
        const previousWeekDate = new Date(now);
        previousWeekDate.setDate(now.getDate() - 7); // Go back 7 days to get previous week

        console.log("Archiving previous week...");
        const archived = await WeeklyLeaderboardService.archiveCurrentWeek(
          previousWeekDate
        );

        if (archived) {
          console.log(
            `Successfully archived week ${archived.weekNumber} (${archived.year}) with ${archived.totalParticipants} participants`
          );
        } else {
          console.log("No data to archive for previous week");
        }

        // Also check for any other past weeks that might not have been archived
        console.log("Checking for other unarchived past weeks...");
        await WeeklyLeaderboardService.archivePastWeeks();

        console.log("Weekly leaderboard archive check completed");
      } catch (error) {
        console.error("Error in weekly leaderboard archive cron job:", error);
      }
    },
    {
      scheduled: true,
      timezone: "UTC",
    }
  );

  console.log(
    "Weekly leaderboard archive cron job scheduled (runs every Monday at 00:00 UTC)"
  );
};

// Function to manually trigger archive (useful for testing or immediate archiving)
const manualArchive = async () => {
  try {
    console.log("Manually triggering weekly leaderboard archive...");

    if (WeeklyLeaderboardService.isWeekOver()) {
      const archived = await WeeklyLeaderboardService.archiveCurrentWeek();
      if (archived) {
        console.log("Successfully archived current week");
        return archived;
      } else {
        console.log("No data to archive for current week");
        return null;
      }
    } else {
      console.log("Current week is not over yet");
      return null;
    }
  } catch (error) {
    console.error("Error in manual archive:", error);
    throw error;
  }
};

// Function to archive a specific week (useful for backfilling)
const archiveSpecificWeek = async (date) => {
  try {
    console.log(`Manually archiving week for date: ${date}`);

    const { startOfWeek, endOfWeek } =
      WeeklyLeaderboardService.getWeekBoundaries(date);
    const { weekNumber, year } =
      WeeklyLeaderboardService.getWeekInfo(startOfWeek);

    // Check if already archived
    const exists = await WeeklyLeaderboardService.existsForWeek(startOfWeek);
    if (exists) {
      console.log(`Week ${weekNumber} (${year}) already archived`);
      return await WeeklyLeaderboardService.getArchivedLeaderboard(
        weekNumber,
        year
      );
    }

    // Archive the week
    const archived = await WeeklyLeaderboardService.archiveCurrentWeek(date);
    if (archived) {
      console.log(`Successfully archived week ${weekNumber} (${year})`);
      return archived;
    } else {
      console.log(`No data to archive for week ${weekNumber} (${year})`);
      return null;
    }
  } catch (error) {
    console.error("Error archiving specific week:", error);
    throw error;
  }
};

module.exports = {
  scheduleWeeklyLeaderboardArchive,
  manualArchive,
  archiveSpecificWeek,
};
