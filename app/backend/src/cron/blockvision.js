const cron = require("node-cron");
const blockvision = require("../api/blockvision");

const tokenContractAddresses = [
  {
    contractAddress: "0xE0590015A873bF326bd645c3E1266d4db41C4E6B",
    tokenName: "CHOG",
  },
  {
    contractAddress: "0xfe140e1dCe99Be9F4F15d657CD9b7BF622270C50",
    tokenName: "MOYAKI",
  },
  {
    contractAddress: "0x0F0BDEbF0F83cD1EE3974779Bcb7315f9808c714",
    tokenName: "MOLANDAK",
  },
];

// Function to fetch token holders
async function fetchTokenHolders(contractAddress, tokenName) {
  try {
    const holders = await blockvision.retrieveTokenHolders({
      contractAddress,
      tokenName,
      pageIndex: "1",
      pageSize: "20",
    });
    return holders;
  } catch (err) {
    console.error("Error fetching token holders:", err);
    throw err;
  }
}

// Initialize the cron job
function initTokenHoldersCron() {
  // Run every hour at minute 0
  return cron.schedule("0 * * * *", async () => {
    try {
      for (const token of tokenContractAddresses) {
        await fetchTokenHolders(token.contractAddress, token.tokenName);
      }
    } catch (error) {
      console.error("Failed to fetch token holders:", error);
    }
  });
}

module.exports = {
  initTokenHoldersCron,
};
