export const ENDPOINTS = {
    PRIVY_VERIFY: '/app/auth/privy/verify',
    CSRF_TOKEN: '/app/csrf-token',
    REFREFH_TOKEN: '/app/refresh-token',
    SIGNAL_SSE_EVENTS: '/app/signals/sse',
    SIGNALS_LIST: '/api/v1/signals',
    SIGNAL_INFO: '/api/v1/signal/:id',
    SIGNAL_EVENTS_ALL: '/api/v1/signal/events/all',
    SIGNAL_EVENTS: '/api/v1/signal/events/:signal_id',
    PRICE_DATA: '/app/prices/:id',
    TOKEN_INFO: '/api/v1/token/:id',
    TOKENS_INFO: '/api/v1/tokens',

    // Add more endpoints as needed
};

export const BASE_URL = process.env.NEXT_PUBLIC_API_V2_URL || 'http://localhost:8082';