export const ENDPOINTS = {
  // Auth
  PRIVY_VERIFY: "/app/auth/privy/verify",
  CSRF_TOKEN: "/app/csrf-token",
  REFREFH_TOKEN: "/app/auth/refresh-token",

  // Signals
  SIGNALS_LIST: "/signals",
  SIGNAL_EVENTS_ALL: "/signals/events",
  SIGNAL_SSE_EVENTS: "/signals/events/sse",

  // Price data
  PRICE_DATA: "/prices/:id",

  // Tokens
  TOKENS_INFO: "/tokens",

  // User signals
  USER_SIGNAL: "/signals/user-signal",

  // Trade
  TRADE_QUOTE: "/trade/quote",
} as const;

export const BASE_URL =
  process.env.NEXT_PUBLIC_API_V2_URL || "http://localhost:8082";
