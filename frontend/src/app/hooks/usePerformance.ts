"use client";

import { useEffect, useRef, useCallback } from "react";

interface PerformanceMetrics {
  ttfb: number;
  fcp: number;
  lcp: number;
  fid: number;
  cls: number;
}

export const usePerformance = () => {
  const metricsRef = useRef<PerformanceMetrics>({
    ttfb: 0,
    fcp: 0,
    lcp: 0,
    fid: 0,
    cls: 0,
  });

  const measureTTFB = useCallback(() => {
    if (typeof window !== "undefined" && "performance" in window) {
      const navigation = performance.getEntriesByType(
        "navigation"
      )[0] as PerformanceNavigationTiming;
      if (navigation) {
        const ttfb = navigation.responseStart - navigation.requestStart;
        metricsRef.current.ttfb = ttfb;

        // Log TTFB for monitoring
        console.log(`TTFB: ${ttfb}ms`);

        // Send to analytics if TTFB is high
        if (ttfb > 600) {
          console.warn(`High TTFB detected: ${ttfb}ms`);
        }
      }
    }
  }, []);

  const measureWebVitals = useCallback(() => {
    if (typeof window !== "undefined") {
      // First Contentful Paint
      new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const fcp = entries[entries.length - 1];
        if (fcp) {
          metricsRef.current.fcp = fcp.startTime;
          console.log(`FCP: ${fcp.startTime}ms`);
        }
      }).observe({ entryTypes: ["paint"] });

      // Largest Contentful Paint
      new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const lcp = entries[entries.length - 1];
        if (lcp) {
          metricsRef.current.lcp = lcp.startTime;
          console.log(`LCP: ${lcp.startTime}ms`);
        }
      }).observe({ entryTypes: ["largest-contentful-paint"] });

      // First Input Delay
      new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        entries.forEach((entry) => {
          metricsRef.current.fid = entry.processingStart - entry.startTime;
          console.log(`FID: ${metricsRef.current.fid}ms`);
        });
      }).observe({ entryTypes: ["first-input"] });

      // Cumulative Layout Shift
      new PerformanceObserver((entryList) => {
        let cls = 0;
        entryList.getEntries().forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            cls += entry.value;
          }
        });
        metricsRef.current.cls = cls;
        console.log(`CLS: ${cls}`);
      }).observe({ entryTypes: ["layout-shift"] });
    }
  }, []);

  const prefetchResources = useCallback((urls: string[]) => {
    urls.forEach((url) => {
      const link = document.createElement("link");
      link.rel = "prefetch";
      link.href = url;
      document.head.appendChild(link);
    });
  }, []);

  const preloadCriticalResources = useCallback(() => {
    // Preload critical API endpoints
    const criticalEndpoints = [
      "/api/activity/track/leaderboard",
      "/api/signals/generated-signals",
      "/api/events/prices",
    ];

    criticalEndpoints.forEach((endpoint) => {
      const link = document.createElement("link");
      link.rel = "prefetch";
      link.href = endpoint;
      document.head.appendChild(link);
    });
  }, []);

  useEffect(() => {
    // Measure TTFB on page load
    measureTTFB();

    // Set up Web Vitals measurement
    measureWebVitals();

    // Preload critical resources
    preloadCriticalResources();
  }, [measureTTFB, measureWebVitals, preloadCriticalResources]);

  return {
    metrics: metricsRef.current,
    prefetchResources,
    measureTTFB,
  };
};
