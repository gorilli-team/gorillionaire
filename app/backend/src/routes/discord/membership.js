require("dotenv").config();
const express = require("express");
const router = express.Router();
const { trackOnDiscordXpGained } = require("../../controllers/points");
const Quest = require("../../models/Quest");
const UserQuest = require("../../models/UserQuest");
const UserActivity = require("../../models/UserActivity");
const { updateUserStreak } = require("../../utils/streakUtils");

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const DISCORD_REDIRECT_URI = process.env.DISCORD_REDIRECT_URI;
const GORILLIONAIRE_GUILD_ID = process.env.GORILLIONAIRE_GUILD_ID;

router.post("/verify", async (req, res) => {
  const { code, address } = req.body;

  if (!code) {
    return res.status(400).json({ error: "Authorization code is missing" });
  }

  try {
    const params = new URLSearchParams();
    params.append("client_id", DISCORD_CLIENT_ID);
    params.append("client_secret", DISCORD_CLIENT_SECRET);
    params.append("grant_type", "authorization_code");
    params.append("code", code);
    params.append("redirect_uri", DISCORD_REDIRECT_URI);

    const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      return res
        .status(500)
        .json({ error: `Token exchange failed: ${errorText}` });
    }

    const tokenData = await tokenResponse.json();
    const { access_token } = tokenData;

    const userResponse = await fetch("https://discord.com/api/v10/users/@me", {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    if (!userResponse.ok) {
      console.error("Failed to get Discord user data");
      return res.status(500).json({ error: "Failed to get user data" });
    }

    const discordUser = await userResponse.json();

    const isMember = await checkDiscordGuildMembership(
      access_token,
      GORILLIONAIRE_GUILD_ID
    );

    if (isMember) {
      try {
        await UserActivity.findOneAndUpdate(
          { address: { $in: [address, address.toLowerCase()] } },
          {
            discordUsername: discordUser.username,
          },
          { upsert: true, new: true }
        );
      } catch (activityError) {
        console.error(
          "Error updating Discord username in UserActivity:",
          activityError
        );
      }

      try {
        const discordQuest = await Quest.findOne({ questType: "discord" });

        if (!discordQuest) {
          console.error("Discord quest not found in database!");
          return res
            .status(500)
            .json({ error: "Discord quest not configured" });
        }

        const existingUserQuest = await UserQuest.findOne({
          questId: discordQuest._id,
          address: address,
          isCompleted: true,
        });

        if (existingUserQuest) {
          console.log(
            `User ${address} already completed Discord quest at ${existingUserQuest.completedAt}`
          );
          return res.json({
            isMember: true,
            address: address,
            discordUsername: discordUser.username,
            alreadyCompleted: true,
          });
        }

        //Autoclaim
        const userQuest = await UserQuest.findOneAndUpdate(
          {
            questId: discordQuest._id,
            address: address,
          },
          {
            isCompleted: true,
            completedAt: new Date(),
            claimedAt: new Date(),
          },
          { upsert: true, new: true }
        );

        const userActivity = await UserActivity.findOne({
          address: { $in: [address, address.toLowerCase()] },
        });

        if (userActivity) {
          const rewardPoints = discordQuest.questRewardAmount;
          userActivity.points += rewardPoints;

          userActivity.activitiesList.push({
            name: `Quest Completed: ${discordQuest.questName}`,
            points: rewardPoints,
            date: new Date(),
            questId: discordQuest._id,
          });

          // Update streak when activity is added
          await updateUserStreak(address, `Quest Completed: ${discordQuest.questName}`, rewardPoints);

          await userActivity.save();

          await trackOnDiscordXpGained(
            `Quest Completed: ${discordQuest.questName}`,
            address,
            rewardPoints,
            userActivity.points
          );
        }
      } catch (questError) {
        console.error("Error handling Discord quest:", questError);
      }

      // Return success response
      return res.json({
        isMember: true,
        address: address,
        discordUsername: discordUser.username,
      });
    } else {
      return res.status(400).json({
        error: "not_member",
        message:
          "You are not part of the Discord server. Join the server by clicking 'Connect Discord' first.",
        isMember: false,
        address: address,
        discordUsername: null,
      });
    }
  } catch (error) {
    console.error("Token exchange error:", error);
    return res
      .status(500)
      .json({ error: "Internal server error during token exchange" });
  }
});

async function checkDiscordGuildMembership(accessToken, guildId) {
  if (!accessToken) {
    throw new Error("Missing access token");
  }
  if (!guildId) {
    throw new Error("Missing guild ID");
  }

  const response = await fetch("https://discord.com/api/v10/users/@me/guilds", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const err = await response.json();
    const message = err.message || "Failed to retrieve guilds";
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  const guilds = await response.json();
  return guilds.some((guild) => guild.id === guildId);
}

router.get("/username/:address", async (req, res) => {
  const { address } = req.params;

  try {
    const userActivity = await UserActivity.findOne({ address: address });

    if (userActivity && userActivity.discordUsername) {
      return res.json({
        username: userActivity.discordUsername,
      });
    }

    return res.json({ username: null });
  } catch (error) {
    console.error("Error getting Discord username:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/status/:address", async (req, res) => {
  const { address } = req.params;

  try {
    const discordQuest = await Quest.findOne({ questType: "discord" });

    if (!discordQuest) {
      return res.json({
        hasCompletedQuest: false,
        questExists: false,
        username: null,
      });
    }

    const userQuest = await UserQuest.findOne({
      questId: discordQuest._id,
      address: { $in: [address, address.toLowerCase()] },
      isCompleted: true,
    });

    const userActivity = await UserActivity.findOne({
      address: { $in: [address, address.toLowerCase()] },
    });

    const discordUsername = userActivity?.discordUsername || null;

    if (userQuest) {
      return res.json({
        hasCompletedQuest: true,
        questExists: true,
        completedAt: userQuest.completedAt,
        username: discordUsername,
      });
    }

    return res.json({
      hasCompletedQuest: false,
      questExists: true,
      username: discordUsername,
    });
  } catch (error) {
    console.error("Error checking Discord quest status:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
