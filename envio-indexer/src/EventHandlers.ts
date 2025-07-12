/*
 * Please refer to https://docs.envio.dev for a thorough guide on all Envio indexer features
 */
import {
  Chog,
  Chog_Transfer,
  Moyaki,
  Moyaki_Transfer,
  Molandak,
  Molandak_Transfer,
} from "generated";
import sendTelegramNotification from "./services/telegram";
import { TransferTracker } from "./utils/TransferTracker";

const CHOG_____WHALE_TRANSFER = 100000000000000000000000;
const MOYAKI___WHALE_TRANSFER = 1000000000000000000000000;
const MOLANDAK_WHALE_TRANSFER = 10000000000000000000000;
const CHOG_ADDRESS = "0xE0590015A873bF326bd645c3E1266d4db41C4E6B";
const MOLANDAK_ADDRESS = "0x0F0BDEbF0F83cD1EE3974779Bcb7315f9808c714";
const MOYAKI_ADDRESS = "0xfe140e1dCe99Be9F4F15d657CD9b7BF622270C50";

// Initialize trackers for each token
const chogTracker = new TransferTracker("CHOG");
const moyakiTracker = new TransferTracker("MOYAKI");
const molandakTracker = new TransferTracker("MOLANDAK");

let trackedTransfersChog = 0;
let trackedTransfersMoyaki = 0;
let trackedTransfersMolandak = 0;

// Helper function to format transfer message
const formatTransferMessage = (
  event: any,
  formattedAmount: string,
  tokenSymbol: string,
  emoji: string
): string => {
  const timestamp = new Date(
    Number(event.block.timestamp) * 1000
  ).toUTCString();
  const blockExplorerUrl = `https://testnet.monadexplorer.com/block/${event.block.number}`;
  const txExplorerUrl = `https://testnet.monadexplorer.com/tx/${event.transaction.hash}`;

  return (
    `${emoji} <b>Large ${tokenSymbol} Token Transfer Alert</b> 💸\n\n` +
    `<b>From:</b> ${event.params.from}\n` +
    `<b>To:</b> ${event.params.to}\n` +
    `<b>Amount:</b> ${formattedAmount} $${tokenSymbol}\n` +
    `<b>Tx:</b> <a href="${txExplorerUrl}">${event.transaction.hash}</a>\n` +
    `<b>Block:</b> <a href="${blockExplorerUrl}">${event.block.number}</a>\n` +
    `<b>Time:</b> ${timestamp}`
  );
};

Chog.Transfer.handler(async ({ event, context }) => {
  // Track all transfers, not just whale transfers
  const entity: Chog_Transfer = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    from: event.params.from,
    to: event.params.to,
    value: event.params.value,
    blockNumber: BigInt(event.block.number),
    blockTimestamp: BigInt(event.block.timestamp),
    transactionHash: event.transaction.hash,
  };

  // Track the transfer
  chogTracker.trackTransfer(event, "CHOG", "Chog", 18, CHOG_ADDRESS);
  const stats = chogTracker.getStats();

  // Only proceed with whale transfer handling if threshold is met
  if (event.params.value > CHOG_____WHALE_TRANSFER) {
    try {
      const response = await fetch(
        `${process.env.ENVIO_API_BASE_URL}/events/transfers`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": process.env.ENVIO_BACKEND_API_KEY || "",
          },
          body: JSON.stringify({
            fromAddress: entity.from,
            toAddress: entity.to,
            amount: entity.value.toString(),
            blockNumber: entity.blockNumber.toString(),
            blockTimestamp: entity.blockTimestamp.toString(),
            transactionHash: entity.transactionHash,
            tokenSymbol: "CHOG",
            tokenName: "Chog",
            tokenDecimals: 18,
            tokenAddress: CHOG_ADDRESS,
            thisHourTransfers: stats.transfersPerHour,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `Failed to store transfer: ${response.status} - ${errorText}`
        );
      } else if (response.status === 200) {
        console.log("Transfer already exists");
      } else if (response.status === 201) {
        const formattedAmount = (
          Number(event.params.value) / 1e18
        ).toLocaleString();
        const message = formatTransferMessage(
          event,
          formattedAmount,
          "CHOG",
          "🐸"
        );
        if (new Date(event.block.timestamp) < new Date(Date.now() - 3600000)) {
          await sendTelegramNotification(message);
        }

        console.log("Transfer stored successfully");
      }
    } catch (error) {
      console.error("Failed to track transfer:", error);
    }

    context.Chog_Transfer.set(entity);
  }
});

Molandak.Transfer.handler(async ({ event, context }) => {
  // Track all transfers, not just whale transfers
  const entity: Molandak_Transfer = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    from: event.params.from,
    to: event.params.to,
    value: event.params.value,
    blockNumber: BigInt(event.block.number),
    blockTimestamp: BigInt(event.block.timestamp),
    transactionHash: event.transaction.hash,
  };

  // Track the transfer
  molandakTracker.trackTransfer(
    event,
    "MOLANDAK",
    "Molandak",
    18,
    MOLANDAK_ADDRESS
  );
  const stats = molandakTracker.getStats();

  if (event.params.value > MOLANDAK_WHALE_TRANSFER) {
    try {
      // Store the transfer in the database via a POST request to the backend
      const response = await fetch(
        `${process.env.ENVIO_API_BASE_URL}/events/transfers`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": process.env.ENVIO_BACKEND_API_KEY || "",
          },
          body: JSON.stringify({
            fromAddress: entity.from,
            toAddress: entity.to,
            amount: entity.value.toString(),
            blockNumber: entity.blockNumber.toString(),
            blockTimestamp: entity.blockTimestamp.toString(),
            transactionHash: entity.transactionHash,
            tokenSymbol: "DAK",
            tokenName: "Molandak",
            tokenDecimals: 18,
            tokenAddress: MOLANDAK_ADDRESS,
            thisHourTransfers: stats.transfersPerHour,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `Failed to store transfer: ${response.status} - ${errorText}`
        );
      } else if (response.status === 200) {
        console.log("Transfer already exists");
      } else if (response.status === 201) {
        // Send telegram notification
        const formattedAmount = (
          Number(event.params.value) / 1e18
        ).toLocaleString();
        const message = formatTransferMessage(
          event,
          formattedAmount,
          "MOLANDAK",
          "🦊"
        );
        if (new Date(event.block.timestamp) < new Date(Date.now() - 3600000)) {
          await sendTelegramNotification(message);
        }

        console.log("Transfer stored successfully");
      }
    } catch (error) {
      console.error("Failed to track transfer:", error);
    }

    context.Molandak_Transfer.set(entity);
  }
});

Moyaki.Transfer.handler(async ({ event, context }) => {
  // Track all transfers, not just whale transfers
  const entity: Moyaki_Transfer = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    from: event.params.from,
    to: event.params.to,
    value: event.params.value,
    blockNumber: BigInt(event.block.number),
    blockTimestamp: BigInt(event.block.timestamp),
    transactionHash: event.transaction.hash,
  };

  // Track the transfer
  moyakiTracker.trackTransfer(event, "MOYAKI", "Moyaki", 18, MOYAKI_ADDRESS);
  const stats = moyakiTracker.getStats();

  if (event.params.value > MOYAKI___WHALE_TRANSFER) {
    try {
      // Store the transfer in the database via a POST request to the backend
      const response = await fetch(
        `${process.env.ENVIO_API_BASE_URL}/events/transfers`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": process.env.ENVIO_BACKEND_API_KEY || "",
          },
          body: JSON.stringify({
            fromAddress: entity.from,
            toAddress: entity.to,
            amount: entity.value.toString(),
            blockNumber: entity.blockNumber.toString(),
            blockTimestamp: entity.blockTimestamp.toString(),
            transactionHash: entity.transactionHash,
            tokenSymbol: "YAKI",
            tokenName: "Moyaki",
            tokenDecimals: 18,
            tokenAddress: MOYAKI_ADDRESS,
            thisHourTransfers: stats.transfersPerHour,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `Failed to store transfer: ${response.status} - ${errorText}`
        );
      } else if (response.status === 200) {
        console.log("Transfer already exists");
      } else if (response.status === 201) {
        // Send telegram notification
        const formattedAmount = (
          Number(event.params.value) / 1e18
        ).toLocaleString();
        const message = formatTransferMessage(
          event,
          formattedAmount,
          "Moyaki",
          "🌊"
        );

        if (new Date(event.block.timestamp) < new Date(Date.now() - 3600000)) {
          await sendTelegramNotification(message);
        }

        console.log("Transfer stored successfully");
      }
    } catch (error) {
      console.error("Failed to track transfer:", error);
    }

    context.Moyaki_Transfer.set(entity);
  }
});
