const UserActivity = require("../models/UserActivity");
const { WebhookClient } = require("discord.js");
const { defineChain, createPublicClient, http } = require("viem");
const { NNS } = require("@nadnameservice/nns-viem-sdk");

async function awardRefuseSignalPoints(address, signalId) {
  const userActivity = await UserActivity.findOne({
    address: address.toLowerCase(),
  });

  if (!userActivity) {
    throw new Error("User activity not found");
  }

  const totalPoints = userActivity.points + 5;
  userActivity.points += 5;
  userActivity.activitiesList.push({
    name: "Signal Refused",
    points: 5,
    date: new Date(),
    signalId: signalId,
  });
  await userActivity.save();
  await trackOnDiscordXpGained("Signal Refused", address, 5, totalPoints);
}

/**
 * Sends a message to a Discord channel when a user gains XP
 * @param {string} address - The wallet address or user identifier
 * @param {number} points - The amount of XP points gained
 * @returns {Promise<void>} - A promise that resolves when the message is sent
 */

const monadChain = defineChain({
  id: 10143,
  name: "Monad testnet",
  network: "monad",
  nativeCurrency: {
    decimals: 18,
    name: "Monad",
    symbol: "MON",
  },
  rpcUrls: {
    default: {
      http: ["https://testnet-rpc.monad.xyz"],
    },
    public: {
      http: ["https://testnet-rpc.monad.xyz"],
    },
  },
  blockExplorers: {
    default: {
      name: "MonadExplorer",
      url: "https://testnet.monadexplorer.com",
    },
  },
});

async function trackOnDiscordXpGained(action, address, points, totalPoints) {
  try {
    // Discord webhook URL (store this securely in environment variables)
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    const webhook = new WebhookClient({ url: webhookUrl });

    //I want to get the nad domain
    // Get NNS profile for the current user
    const viemClient = createPublicClient({
      chain: monadChain,
      transport: http(),
    });
    const nnsClient = new NNS(viemClient);
    const nadProfile = await nnsClient.getProfiles([address]);

    // Send a simple message to the Discord channel
    await webhook.send({
      content: `🦍 ${action}: \`${
        nadProfile && nadProfile[0].primaryName
          ? nadProfile[0].primaryName
          : address
      }\` earned \`${points}\` points (Total: \`${totalPoints}\`), check profile at https://app.gorillionai.re/users/${address} `,
    });
  } catch (error) {
    console.error("Discord notification error:", error);
  }
}

module.exports = {
  awardRefuseSignalPoints,
  trackOnDiscordXpGained,
};
