const axios = require("axios");
const TokenHolders = require("../models/TokenHolders");

// Configuration
const baseURL =
  process.env.BLOCKVISION_API_URL || "https://api.blockvision.org/v2/monad";
const apiKey = process.env.BLOCKVISION_API_KEY;
const GORILLI_NFT_CONTRACT_ADDRESS =
  "0x8d901Da7BF9F26857994FE776C076053cB1B8596";

// Function to retrieve token holders
const retrieveTokenHolders = async ({
  contractAddress,
  tokenName,
  pageIndex = "1",
  pageSize = "20",
}) => {
  try {
    const response = await axios.get(`${baseURL}/token/holders`, {
      params: {
        contractAddress,
        pageIndex,
        pageSize,
      },
      headers: {
        "x-api-key": apiKey,
        accept: "application/json",
      },
    });

    // Update existing record or create new one if it doesn't exist
    const updatedTokenHolders = await TokenHolders.findOneAndUpdate(
      { tokenAddress: contractAddress },
      {
        tokenName: tokenName,
        total: response.data.result.total,
        holders: response.data.result.data,
      },
      { new: true, upsert: true }
    );

    return response.data;
  } catch (error) {
    console.error(
      "BlockvisionAPI Error:",
      error.response?.data || error.message
    );
    throw error;
  }
};

const retrieveAddressTokens = async ({
  address,
  pageIndex = "1",
  pageSize = "20",
}) => {
  try {
    const response = await axios.get(`${baseURL}/account/tokens`, {
      params: {
        address,
        pageIndex,
        pageSize,
      },
      headers: {
        "x-api-key": apiKey,
        accept: "application/json",
      },
    });

    return response.data;
  } catch (error) {
    console.error(
      "BlockvisionAPI Error retrieving address tokens:",
      error.message
    );
    throw {
      message: "Failed to retrieve address tokens",
      error: error.message,
      status: error.response?.status || 500,
    };
  }
};

const retrieveGorilliNftHolders = async () => {
  try {
    const response = await axios.get(
      `${baseURL}/collection/holders?contractAddress=${GORILLI_NFT_CONTRACT_ADDRESS}`,
      {
        headers: {
          "x-api-key": apiKey,
          accept: "application/json",
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error("Error retrieving gorilli nft holders:", error);
  }
};

// Export the function directly
module.exports = {
  retrieveTokenHolders,
  retrieveAddressTokens,
  retrieveGorilliNftHolders,
};
