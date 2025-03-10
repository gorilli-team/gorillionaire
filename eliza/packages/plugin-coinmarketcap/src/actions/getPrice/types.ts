import type { Content } from "@elizaos/core";

export interface GetPriceContent extends Content {
    symbol: string;
    currency: string;
}

export interface PriceData {
    price: number;
    marketCap: number;
    volume24h: number;
    volumeChange24h: number;
    percentChange1h: number;
    percentChange24h: number;
}

export interface ApiResponse {
    data: {
        [symbol: string]: {
            quote: {
                [currency: string]: {
                    price: number;
                    market_cap: number;
                    volume_24h: number;
                    volume_change_24h: number;
                    percent_change_1h: number;
                    percent_change_24h: number;
                };
            };
        };
    };
}
