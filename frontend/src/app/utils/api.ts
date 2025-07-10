// API utility with caching and performance optimizations

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class APICache {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly defaultTTL = 5 * 60 * 1000; // 5 minutes

  set<T>(key: string, data: T, ttl: number = this.defaultTTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > entry.ttl;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  clear(): void {
    this.cache.clear();
  }
}

const apiCache = new APICache();

export const apiClient = {
  async fetch<T>(
    url: string,
    options: RequestInit = {},
    cacheTTL?: number
  ): Promise<T> {
    const cacheKey = `${url}-${JSON.stringify(options)}`;

    // Check cache first
    if (cacheTTL !== 0) {
      const cached = apiCache.get<T>(cacheKey);
      if (cached) return cached;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Cache the response
      if (cacheTTL !== 0) {
        apiCache.set(cacheKey, data, cacheTTL);
      }

      return data;
    } catch (error) {
      console.error(`API Error for ${url}:`, error);
      throw error;
    }
  },

  // Prefetch data for better performance
  prefetch: (url: string, options: RequestInit = {}) => {
    const cacheKey = `${url}-${JSON.stringify(options)}`;
    const cached = apiCache.get(cacheKey);

    if (!cached) {
      // Start prefetching in background
      fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
      })
        .then((response) => response.json())
        .then((data) => apiCache.set(cacheKey, data))
        .catch((error) => console.error("Prefetch error:", error));
    }
  },

  // Clear cache
  clearCache: () => apiCache.clear(),
};

// Optimized API endpoints
export const apiEndpoints = {
  userActivity: (address: string, page: number = 1, limit: number = 10) =>
    `${process.env.NEXT_PUBLIC_API_URL}/activity/track/me?address=${address}&page=${page}&limit=${limit}`,

  leaderboard: (page: number = 1) =>
    `${process.env.NEXT_PUBLIC_API_URL}/activity/track/leaderboard?page=${page}`,

  weeklyLeaderboard: (page: number = 1) =>
    `${process.env.NEXT_PUBLIC_API_URL}/activity/track/leaderboard/weekly?page=${page}`,

  priceData: (symbol: string) =>
    `${process.env.NEXT_PUBLIC_API_URL}/events/prices?symbol=${symbol}`,

  signals: (userAddress: string, page: number = 1, limit: number = 5) =>
    `${process.env.NEXT_PUBLIC_API_URL}/signals/generated-signals?userAddress=${userAddress}&page=${page}&limit=${limit}`,

  completedTrades: () => `${process.env.NEXT_PUBLIC_API_URL}/trade/completed`,

  tokenHolders: (tokenAddress: string) =>
    `${process.env.NEXT_PUBLIC_API_URL}/token/holders/${tokenAddress}`,
};
