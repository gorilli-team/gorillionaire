const UserActivity = require("../models/UserActivity");
const { WebhookClient } = require("discord.js");

async function awardRefuseSignalPoints(address, signalId) {
  const userActivity = await UserActivity.findOne({
    address: address.toLowerCase(),
  });

  if (!userActivity) {
    throw new Error("User activity not found");
  }

  userActivity.points += 5;
  userActivity.activitiesList.push({
    name: "Signal Refused",
    points: 5,
    date: new Date(),
    signalId: signalId,
  });
  await userActivity.save();
  await trackOnDiscordXpGained(address, 5);
}

/**
 * Sends a message to a Discord channel when a user gains XP
 * @param {string} address - The wallet address or user identifier
 * @param {number} points - The amount of XP points gained
 * @returns {Promise<void>} - A promise that resolves when the message is sent
 */

async function trackOnDiscordXpGained(address, points) {
  try {
    // Discord webhook URL (store this securely in environment variables)
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    const webhook = new WebhookClient({ url: webhookUrl });

    console.log("TRACKING XP GAINED:", address, points);

    // Format the address for privacy/readability
    const formattedAddress = `${address.substring(0, 6)}...${address.substring(
      address.length - 4
    )}`;

    // Send a simple message to the Discord channel
    await webhook.send({
      content: `🦍 XP Gained: \`${formattedAddress}\` earned \`${points}\` points`,
    });

    console.log(`Notification sent: ${formattedAddress} gained ${points} XP`);
  } catch (error) {
    console.error("Discord notification error:", error);
  }
}

module.exports = {
  awardRefuseSignalPoints,
  trackOnDiscordXpGained,
};
