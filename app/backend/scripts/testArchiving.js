const mongoose = require("mongoose");
const WeeklyLeaderboardService = require("../src/services/WeeklyLeaderboardService");
require("dotenv").config();

async function testArchiving() {
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

    // Test current week status
    console.log("\n=== Testing Current Week Status ===");
    const now = new Date();
    const { startOfWeek, endOfWeek } =
      WeeklyLeaderboardService.getWeekBoundaries(now);
    const { weekNumber, year } =
      WeeklyLeaderboardService.getWeekInfo(startOfWeek);
    const isWeekOver = WeeklyLeaderboardService.isWeekOver();
    const exists = await WeeklyLeaderboardService.existsForWeek(startOfWeek);

    console.log(`Current date: ${now.toISOString()}`);
    console.log(
      `Week boundaries: ${startOfWeek.toISOString()} to ${endOfWeek.toISOString()}`
    );
    console.log(`Week number: ${weekNumber}, Year: ${year}`);
    console.log(`Is week over: ${isWeekOver}`);
    console.log(`Already archived: ${exists}`);

    // Always archive the previous week for testing
    console.log("\n=== Archiving Previous Week ===");
    const previousWeekDate = new Date(now);
    previousWeekDate.setDate(now.getDate() - 7); // Go back 7 days to get previous week

    console.log(`Current date: ${now.toISOString()}`);
    console.log(`Previous week date: ${previousWeekDate.toISOString()}`);

    try {
      const weekBoundaries =
        WeeklyLeaderboardService.getWeekBoundaries(previousWeekDate);
      console.log("Week boundaries result:", weekBoundaries);

      if (
        !weekBoundaries ||
        !weekBoundaries.startOfWeek ||
        !weekBoundaries.endOfWeek
      ) {
        throw new Error("getWeekBoundaries returned invalid result");
      }

      const { startOfWeek: startOfPreviousWeek, endOfWeek: endOfPreviousWeek } =
        weekBoundaries;
      const weekInfo =
        WeeklyLeaderboardService.getWeekInfo(startOfPreviousWeek);
      console.log("Week info result:", weekInfo);

      if (
        !weekInfo ||
        typeof weekInfo.weekNumber === "undefined" ||
        typeof weekInfo.year === "undefined"
      ) {
        throw new Error("getWeekInfo returned invalid result");
      }

      const { weekNumber: prevWeekNumber, year: prevYear } = weekInfo;

      console.log(
        `Previous week boundaries: ${startOfPreviousWeek.toISOString()} to ${endOfPreviousWeek.toISOString()}`
      );
      console.log(
        `Previous week: ${startOfPreviousWeek.toDateString()} to ${endOfPreviousWeek.toDateString()}`
      );
      console.log(`Previous week number: ${prevWeekNumber}, Year: ${prevYear}`);

      // Compare with current weekly leaderboard API
      console.log("\n=== Comparing with Current Weekly Leaderboard ===");
      try {
        const response = await fetch(
          `${
            process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
          }/activity/track/leaderboard/weekly?page=1&limit=50`
        );
        const currentData = await response.json();

        if (currentData.totalWeeklyPoints) {
          console.log(
            `Current weekly leaderboard total points: ${currentData.totalWeeklyPoints}`
          );
          console.log(`Expected total points: 27,944`);
          console.log(`Difference: ${currentData.totalWeeklyPoints - 27944}`);
        }

        if (currentData.users && currentData.users.length > 0) {
          console.log("Top 3 users from current leaderboard:");
          currentData.users.slice(0, 3).forEach((user, index) => {
            console.log(
              `${index + 1}. ${user.address} - ${user.points} points`
            );
          });
        }
      } catch (apiError) {
        console.log(
          "Could not fetch current weekly leaderboard for comparison"
        );
      }

      const prevWeekExists = await WeeklyLeaderboardService.existsForWeek(
        startOfPreviousWeek
      );
      console.log(`Previous week already archived: ${prevWeekExists}`);

      if (!prevWeekExists) {
        console.log("Archiving previous week...");
        const archived = await WeeklyLeaderboardService.archiveCurrentWeek(
          previousWeekDate
        );

        if (archived) {
          console.log(
            `✅ Successfully archived week ${archived.weekNumber} (${archived.year})`
          );
          console.log(`- Participants: ${archived.totalParticipants}`);
          console.log(`- Total points: ${archived.totalWeeklyPoints}`);
          console.log(`- Expected total: 27,944`);
          console.log(`- Difference: ${archived.totalWeeklyPoints - 27944}`);
          console.log(`- Raffle winners: ${archived.raffleWinners.length}`);

          if (archived.leaderboard.length > 0) {
            console.log("- Top 3 users:");
            archived.leaderboard.slice(0, 3).forEach((user, index) => {
              console.log(
                `  ${index + 1}. ${user.address} - ${
                  user.weeklyPoints
                } points (${user.winningChances}% chance)`
              );
            });
          }
        } else {
          console.log("❌ No data to archive for previous week");
        }
      } else {
        console.log("Previous week already archived, retrieving data...");
        const archived = await WeeklyLeaderboardService.getArchivedLeaderboard(
          prevWeekNumber,
          prevYear
        );
        console.log(
          `✅ Retrieved archived week ${archived.weekNumber} (${archived.year})`
        );
        console.log(`- Participants: ${archived.totalParticipants}`);
        console.log(`- Total points: ${archived.totalWeeklyPoints}`);
        console.log(`- Expected total: 27,944`);
        console.log(`- Difference: ${archived.totalWeeklyPoints - 27944}`);
        console.log(`- Raffle winners: ${archived.raffleWinners.length}`);
      }
    } catch (error) {
      console.error("Error in archiving section:", error);
      console.error("Error details:", error.message);
      console.error("Stack trace:", error.stack);
    }

    // Test getting all archived leaderboards
    console.log("\n=== Testing Archived Leaderboards ===");
    const archivedResult =
      await WeeklyLeaderboardService.getAllArchivedLeaderboards(1, 5);
    console.log(`Total archived weeks: ${archivedResult.pagination.total}`);
    console.log("First 5 archived weeks:");
    archivedResult.leaderboards.forEach((week, index) => {
      console.log(
        `${index + 1}. Week ${week.weekNumber} (${week.year}) - ${
          week.totalParticipants
        } participants, ${week.totalWeeklyPoints} total points`
      );
    });

    // Test getting a specific week if any exist
    if (archivedResult.leaderboards.length > 0) {
      const firstWeek = archivedResult.leaderboards[0];
      console.log("\n=== Testing Specific Week Retrieval ===");
      const specificWeek =
        await WeeklyLeaderboardService.getArchivedLeaderboard(
          firstWeek.weekNumber,
          firstWeek.year
        );
      console.log(
        `Retrieved week ${specificWeek.weekNumber} (${specificWeek.year}):`
      );
      console.log(`- Participants: ${specificWeek.totalParticipants}`);
      console.log(`- Total points: ${specificWeek.totalWeeklyPoints}`);
      console.log("- Top 3 users:");
      specificWeek.leaderboard.slice(0, 3).forEach((user, index) => {
        console.log(
          `  ${index + 1}. ${user.address} - ${user.weeklyPoints} points (${
            user.winningChances
          }% chance)`
        );
      });
    }

    // Test user history if any archived weeks exist
    if (archivedResult.leaderboards.length > 0) {
      console.log("\n=== Testing User History ===");
      const firstUser = archivedResult.leaderboards[0].leaderboard[0];
      if (firstUser) {
        const userHistory = await WeeklyLeaderboardService.getUserHistory(
          firstUser.address,
          1,
          5
        );
        console.log(`History for ${firstUser.address}:`);
        console.log(
          `Total weeks participated: ${userHistory.pagination.total}`
        );
        userHistory.userHistory.forEach((entry, index) => {
          console.log(
            `${index + 1}. Week ${entry.weekNumber} (${entry.year}) - Rank ${
              entry.rank
            }, ${entry.weeklyPoints} points`
          );
        });
      }
    }

    console.log("\n=== Test Completed Successfully ===");
  } catch (error) {
    console.error("Error during testing:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
    process.exit(0);
  }
}

// Run the test
testArchiving();
