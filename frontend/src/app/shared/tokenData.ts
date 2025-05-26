export interface TokenData {
  id: number;
  name: string;
  symbol: string;
  price: string;
  volume: string;
  image: string;
  holders: number;
  address: string;
  isActive: boolean;
  supply: string;
  trackedSince: string;
  signalsGenerated: number;
}

//fetch all tokens from backend
export const fetchAllTokens = async () => {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/events/token`
  );
  const data = await response.json();
  return data;
};

export const fetchUntrackedTokens = async (page: number) => {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/events/listings?page=${page}&limit=10`
  );
  const data = await response.json();
  return data;
};

export const trackedTokens: TokenData[] = [
  {
    id: 11,
    name: "Molandak",
    symbol: "DAK",
    supply: "10,000,000",
    holders: 603708,
    address: "0x0F0BDEbF0F83cD1EE3974779Bcb7315f9808c714",
    image:
      "https://imagedelivery.net/tWwhAahBw7afBzFUrX5mYQ/27759359-9374-4995-341c-b2636a432800/public",
    isActive: false,
    price: "$0.50",
    volume: "$1.2M",
    trackedSince: "Jan 01, 2025",
    signalsGenerated: 112,
  },
  {
    id: 12,
    name: "Moyaki",
    symbol: "YAKI",
    supply: "1,000,000,000",
    holders: 536061,
    address: "0xfe140e1dCe99Be9F4F15d657CD9b7BF622270C50",
    image:
      "https://imagedelivery.net/tWwhAahBw7afBzFUrX5mYQ/6679b698-a845-412b-504b-23463a3e1900/public",
    isActive: false,
    price: "$0.50",
    volume: "$1.2M",
    trackedSince: "Jan 01, 2025",
    signalsGenerated: 95,
  },
  {
    id: 13,
    name: "Chog",
    symbol: "CHOG",
    supply: "100,000,000",
    holders: 565297,
    address: "0xE0590015A873bF326bd645c3E1266d4db41C4E6B",
    image:
      "https://imagedelivery.net/tWwhAahBw7afBzFUrX5mYQ/5d1206c2-042c-4edc-9f8b-dcef2e9e8f00/public",
    isActive: false,
    price: "$0.50",
    volume: "$1.2M",
    trackedSince: "Jan 01, 2025",
    signalsGenerated: 72,
  },
];
