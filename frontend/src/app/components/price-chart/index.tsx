"use client";

import React, { useLayoutEffect, useRef, useState, useEffect } from "react";
import dynamic from "next/dynamic";
import type { Time } from "lightweight-charts";
let createChart: unknown, ColorType: unknown, AreaSeries: unknown;

interface PriceData {
  time: Time;
  value: number;
}

interface PriceChartProps {
  data: PriceData[];
  tokenSymbol: string;
}

interface PriceStats {
  current: number;
  change1h: number;
  change6h: number;
  change24h: number;
}

const PriceChart: React.FC<PriceChartProps> = ({ data, tokenSymbol }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<unknown>(null);
  const [isClient, setIsClient] = useState(false);
  const [timeRange, setTimeRange] = useState<"1d" | "7d" | "30d" | "all">(
    "all"
  );
  const [priceStats, setPriceStats] = useState<PriceStats | null>(null);
  const [allTimeHighLow, setAllTimeHighLow] = useState<{
    high: { value: number; time: Time };
    low: { value: number; time: Time };
  } | null>(null);

  useLayoutEffect(() => {
    setIsClient(true);
    if (typeof window !== "undefined") {
      import("lightweight-charts").then((mod) => {
        createChart = mod.createChart;
        ColorType = mod.ColorType;
        AreaSeries = mod.AreaSeries;
        // Removed IChartApi and Time as they are not used
      });
    }
  }, []);

  // Calculate price statistics
  useEffect(() => {
    if (!data || data.length === 0) return;

    const sortedData = [...data].sort((a, b) => {
      const timeA =
        typeof a.time === "number"
          ? a.time
          : new Date(a.time.toString()).getTime();
      const timeB =
        typeof b.time === "number"
          ? b.time
          : new Date(b.time.toString()).getTime();
      return timeA - timeB;
    });

    const current = sortedData[sortedData.length - 1].value;
    const now = Date.now() / 1000; // Current time in seconds

    // Find data points closest to 1h, 6h, and 24h ago
    const oneHourAgo = now - 3600;
    const sixHoursAgo = now - 3600 * 6;
    const twentyFourHoursAgo = now - 3600 * 24;

    let price1h = current;
    let price6h = current;
    let price24h = current;

    for (let i = sortedData.length - 1; i >= 0; i--) {
      const dataPoint = sortedData[i];
      const itemTimeMs =
        typeof dataPoint.time === "number"
          ? dataPoint.time * 1000 // Convert seconds to milliseconds
          : new Date(dataPoint.time.toString()).getTime();

      const itemTimeSec = itemTimeMs / 1000; // Convert to seconds for comparison

      if (itemTimeSec <= oneHourAgo && price1h === current) {
        price1h = dataPoint.value;
      }

      if (itemTimeSec <= sixHoursAgo && price6h === current) {
        price6h = dataPoint.value;
      }

      if (itemTimeSec <= twentyFourHoursAgo && price24h === current) {
        price24h = dataPoint.value;
      }

      // Break if we've found all time periods
      if (price1h !== current && price6h !== current && price24h !== current)
        break;
    }

    // Calculate percentage changes
    const change1h =
      price1h !== current ? ((current - price1h) / price1h) * 100 : 0;
    const change6h =
      price6h !== current ? ((current - price6h) / price6h) * 100 : 0;
    const change24h =
      price24h !== current ? ((current - price24h) / price24h) * 100 : 0;

    setPriceStats({
      current,
      change1h,
      change6h,
      change24h,
    });
  }, [data]);

  // Find all-time high and low
  useEffect(() => {
    if (!data || data.length === 0) return;

    let high = { value: Number.MIN_SAFE_INTEGER, time: data[0].time };
    let low = { value: Number.MAX_SAFE_INTEGER, time: data[0].time };

    data.forEach((item) => {
      if (item.value > high.value) {
        high = { value: item.value, time: item.time };
      }
      if (item.value < low.value) {
        low = { value: item.value, time: item.time };
      }
    });

    setAllTimeHighLow({ high, low });
  }, [data]);

  useLayoutEffect(() => {
    if (!isClient || !chartContainerRef.current || !data || data.length === 0)
      return;

    try {
      // Initialize chart
      const chart = (
        createChart as typeof import("lightweight-charts").createChart
      )(chartContainerRef.current, {
        layout: {
          background: {
            type: (ColorType as typeof import("lightweight-charts").ColorType)
              .Solid,
            color: "white",
          },
          textColor: "black",
        },
        width: chartContainerRef.current.clientWidth,
        height: 300,
        grid: {
          vertLines: { visible: false },
          horzLines: { color: "#f0f0f0" },
        },
        rightPriceScale: {
          borderVisible: false,
        },
        timeScale: {
          borderVisible: false,
          timeVisible: true,
          // Disable zooming functionality
          rightOffset: 0,
          barSpacing: 6,
          rightBarStaysOnScroll: true,
          lockVisibleTimeRangeOnResize: true,
        },
        // Disable mouse wheel zooming and touch interaction for zooming
        handleScroll: false,
        handleScale: false,
      });

      // Create the line series
      const lineSeries = chart.addSeries(
        AreaSeries as typeof import("lightweight-charts").AreaSeries,
        {
          lineColor: "#2962FF",
          topColor: "#2962FF",
          bottomColor: "rgba(41, 98, 255, 0.28)",
          priceFormat: {
            type: "price",
            precision: 6,
            minMove: 0.000001,
          },
          // Enable markers for this series
          lastValueVisible: true,
          crosshairMarkerVisible: true,
        }
      );

      // Transform data to ensure proper time format and unique ascending timestamps
      const formattedData = data
        .map((item, index) => ({
          time: item.time as Time,
          value: item.value,
          originalIndex: index,
        }))
        // Remove duplicates by keeping the latest value for each timestamp
        .reduce((acc, curr) => {
          const key =
            typeof curr.time === "number" ? curr.time : curr.time.toString();
          acc[key] = curr;
          return acc;
        }, {} as Record<string, (typeof data)[0] & { originalIndex: number }>);

      // Convert back to array and sort by timestamp
      let uniqueSortedData = Object.values(formattedData)
        .sort((a, b) => {
          // Convert both times to numbers for comparison
          const timeA =
            typeof a.time === "number"
              ? a.time
              : new Date(a.time.toString()).getTime();
          const timeB =
            typeof b.time === "number"
              ? b.time
              : new Date(b.time.toString()).getTime();
          const timeCompare = timeA - timeB;
          return timeCompare === 0
            ? a.originalIndex - b.originalIndex
            : timeCompare;
        })
        .map(({ time, value }) => ({ time, value }));

      // Filter data based on selected time range
      if (timeRange !== "all" && uniqueSortedData.length > 0) {
        const now = Date.now() / 1000; // Current time in seconds
        let cutoffTime;

        switch (timeRange) {
          case "1d":
            cutoffTime = now - 86400; // 24 hours
            break;
          case "7d":
            cutoffTime = now - 86400 * 7; // 7 days
            break;
          case "30d":
            cutoffTime = now - 86400 * 30; // 30 days
            break;
          default:
            cutoffTime = 0;
        }

        uniqueSortedData = uniqueSortedData.filter((item) => {
          const itemTime =
            typeof item.time === "number"
              ? item.time
              : new Date(item.time.toString()).getTime() / 1000;
          return itemTime >= cutoffTime;
        });
      }

      // Set the data
      lineSeries.setData(uniqueSortedData);

      // Add markers for all-time high and low if they're within the current time range
      if (allTimeHighLow) {
        try {
          // Create colored price lines for ATH and ATL instead of markers
          const high = allTimeHighLow.high.value;
          const low = allTimeHighLow.low.value;

          // Add ATH price line
          lineSeries.createPriceLine({
            price: high,
            color: "#22c55e",
            lineWidth: 1,
            lineStyle: 1, // Dotted
            axisLabelVisible: true,
            title: `ATH: $${high.toFixed(6)}`,
          });

          // Add ATL price line
          lineSeries.createPriceLine({
            price: low,
            color: "#ef4444",
            lineWidth: 1,
            lineStyle: 1, // Dotted
            axisLabelVisible: true,
            title: `ATL: $${low.toFixed(6)}`,
          });
        } catch (e) {
          console.error("Error adding price lines:", e);
        }
      }

      // Fit all data points into the visible area - apply after a short delay to ensure it works
      setTimeout(() => {
        chart.timeScale().fitContent();
      }, 50);

      // Add custom tooltip
      if (chartContainerRef.current) {
        const container = chartContainerRef.current;
        const toolTip = document.createElement("div");

        // Style the tooltip
        toolTip.style.position = "absolute";
        toolTip.style.display = "none";
        toolTip.style.padding = "8px";
        toolTip.style.boxSizing = "border-box";
        toolTip.style.fontSize = "12px";
        toolTip.style.color = "black";
        toolTip.style.background = "white";
        toolTip.style.borderRadius = "4px";
        toolTip.style.boxShadow = "0 2px 5px rgba(0, 0, 0, 0.1)";
        toolTip.style.pointerEvents = "none";
        toolTip.style.zIndex = "1000";
        toolTip.style.border = "1px solid #ddd";

        container.appendChild(toolTip);

        // update tooltip
        chart.subscribeCrosshairMove((param) => {
          if (
            !param.point ||
            !param.time ||
            param.point.x < 0 ||
            param.point.y < 0
          ) {
            toolTip.style.display = "none";
            return;
          }

          // Get price value at current crosshair position
          const seriesData = param.seriesData.get(lineSeries);

          if (!seriesData) {
            toolTip.style.display = "none";
            return;
          }

          // Handle different data formats - for AreaSeries we expect a number directly
          let price: number;
          if (typeof seriesData === "number") {
            price = seriesData;
          } else if (
            seriesData &&
            typeof seriesData === "object" &&
            "value" in seriesData
          ) {
            price = (seriesData as { value: number }).value;
          } else {
            toolTip.style.display = "none";
            return;
          }

          if (isNaN(price)) {
            toolTip.style.display = "none";
            return;
          }

          toolTip.style.display = "block";

          const dateStr =
            typeof param.time === "number"
              ? new Date(param.time * 1000).toLocaleString()
              : new Date(param.time.toString()).toLocaleString();

          toolTip.innerHTML = `
            <div style="font-weight:500">${dateStr}</div>
            <div style="font-size:16px">$${Number(price).toFixed(6)}</div>
          `;

          const coordinate = lineSeries.priceToCoordinate(Number(price));
          let shiftedCoordinate = param.point.x - 50;

          if (coordinate === null) {
            return;
          }

          const containerWidth = container.clientWidth;
          shiftedCoordinate = Math.max(
            0,
            Math.min(containerWidth - 100, shiftedCoordinate)
          );
          const coordinateY = param.point.y;

          toolTip.style.left = shiftedCoordinate + "px";
          toolTip.style.top = coordinateY - 100 + "px";
        });
      }

      // Handle resize
      const handleResize = () => {
        if (chartContainerRef.current && chart) {
          chart.applyOptions({
            width: chartContainerRef.current.clientWidth,
          });
        }
      };

      window.addEventListener("resize", handleResize);
      chartRef.current = chart;

      // Cleanup
      return () => {
        window.removeEventListener("resize", handleResize);
        if (chart) {
          chart.remove();
        }
      };
    } catch (error) {
      console.error("Error initializing chart:", error);
    }
  }, [data, isClient, timeRange, allTimeHighLow]);

  // Function to export data as CSV
  const exportDataAsCSV = () => {
    if (!data || data.length === 0) return;

    // Create CSV content
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Date,Price\n";

    // Sort data by time
    const sortedData = [...data].sort((a, b) => {
      const timeA =
        typeof a.time === "number"
          ? a.time
          : new Date(a.time.toString()).getTime();
      const timeB =
        typeof b.time === "number"
          ? b.time
          : new Date(b.time.toString()).getTime();
      return timeA - timeB;
    });

    // Add each data point to CSV
    sortedData.forEach((item) => {
      const date =
        typeof item.time === "number"
          ? new Date(item.time * 1000).toISOString()
          : new Date(item.time.toString()).toISOString();
      csvContent += `${date},${item.value}\n`;
    });

    // Create download link
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${tokenSymbol}_price_data.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Server-side and initial client render
  if (!isClient || !data || data.length === 0) {
    return (
      <div className="w-full p-4 bg-white rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4">
          {tokenSymbol} Price Chart
        </h3>
        <div className="h-[300px] flex items-center justify-center text-gray-500">
          {!isClient ? "Loading..." : "No price data available"}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full p-4 bg-white rounded-lg shadow-md">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-4">
        <h3 className="text-lg font-semibold mb-2 md:mb-0">
          {tokenSymbol} Price Chart
        </h3>

        {priceStats && (
          <div className="flex flex-wrap gap-4 md:gap-4 md:justify-end mt-1 md:mt-0">
            <div className="flex flex-col">
              <span className="text-xs text-gray-500">Price</span>
              <span className="font-medium">
                ${priceStats.current.toFixed(6)}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-gray-500">1h</span>
              <span
                className={`font-medium ${
                  priceStats.change1h >= 0 ? "text-green-500" : "text-red-500"
                }`}
              >
                {priceStats.change1h >= 0 ? "+" : ""}
                {priceStats.change1h.toFixed(2)}%
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-gray-500">6h</span>
              <span
                className={`font-medium ${
                  priceStats.change6h >= 0 ? "text-green-500" : "text-red-500"
                }`}
              >
                {priceStats.change6h >= 0 ? "+" : ""}
                {priceStats.change6h.toFixed(2)}%
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-gray-500">24h</span>
              <span
                className={`font-medium ${
                  priceStats.change24h >= 0 ? "text-green-500" : "text-red-500"
                }`}
              >
                {priceStats.change24h >= 0 ? "+" : ""}
                {priceStats.change24h.toFixed(2)}%
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between mb-4">
        <div className="flex space-x-2">
          <button
            onClick={exportDataAsCSV}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md flex items-center"
            title="Download data as CSV"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 mr-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            CSV
          </button>
        </div>

        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            className={`px-3 py-1 text-sm rounded-md ${
              timeRange === "1d"
                ? "bg-white shadow-sm"
                : "text-gray-600 hover:bg-gray-200"
            }`}
            onClick={() => setTimeRange("1d")}
          >
            1D
          </button>
          <button
            className={`px-3 py-1 text-sm rounded-md ${
              timeRange === "7d"
                ? "bg-white shadow-sm"
                : "text-gray-600 hover:bg-gray-200"
            }`}
            onClick={() => setTimeRange("7d")}
          >
            1W
          </button>
          <button
            className={`px-3 py-1 text-sm rounded-md ${
              timeRange === "30d"
                ? "bg-white shadow-sm"
                : "text-gray-600 hover:bg-gray-200"
            }`}
            onClick={() => setTimeRange("30d")}
          >
            1M
          </button>
          <button
            className={`px-3 py-1 text-sm rounded-md ${
              timeRange === "all"
                ? "bg-white shadow-sm"
                : "text-gray-600 hover:bg-gray-200"
            }`}
            onClick={() => setTimeRange("all")}
          >
            All
          </button>
        </div>
      </div>

      <div className="relative">
        <div ref={chartContainerRef} className="w-full" />
      </div>
    </div>
  );
};

// Wrap the component with dynamic import and disable SSR
export default dynamic(() => Promise.resolve(PriceChart), {
  ssr: false,
  loading: () => (
    <div className="w-full p-4 bg-white rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-4">Loading Chart...</h3>
      <div className="h-[300px] flex items-center justify-center text-gray-500">
        Loading...
      </div>
    </div>
  ),
});
