"use client";

import React, { useLayoutEffect, useRef, useState, useEffect } from "react";
import dynamic from "next/dynamic";
import {
  IChartApi,
  createChart,
  ColorType,
  CandlestickSeries,
  CandlestickStyleOptions,
  Time,
  createSeriesMarkers,
  SeriesMarkerPosition,
  SeriesMarkerShape,
  UTCTimestamp,
} from "lightweight-charts";

interface PriceData {
  time: Time;
  open: number;
  high: number;
  low: number;
  close: number;
}


interface Signal {
  action: string;
  price: number;
  timestamp: string; // ISO string like "2025-06-09T07:00:00Z"
  symbol: string;
}

interface PriceChartProps {
  data: PriceData[];
  tokenSymbol: string;
  signals: Signal[];
}

interface PriceStats {
  current: number;
  change1h: number;
  change6h: number;
  change24h: number;
}

const CandlestickChart: React.FC<PriceChartProps> = ({ data, tokenSymbol, signals }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
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

    const current = sortedData[sortedData.length - 1].close;
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
        price1h = dataPoint.close;
      }

      if (itemTimeSec <= sixHoursAgo && price6h === current) {
        price6h = dataPoint.close;
      }

      if (itemTimeSec <= twentyFourHoursAgo && price24h === current) {
        price24h = dataPoint.close;
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
      if (item.close > high.value) {
        high = { value: item.close, time: item.time };
      }
      if (item.close < low.value) {
        low = { value: item.close, time: item.time };
      }
    });

    setAllTimeHighLow({ high, low });
  }, [data]);

  useLayoutEffect(() => {
    if (!isClient || !chartContainerRef.current || !data || data.length === 0)
      return;

    try {
      // Initialize chart
      const chart = createChart(chartContainerRef.current, {
        layout: {
          background: { type: ColorType.Solid, color: "white" },
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
      // const lineSeries = chart.addLineSeries(AreaSeries, {
      //   lineColor: "#2962FF",
      //   topColor: "#2962FF",
      //   bottomColor: "rgba(41, 98, 255, 0.28)",
      //   priceFormat: {
      //     type: "price",
      //     precision: 6,
      //     minMove: 0.000001,
      //   },
      //   // Enable markers for this series
      //   lastValueVisible: true,
      //   crosshairMarkerVisible: true,
      // });


      const candlestickOptions: CandlestickStyleOptions = {
        upColor: '#26a69a',
        downColor: '#ef5350',
        borderVisible: false,
        wickUpColor: '#26a69a',
        wickDownColor: '#ef5350',
        wickVisible: true,
        borderColor: '#000000',
        borderUpColor: '#26a69a',
        borderDownColor: '#ef5350',
        wickColor: '#000000'
      };

      const candlestickSeries = chart.addSeries(CandlestickSeries, candlestickOptions);



      // Transform data to ensure proper time format and unique ascending timestamps
      const formattedData = data
        .map((item, index) => ({
          time: item.time as Time,
          open: item.open,
          high: item.high,
          low: item.low,
          close: item.close,
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
        .map(({ time, open, high, low, close }) => ({ time, open, high, low, close }));


          // Add signal markers
    if (signals && signals.length > 0) {
      const markers = signals.map((signal) => ({
        time: Math.floor(new Date(signal.timestamp).getTime() / 1000) as UTCTimestamp,
        position: (signal.action === "BUY" ? "belowBar" : "aboveBar") as SeriesMarkerPosition,
        color: signal.action === "BUY" ? "#16a34a" : "#dc2626",
        shape: (signal.action === "BUY" ? "arrowUp" : "arrowDown") as SeriesMarkerShape,
        text: signal.action + ' @ ' + signal.price.toFixed(6),
        price: signal.price,
      }));

      createSeriesMarkers(candlestickSeries, markers);
    }

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

      const chartData = data.map((item, index) => ({
        time: (Number(item.time)) as UTCTimestamp,
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close
      }));

      // Sort data in ascending order by timestamp
      const sortedData = chartData.sort((a, b) => a.time - b.time);

      // Set the data
      candlestickSeries.setData(sortedData);

      // Add markers for all-time high and low if they're within the current time range
      if (allTimeHighLow) {
        try {
          // Create colored price lines for ATH and ATL instead of markers
          const high = allTimeHighLow.high.value;
          const low = allTimeHighLow.low.value;

          // Add ATH price line
          candlestickSeries.createPriceLine({
            price: high,
            color: "#22c55e",
            lineWidth: 1,
            lineStyle: 1, // Dotted
            axisLabelVisible: true,
            title: `ATH: $${high.toFixed(6)}`,
          });

          // Add ATL price line
          candlestickSeries.createPriceLine({
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
          const seriesData = param.seriesData.get(candlestickSeries);

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

          const coordinate = candlestickSeries.priceToCoordinate(Number(price));
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
    <div className="w-full">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-4">
        <h3 className="text-lg font-semibold mb-2 md:mb-0">{tokenSymbol}</h3>

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

      <div className="relative">
        <div ref={chartContainerRef} className="w-full" />
      </div>
    </div>
  );
};

// Wrap the component with dynamic import and disable SSR
export default dynamic(() => Promise.resolve(CandlestickChart), {
  ssr: false,
  loading: () => (
    <div className="w-full">
      <h3 className="text-lg font-semibold mb-4">Loading Chart...</h3>
      <div className="h-[300px] flex items-center justify-center text-gray-500">
        Loading...
      </div>
    </div>
  ),
});