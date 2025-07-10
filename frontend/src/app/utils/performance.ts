// Performance optimization utilities

export const PERFORMANCE_CONFIG = {
  // Cache TTL settings (in milliseconds)
  CACHE_TTL: {
    SHORT: 30 * 1000, // 30 seconds
    MEDIUM: 5 * 60 * 1000, // 5 minutes
    LONG: 30 * 60 * 1000, // 30 minutes
  },

  // API request timeouts
  API_TIMEOUT: 10000, // 10 seconds

  // Performance thresholds
  TTFB_THRESHOLD: 600, // 600ms
  FCP_THRESHOLD: 1800, // 1.8s
  LCP_THRESHOLD: 2500, // 2.5s

  // Bundle size thresholds
  BUNDLE_SIZE_THRESHOLD: 500 * 1024, // 500KB
};

// Environment-specific optimizations
export const getPerformanceConfig = () => {
  const isDevelopment = process.env.NODE_ENV === "development";
  const isProduction = process.env.NODE_ENV === "production";

  return {
    // Enable aggressive caching in production
    enableCaching: isProduction,

    // Enable compression in production
    enableCompression: isProduction,

    // Enable bundle analysis in development
    enableBundleAnalysis: isDevelopment && process.env.ANALYZE === "true",

    // Enable performance monitoring
    enablePerformanceMonitoring: isProduction,

    // Cache TTL based on environment
    cacheTTL: isProduction
      ? PERFORMANCE_CONFIG.CACHE_TTL.LONG
      : PERFORMANCE_CONFIG.CACHE_TTL.SHORT,
  };
};

// Resource preloading utilities
export const preloadCriticalResources = () => {
  if (typeof window === "undefined") return;

  const criticalResources = [
    // Preload critical fonts
    "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",

    // Preload critical images
    "/fav.png",
    "/gorillionaire-logo.svg",

    // Preload critical API endpoints
    `${process.env.NEXT_PUBLIC_API_URL}/activity/track/leaderboard`,
    `${process.env.NEXT_PUBLIC_API_URL}/signals/generated-signals`,
  ];

  criticalResources.forEach((resource) => {
    const link = document.createElement("link");
    link.rel = "preload";
    link.href = resource;

    if (resource.includes(".css")) {
      link.as = "style";
    } else if (resource.includes(".png") || resource.includes(".svg")) {
      link.as = "image";
    } else {
      link.as = "fetch";
    }

    document.head.appendChild(link);
  });
};

// Performance monitoring utilities
export const logPerformanceMetric = (
  metric: string,
  value: number,
  threshold?: number
) => {
  const config = getPerformanceConfig();

  if (!config.enablePerformanceMonitoring) return;

  console.log(`Performance Metric - ${metric}: ${value}ms`);

  if (threshold && value > threshold) {
    console.warn(
      `Performance Warning - ${metric} exceeded threshold: ${value}ms > ${threshold}ms`
    );

    // Send to analytics
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("event", "performance_warning", {
        metric_name: metric,
        value: value,
        threshold: threshold,
      });
    }
  }
};

// Bundle size monitoring
export const monitorBundleSize = () => {
  if (typeof window === "undefined") return;

  const observer = new PerformanceObserver((list) => {
    list.getEntries().forEach((entry) => {
      if (
        entry.entryType === "resource" &&
        entry.name.includes("_next/static/")
      ) {
        const size = (entry as PerformanceResourceTiming).transferSize;
        if (size > PERFORMANCE_CONFIG.BUNDLE_SIZE_THRESHOLD) {
          console.warn(
            `Large bundle detected: ${entry.name} (${Math.round(
              size / 1024
            )}KB)`
          );
        }
      }
    });
  });

  observer.observe({ entryTypes: ["resource"] });
};
