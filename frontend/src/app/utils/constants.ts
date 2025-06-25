export const WMONAD_ADDRESS =
  "0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701" as const;
export const MON_ADDRESS =
  "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE" as const;
export const PERMIT2_ADDRESS =
  "0x000000000022d473030f116ddee9f6b43ac78ba3" as const;
export const MONAD_CHAIN_ID = 10143;

export const NFT_ACCESS_ADDRESS =
  "0x8d901Da7BF9F26857994FE776C076053cB1B8596" as const;

// Gorilla Index calculation utility
export interface FearGreedIndex {
  score: number;
  sentiment: string;
  color: string;
  bgColor: string;
  description: string;
  factors: {
    buyRatio: number;
    avgTradeSize: number;
    tradeFrequency: number;
    priceVolatility: number;
    recentActivity: number;
  };
}

export interface UserActivityForGorilla {
  name: string;
  points: string;
  date: string;
  intentId?: {
    tokenSymbol: string;
    tokenAmount: number;
    action: "buy" | "sell";
    txHash: string;
    tokenPrice: number;
  };
}

export function calculateFearGreedIndex(
  activities: UserActivityForGorilla[]
): FearGreedIndex {
  // Filter only trading activities
  const trades = activities.filter(
    (activity) =>
      activity.intentId &&
      activity.intentId.action &&
      activity.intentId.tokenAmount
  );

  if (trades.length === 0) {
    return {
      score: 50,
      sentiment: "Neutral",
      color: "text-gray-600",
      bgColor: "bg-gray-100",
      description: "No trading activity yet",
      factors: {
        buyRatio: 0,
        avgTradeSize: 0,
        tradeFrequency: 0,
        priceVolatility: 0,
        recentActivity: 0,
      },
    };
  }

  // Calculate buy ratio (0-100)
  const buyTrades = trades.filter((trade) => trade.intentId!.action === "buy");
  const buyRatio = (buyTrades.length / trades.length) * 100;

  // Calculate average trade size (normalized 0-100)
  const tradeSizes = trades.map(
    (trade) => trade.intentId!.tokenAmount * trade.intentId!.tokenPrice
  );
  const avgTradeSize =
    tradeSizes.reduce((sum, size) => sum + size, 0) / trades.length;
  const maxTradeSize = Math.max(...tradeSizes);
  const normalizedTradeSize =
    maxTradeSize > 0 ? (avgTradeSize / maxTradeSize) * 100 : 0;

  // Calculate trade frequency (0-100)
  const firstTrade = new Date(
    Math.min(...trades.map((t) => new Date(t.date).getTime()))
  );
  const lastTrade = new Date(
    Math.max(...trades.map((t) => new Date(t.date).getTime()))
  );
  const daysActive =
    (lastTrade.getTime() - firstTrade.getTime()) / (1000 * 60 * 60 * 24);
  const tradeFrequency =
    daysActive > 0 ? Math.min((trades.length / daysActive) * 10, 100) : 0;

  // Calculate price volatility (0-100)
  const prices = trades.map((trade) => trade.intentId!.tokenPrice);
  const avgPrice =
    prices.reduce((sum, price) => sum + price, 0) / prices.length;
  const variance =
    prices.reduce((sum, price) => sum + Math.pow(price - avgPrice, 2), 0) /
    prices.length;
  const volatility = (Math.sqrt(variance) / avgPrice) * 100;
  const normalizedVolatility = Math.min(volatility * 10, 100);

  // Calculate recent activity (0-100)
  const now = new Date();
  const recentTrades = trades.filter((trade) => {
    const tradeDate = new Date(trade.date);
    const daysDiff =
      (now.getTime() - tradeDate.getTime()) / (1000 * 60 * 60 * 24);
    return daysDiff <= 7; // Last 7 days
  });
  const recentActivity =
    (recentTrades.length / Math.max(trades.length, 1)) * 100;

  // Calculate overall score (0-100)
  // Higher buy ratio = more greed
  // Higher trade size = more greed
  // Higher frequency = more greed
  // Higher volatility = more fear
  // Higher recent activity = more greed
  const score = Math.round(
    buyRatio * 0.3 +
      normalizedTradeSize * 0.2 +
      tradeFrequency * 0.2 +
      (100 - normalizedVolatility) * 0.15 + // Invert volatility (higher volatility = more fear)
      recentActivity * 0.15
  );

  // Determine sentiment and colors
  let sentiment: string;
  let color: string;
  let bgColor: string;
  let description: string;

  if (score >= 80) {
    sentiment = "Extreme Greed";
    color = "text-red-600";
    bgColor = "bg-red-100";
    description = "Very aggressive trading behavior";
  } else if (score >= 60) {
    sentiment = "Greed";
    color = "text-orange-600";
    bgColor = "bg-orange-100";
    description = "Optimistic trading approach";
  } else if (score >= 40) {
    sentiment = "Neutral";
    color = "text-gray-600";
    bgColor = "bg-gray-100";
    description = "Balanced trading strategy";
  } else if (score >= 20) {
    sentiment = "Fear";
    color = "text-blue-600";
    bgColor = "bg-blue-100";
    description = "Cautious trading behavior";
  } else {
    sentiment = "Extreme Fear";
    color = "text-purple-600";
    bgColor = "bg-purple-100";
    description = "Very conservative approach";
  }

  return {
    score,
    sentiment,
    color,
    bgColor,
    description,
    factors: {
      buyRatio: Math.round(buyRatio),
      avgTradeSize: Math.round(normalizedTradeSize),
      tradeFrequency: Math.round(tradeFrequency),
      priceVolatility: Math.round(normalizedVolatility),
      recentActivity: Math.round(recentActivity),
    },
  };
}
