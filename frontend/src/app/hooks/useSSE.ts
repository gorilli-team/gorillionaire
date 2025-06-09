import { useEffect, useRef } from "react";
import { getAuthToken } from "@/app/helpers/auth";

type MessageHandler = (data: any) => void;



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
        console.error("Failed to parse SSE message:", e);
      }
    });

    sse.onerror = (err) => {
      console.error("SSE error:", err);
      sse.close();
    };

    return () => {
      sse.close();
    };
  }, [url, onMessage]);
}