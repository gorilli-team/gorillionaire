const express = require("express");
const router = express.Router();
const ethers = require("ethers");
const PriceOracle = require("../../services/PriceOracle");
const Intent = require("../../models/Intent");

const LIMIT = 20;
router.get("/completed", async (req, res) => {
  const { page = 1, limit = LIMIT } = req.query;
  const intents = await Intent.find({ status: "completed" })
    .sort({ timestamp: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  res.json(intents);
});

const MON_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
const WMONAD_ADDRESS = "0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701";
const MONAD_CHAIN_ID = 10143;

const symbolToTokenInfo = {
  DAK: { address: "0x0F0BDEbF0F83cD1EE3974779Bcb7315f9808c714", decimals: 18 },
  CHOG: { address: "0xE0590015A873bF326bd645c3E1266d4db41C4E6B", decimals: 18 },
  YAKI: { address: "0xfe140e1dCe99Be9F4F15d657CD9b7BF622270C50", decimals: 18 },
  MON: { address: MON_ADDRESS, decimals: 18 },
};

async function buildPriceRequest(
  tokenSymbol,
  amount,
  type,
  userAddress,
  slippagePercentage = 1
) {
  const tokenInfo = symbolToTokenInfo[tokenSymbol];

  // If "buy" I need to convert the amount passed (which is based in token) to MON amount
  const codexOracle = new PriceOracle();
  const prices = await codexOracle.getTokenPrices([
    {
      address: WMONAD_ADDRESS,
      networkId: MONAD_CHAIN_ID,
    },
    {
      address: tokenInfo.address,
      networkId: MONAD_CHAIN_ID,
    },
  ]);

  const monPrice = parseFloat(prices[0].priceUsd);
  const tokenPrice = parseFloat(prices[1].priceUsd);

  const usdValue = amount * tokenPrice;

  // if buy, convert amount to MON amount
  if (type === "buy") amount = usdValue / monPrice;

  const ZEROX_FEE_RECIPIENT = process.env.ZEROX_FEE_RECIPIENT;
  const ZEROX_FEE_PERCENTAGE = process.env.ZEROX_FEE_PERCENTAGE;

  // Build priceParams with or without fee params (Monad Testnet: use swapFeeRecipient, swapFeeBps, swapFeeToken)
  const priceParamsObj = {
    chainId: MONAD_CHAIN_ID.toString(),
    sellToken:
      type === "sell"
        ? tokenInfo.address.toLowerCase()
        : MON_ADDRESS.toLowerCase(),
    buyToken:
      type === "sell"
        ? MON_ADDRESS.toLowerCase()
        : tokenInfo.address.toLowerCase(),
    sellAmount: ethers
      .parseUnits(amount.toFixed(tokenInfo.decimals), tokenInfo.decimals)
      .toString(),
    taker: userAddress,
    slippagePercentage: slippagePercentage.toString(),
  };

  if (ZEROX_FEE_RECIPIENT && ZEROX_FEE_PERCENTAGE) {
    // Convert percentage to basis points (0.1% => 10)
    const swapFeeBps = Math.round(
      Number(ZEROX_FEE_PERCENTAGE) * 100
    ).toString();
    priceParamsObj.swapFeeRecipient = ZEROX_FEE_RECIPIENT;
    priceParamsObj.swapFeeBps = swapFeeBps;
    priceParamsObj.swapFeeToken =
      type === "sell" ? priceParamsObj.sellToken : priceParamsObj.buyToken;
  }

  const priceParams = new URLSearchParams(priceParamsObj);

  const headers = {
    "0x-api-key": process.env.ZEROX_API_KEY,
    "0x-version": "v2",
  };

  return { priceParams, headers, usdValue, tokenPrice };
}

async function getPrice(token, amount, type, userAddress) {
  const { priceParams, headers } = await buildPriceRequest(
    token,
    Number(amount),
    type,
    userAddress
  );

  const requestUrl =
    "https://api.0x.org/swap/permit2/price?" + priceParams.toString();
  console.log("0x API Request URL (price):", requestUrl);

  const priceResponse = await fetch(requestUrl, { headers });
  const res = await priceResponse.json();
  console.log("0x API Response (price):", JSON.stringify(res, null, 2));

  return res;
}

async function getQuote(token, amount, type, userAddress) {
  const { priceParams, headers, usdValue, tokenPrice } =
    await buildPriceRequest(token, Number(amount), type, userAddress);

  const requestUrl =
    "https://api.0x.org/swap/permit2/quote?" + priceParams.toString();
  console.log("0x API Request URL (quote):", requestUrl);

  const priceResponse = await fetch(requestUrl, { headers });
  const res = await priceResponse.json();
  console.log("0x API Response (quote):", JSON.stringify(res, null, 2));

  if (!res.transaction) {
    throw new Error("No transaction data found");
  }

  const intentObject = new Intent({
    userAddress: userAddress.toLowerCase(),
    tokenSymbol: token,
    tokenAmount: amount,
    tokenPrice: tokenPrice,
    usdValue: usdValue,
    action: type,
    timestamp: Date.now(),
    data: res.transaction.data,
    status: "pending",
  });
  await intentObject.save();

  return { ...res, intentId: intentObject._id };
}

router.get("/0x-quote", async (req, res) => {
  const { token, amount, type, userAddress } = req.query;
  if (!token || !amount || !type || !userAddress)
    return res.status(500).json({ error: "Required field missing" });
  if (!["sell", "buy"].includes(type))
    return res.status(500).json({ error: '"type" value not valid' });

  try {
    console.log(
      `Getting quote for ${type} ${amount} ${token} for user ${userAddress}`
    );
    const quote = await getQuote(token, amount, type, userAddress);
    console.log(`Quote received successfully`);
    res.status(200).json(quote);
  } catch (e) {
    console.error(`Error getting quote: ${e.message}`);
    res.status(500).json({ error: e.message || e });
  }
});

router.get("/0x-price", async (req, res) => {
  const { token, amount, type, userAddress } = req.query;
  if (!token || !amount || !type)
    return res.status(500).json({ error: "Required field missing" });
  if (!["sell", "buy"].includes(type))
    return res.status(500).json({ error: '"type" value not valid' });

  try {
    console.log(`Getting price for ${type} ${amount} ${token}`);
    const price = await getPrice(token, amount, type, userAddress);
    console.log(`Price received successfully`);
    res.status(200).json(price);
  } catch (e) {
    console.error(`Error getting price: ${e.message}`);
    res.status(500).json({ error: e.message || e });
  }
});

module.exports = router;
