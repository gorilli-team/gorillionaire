export const ENDPOINTS = {
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
