const UserActivity = require("../models/UserActivity");
const Quest = require("../models/Quest");
const UserQuest = require("../models/UserQuest");
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
 * Creates/updates UserQuest when a signal is accepted
 * @param {string} address - User's wallet address
 * @param {string} signalId - ID of the accepted signal
 */
async function createAcceptedSignalUserQuests(address, signalId) {
  try {
    const allQuests = await Quest.find({
      questType: { $ne: "discord" },
    });

    for (const quest of allQuests) {
      // Only quests of type "acceptedSignals" should be updated
      if (quest.questType === "acceptedSignals") {
        // Check if a UserQuest already exists for this quest and user
        let userQuest = await UserQuest.findOne({
          questId: quest._id,
          address: address,
        });

        if (quest.questEndDate && quest.questEndDate < new Date()) {
          continue;
        }

        if (!userQuest) {
          // If it doesn't exist, create it
          userQuest = new UserQuest({
            questId: quest._id,
            address: address,
            currentProgress: 1,
            isCompleted: false,
            lastProgressUpdate: new Date(),
          });

          console.log(`Created UserQuest for ${address}: ${quest.questName}`);
        } else {
          if (!userQuest.isCompleted) {
            userQuest.currentProgress += 1;
            userQuest.lastProgressUpdate = new Date();

            console.log(
              `Updated UserQuest for ${address}: ${quest.questName} (${userQuest.currentProgress}/${quest.questRequirement})`
            );
          } else {
            console.log(
              `Quest already completed for ${address}: ${quest.questName} - skipping progress update`
            );
            continue;
          }
        }

        // Check if the quest is completed
        if (
          userQuest.currentProgress >= quest.questRequirement &&
          !userQuest.isCompleted
        ) {
          userQuest.isCompleted = true;
          userQuest.completedAt = new Date();

          console.log(`🎉 User ${address} completed quest: ${quest.questName}`);
        }

        await userQuest.save();
      } else {
        const existingUserQuest = await UserQuest.findOne({
          questId: quest._id,
          address: address,
        });

        if (!existingUserQuest) {
          const userQuest = new UserQuest({
            questId: quest._id,
            address: address,
            currentProgress: 0,
            isCompleted: false,
            lastProgressUpdate: new Date(),
          });

          await userQuest.save();
          console.log(
            `Created UserQuest placeholder for ${address}: ${quest.questName}`
          );
        }
      }
    }
  } catch (error) {
    console.error("Error creating/updating UserQuests:", error);
  }
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

async function awardDiscordConnectionPoints(address) {
  const userActivity = await UserActivity.findOne({
    address: address.toLowerCase(),
  });

  const DISCORD_CONNECTION_POINTS = 50;

  if (!userActivity) {
    throw new Error("User activity not found");
  }

  const totalPoints = userActivity.points + DISCORD_CONNECTION_POINTS;
  userActivity.points += DISCORD_CONNECTION_POINTS;
  userActivity.activitiesList.push({
    name: "Discord Connected",
    points: DISCORD_CONNECTION_POINTS,
    date: new Date(),
  });
  await userActivity.save();
  await trackOnDiscordXpGained(
    "Discord Connected",
    address,
    DISCORD_CONNECTION_POINTS,
    totalPoints
  );
}

module.exports = {
  awardRefuseSignalPoints,
  createAcceptedSignalUserQuests,
  trackOnDiscordXpGained,
  awardDiscordConnectionPoints,
};
