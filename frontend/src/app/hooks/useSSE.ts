import { useEffect, useRef } from "react";
import { getAuthToken } from "@/app/helpers/auth";

type Event = {
  id: string;
  token_id: string;
  signal_id: string;
  signal_name: string;
  currency: string;
  action: string;
  symbol: string;
  price: number;
  timestamp: string;
};

type MessageHandler = (data: Event) => void;

export function useSSE(url: string, onMessage: MessageHandler) {
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const token = getAuthToken();
    if (!token || !url) return;
    const sseUrl = `${url}?token=${encodeURIComponent(token)}`;

    const sse = new EventSource(sseUrl);
    eventSourceRef.current = sse;

    sse.addEventListener("tick", (event) => {
      try {
        const parsed = JSON.parse(event.data);
        console.log("parsed", parsed);
        onMessage(parsed);
      } catch (e) {
        console.info("Failed to parse SSE message:", e);
      }
    });

    sse.onerror = (err) => {
      console.info("SSE error:", err);
      sse.close();
    };

    return () => {
      sse.close();
    };
  }, [url, onMessage]);
}
