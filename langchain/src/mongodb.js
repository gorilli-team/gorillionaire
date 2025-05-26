import "dotenv/config";
import { MongoClient } from "mongodb";
import fs from "fs";

const uri = process.env.MONGODB_CONNECTION_STRING;

let client;
let db;

/**
 * Connect to MongoDB database
 * @returns {Promise<Db>} MongoDB database instance
 */
export async function connectDB() {
  if (!client) {
    client = new MongoClient(uri);
    await client.connect();
    db = client.db("signals");
    console.log("Connected to MongoDB database");
  }
  return db;
}

/**
 * Fetch data from MongoDB transfers collection
 * @returns {Promise<string>} Formatted string with transfer data
 */
export async function fetchData() {
  try {
    const db = await connectDB();
    const spikes = db.collection("spikes");
    const transfers = db.collection("transfers");
    const pricedatas = db.collection("pricedatas");

    const oneHourAgoUNIX = Math.floor(Date.now() / 1000) - 60 * 60;
    const oneHourAgoISO = new Date();
    oneHourAgoISO.setUTCHours(oneHourAgoISO.getUTCHours() - 1);

    const spikesDocuments = await spikes
      .find({
        blockTimestamp: {
          $gte: oneHourAgoUNIX,
        },
      })
      .sort({ blockTimestamp: -1 })
      .toArray();

    const transfersDocuments = await transfers
      .find({
        blockTimestamp: {
          $gte: oneHourAgoUNIX,
        },
      })
      .sort({ blockTimestamp: -1 })
      .toArray();

    const pricedatasDocuments = await pricedatas
      .find({
        timestamp: {
          $gte: oneHourAgoISO,
        },
      })
      .sort({ blockTimestamp: -1 })
      .toArray();

    if (
      spikesDocuments.length === 0 &&
      transfersDocuments.length === 0 &&
      pricedatasDocuments.length === 0
    ) {
      return "";
    }

    //merge the two arrays, add type information, and sort them by blockTimestamp
    const mergedDocuments = [
      ...spikesDocuments.map((doc) => ({ ...doc, type: "spike" })),
      ...transfersDocuments.map((doc) => ({ ...doc, type: "transfer" })),
      ...pricedatasDocuments.map((doc) => ({ ...doc, type: "pricedatas" })),
    ].sort((a, b) => a.blockTimestamp - b.blockTimestamp);

    const formattedData = mergedDocuments
      .map((doc) => {
        if (doc.type === "spike") {
          const hourlyTransfers = doc.thisHourTransfers;
          let formattedTransfers;
          if (hourlyTransfers >= 1000000) {
            formattedTransfers = (hourlyTransfers / 1000000).toFixed(1) + "M";
          } else if (hourlyTransfers >= 1000) {
            formattedTransfers = (hourlyTransfers / 1000).toFixed(1) + "K";
          } else {
            formattedTransfers = hourlyTransfers.toFixed(2);
          }
          return `🔥 ${formattedTransfers} transfers of ${doc.tokenSymbol}`;
        } else if (doc.type === "transfer") {
          // Convert to BigInt and divide by 10^18 for proper token amount
          const rawAmount = BigInt(doc.amount);
          const amount = Number(rawAmount) / Math.pow(10, 18);
          let formattedAmount;
          if (amount >= 1000000) {
            formattedAmount = (amount / 1000000).toFixed(1) + "M";
          } else if (amount >= 1000) {
            formattedAmount = (amount / 1000).toFixed(1) + "K";
          } else {
            formattedAmount = amount.toFixed(2);
          }
          return `💸 ${formattedAmount} ${doc.tokenSymbol} transfer`;
        } else if (doc.type === "pricedatas") {
          const date = new Date(doc.timestamp);
          const formattedDate = `${date.getUTCFullYear()}-${String(
            date.getUTCMonth() + 1
          ).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
          const formattedTime = `${String(date.getUTCHours()).padStart(
            2,
            "0"
          )}:${String(date.getUTCMinutes()).padStart(2, "0")}`;
          const rawPricedata = doc.price;
          let formattedPricedata;
          formattedPricedata = rawPricedata.toFixed(4);
          return `💰 ${doc.tokenSymbol} was worth ${formattedPricedata}$ on ${formattedDate} at ${formattedTime}`;
        }
        return ""; // Handle any other types
      })
      .filter(Boolean) // Remove empty strings
      .join("\n");

    return formattedData;
  } catch (error) {
    console.error("Error fetching data from MongoDB:", error);
    return "";
  }
}

/**
 * Close MongoDB connection
 */
export async function closeConnection() {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log("MongoDB connection closed");
  }
}
