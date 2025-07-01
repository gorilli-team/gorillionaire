import { useEffect, useRef } from "react";
import { getAuthToken } from "@/app/helpers/auth";

export const useSSE = <T = unknown>(
  url: string,
  onMessage: (data: T) => void,
  auth: boolean = false
) => {
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!url) return;

    // For authenticated SSE, we need to include the token in the URL
    // since EventSource doesn't support custom headers
    let finalUrl = url;
    if (auth) {
      const token = getAuthToken();
      if (token) {
        const separator = url.includes("?") ? "&" : "?";
        finalUrl = `${url}${separator}token=${token}`;
      }
    }

    const eventSource = new EventSource(finalUrl);
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as T;
        onMessage(data);
      } catch (error) {
        console.error("Error parsing SSE data:", error);
      }
    };

    eventSource.onerror = (error) => {
      console.error("SSE error:", error);
      eventSource.close();
    };

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [url, onMessage, auth]);

  return eventSourceRef.current;
};
