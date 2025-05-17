const axios = require("axios");
const PriceData = require("../models/PriceData");

const TOKENS = [
  {
    symbol: "WMON",
    address: "0x760afe86e5de5fa0ee542fc7b7b713e1c5425701",
    networkId: 10143,
  },
  {
    symbol: "YAKI",
    address: "0xfe140e1dCe99Be9F4F15d657CD9b7BF622270C50",
    networkId: 10143,
  },
  {
    symbol: "DAK",
    address: "0x0F0BDEbF0F83cD1EE3974779Bcb7315f9808c714",
    networkId: 10143,
  },
  {
    symbol: "CHOG",
    address: "0xE0590015A873bF326bd645c3E1266d4db41C4E6B",
    networkId: 10143,
  },
];

class PriceOracle {
  constructor() {
    this.apiKey = process.env.CODEX_API_KEY;
    this.baseUrl = "https://graph.codex.io/graphql";
  }

  async getTokenPrices(tokens) {
    try {
      const response = await axios.post(
        this.baseUrl,
        {
          query: `
            {
              getTokenPrices(
                inputs: [
                  ${tokens
                    .map(
                      (token) => `{
                    address: "${token.address}",
                    networkId: ${token.networkId}
                  }`
                    )
                    .join(",")}
                ]
              ) {
                address
                networkId
                priceUsd
                timestamp
                confidence
                poolAddress
              }
            }
          `,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: this.apiKey,
          },
        }
      );

      if (response.data.errors) {
        throw new Error(response.data.errors[0].message);
      }

      return response.data.data.getTokenPrices;
    } catch (error) {
      console.error("Error fetching token prices:", error);
      throw error;
    }
  }

  async updatePrices() {
    try {
      const prices = await this.getTokenPrices(TOKENS);

      for (const priceData of prices) {
        console.log({ priceData });
        const token = TOKENS.find(
          (t) => t.address.toLowerCase() === priceData.address.toLowerCase()
        );
        if (!token) continue;

        await PriceData.create({
          tokenSymbol: token.symbol,
          price: parseFloat(priceData.priceUsd),
          timestamp: new Date(priceData.timestamp * 1000),
          blockNumber: 0, // We don't get block numbers from Codex API
          address: priceData.poolAddress,
        });
      }
    } catch (error) {
      console.error("Error updating prices:", error);
      throw error;
    }
  }
}

module.exports = PriceOracle;
