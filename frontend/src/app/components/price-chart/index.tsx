"use client";

import React, {
  useLayoutEffect,
  useRef,
  useState,
  useEffect,
  useMemo,
} from "react";
import dynamic from "next/dynamic";
import {
  IChartApi,
  createChart,
  ColorType,
  AreaSeries,
  Time,
} from "lightweight-charts";
import { getTokenImage } from "@/app/utils/tokens";
import Image from "next/image";

interface PriceData {
  time: Time;
  value: number;
}

interface PriceChartProps {
  data: PriceData[];
  tokenSymbol: string;
  tokenName: string;
  trackedSince?: string;
  signalsGenerated?: number;
}

const PriceChart: React.FC<PriceChartProps> = ({
  data,
  tokenSymbol,
  tokenName,
  trackedSince,
  signalsGenerated,
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [allTimeHighLow, setAllTimeHighLow] = useState<{
    high: { value: number; time: Time };
    low: { value: number; time: Time };
  } | null>(null);
  const [predictionDirection, setPredictionDirection] = useState<"down" | "up">(
    "down"
  );
  const [timeRange, setTimeRange] = useState<"1d" | "7d" | "30d" | "all">(
    "all"
  );
  const [monAmount, setMonAmount] = useState(1);
  const priceStats = useMemo(() => {
    if (!data || data.length === 0) return null;
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
    const now = Date.now() / 1000;
    const oneHourAgo = now - 3600;
    const sixHoursAgo = now - 3600 * 6;
    const twentyFourHoursAgo = now - 3600 * 24;
    let price1h = current,
      price6h = current,
      price24h = current;
    for (let i = sortedData.length - 1; i >= 0; i--) {
      const dataPoint = sortedData[i];
      const itemTimeMs =
        typeof dataPoint.time === "number"
          ? dataPoint.time * 1000
          : new Date(dataPoint.time.toString()).getTime();
      const itemTimeSec = itemTimeMs / 1000;
      if (itemTimeSec <= oneHourAgo && price1h === current)
        price1h = dataPoint.value;
      if (itemTimeSec <= sixHoursAgo && price6h === current)
        price6h = dataPoint.value;
      if (itemTimeSec <= twentyFourHoursAgo && price24h === current)
        price24h = dataPoint.value;
      if (price1h !== current && price6h !== current && price24h !== current)
        break;
    }
    const change1h =
      price1h !== current ? ((current - price1h) / price1h) * 100 : 0;
    const change6h =
      price6h !== current ? ((current - price6h) / price6h) * 100 : 0;
    const change24h =
      price24h !== current ? ((current - price24h) / price24h) * 100 : 0;
    return { current, change1h, change6h, change24h };
  }, [data]);

  useLayoutEffect(() => {
    setIsClient(true);
  }, []);

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
      const lineSeries = chart.addSeries(AreaSeries, {
        lineColor: "#9333ea",
        topColor: "#9333ea",
        bottomColor: "rgba(147, 51, 234, 0.28)",
        priceFormat: {
          type: "price",
          precision: 6,
          minMove: 0.000001,
        },
        // Enable markers for this series
        lastValueVisible: true,
        crosshairMarkerVisible: true,
      });

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
      const uniqueSortedData = Object.values(formattedData)
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

      // Fix: define now before using in filter
      const now = Date.now() / 1000;
      // Filter uniqueSortedData based on timeRange
      const filteredData = uniqueSortedData.filter((item) => {
        const itemTimeMs =
          typeof item.time === "number"
            ? item.time * 1000
            : new Date(item.time.toString()).getTime();
        const itemTimeSec = itemTimeMs / 1000;
        return (
          (timeRange === "1d" && itemTimeSec >= now - 86400) ||
          (timeRange === "7d" && itemTimeSec >= now - 86400 * 7) ||
          (timeRange === "30d" && itemTimeSec >= now - 86400 * 30) ||
          timeRange === "all"
        );
      });

      // Set the data
      lineSeries.setData(filteredData);

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
  }, [data, isClient, allTimeHighLow, timeRange]);

  // CSV export logic
  const exportDataAsCSV = () => {
    if (!data || data.length === 0) return;
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Date,Price\n";
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
    sortedData.forEach((item) => {
      const date =
        typeof item.time === "number"
          ? new Date(item.time * 1000).toISOString()
          : new Date(item.time.toString()).toISOString();
      csvContent += `${date},${item.value}\n`;
    });
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
      <div className="flex gap-6">
        {/* Left Column: Token Info Card + Chart */}
        <div className="flex-1 bg-white rounded-lg flex flex-col gap-4">
          {/* Token Info Card */}
          <div className="bg-gray-50 rounded-lg p-4 flex items-center gap-4 mb-2">
            <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
              {/* Token image from symbol */}
              <Image
                src={getTokenImage(tokenSymbol)}
                width={48}
                height={48}
                alt="Token Avatar"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-lg leading-tight">
                {tokenName}
              </div>
              <div className="text-xs text-gray-500">{tokenSymbol}</div>
            </div>
            <div className="flex flex-col gap-1 text-xs min-w-[120px]">
              <div className="bg-white rounded-md px-3 py-2 flex flex-col items-start border border-gray-100">
                <span className="text-gray-500">Tracked since</span>
                <span className="font-medium text-gray-800">
                  {trackedSince || "N/A"}
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-1 text-xs min-w-[100px]">
              <div className="bg-white rounded-md px-3 py-2 flex flex-col items-start border border-gray-100">
                <span className="text-gray-500">Events generated</span>
                <span className="font-medium text-gray-800">
                  {signalsGenerated ?? "N/A"}
                </span>
              </div>
            </div>
          </div>
          {/* Chart Section */}
          <div className="bg-white rounded-lg">
            <div className="mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
              <div className="flex items-center gap-4">
                <h3 className="text-lg font-semibold">
                  {tokenSymbol} Price Chart
                </h3>
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
              {priceStats && (
                <div className="flex gap-8 items-center">
                  <div className="flex flex-col items-end">
                    <span className="text-xs text-gray-500">Price</span>
                    <span className="font-semibold text-base">
                      ${priceStats.current.toFixed(6)}
                    </span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-xs text-gray-500">1h</span>
                    <span
                      className={`font-medium ${
                        priceStats.change1h >= 0
                          ? "text-green-500"
                          : "text-red-500"
                      }`}
                    >
                      {priceStats.change1h >= 0 ? "+" : ""}
                      {priceStats.change1h.toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-xs text-gray-500">6h</span>
                    <span
                      className={`font-medium ${
                        priceStats.change6h >= 0
                          ? "text-green-500"
                          : "text-red-500"
                      }`}
                    >
                      {priceStats.change6h >= 0 ? "+" : ""}
                      {priceStats.change6h.toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-xs text-gray-500">24h</span>
                    <span
                      className={`font-medium ${
                        priceStats.change24h >= 0
                          ? "text-green-500"
                          : "text-red-500"
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
              <div></div>
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
        </div>

        {/* Prediction Panel */}
        <div className="w-full max-w-xs bg-white rounded-lg shadow-md p-6 flex flex-col gap-4">
          <h4 className="font-semibold text-base mb-1">
            Predict Snapshot Price
          </h4>
          {/* <div className="text-xs text-gray-500 bg-gray-50 rounded-md p-3 mb-2">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Curabitur
            vulputate venenatis ligula, posuere rutrum sapien dictum sit amet.
            Donec eget eros eros. Proin et sem erat. Aliquam vel commodo dui.
          </div> */}
          <div className="flex mb-2">
            <button
              className={`flex-1 py-2 rounded-l-md border font-medium focus:outline-none ${
                predictionDirection === "down"
                  ? "border-purple-500 bg-purple-50 text-purple-700"
                  : "border-gray-200 bg-gray-50 text-gray-700"
              }`}
              onClick={() => setPredictionDirection("down")}
            >
              ↓ Price Down
            </button>
            <button
              className={`flex-1 py-2 rounded-r-md border font-medium focus:outline-none ${
                predictionDirection === "up"
                  ? "border-purple-500 bg-purple-50 text-purple-700"
                  : "border-gray-200 bg-gray-50 text-gray-700"
              }`}
              onClick={() => setPredictionDirection("up")}
            >
              ↑ Price Up
            </button>
          </div>
          <div className="bg-gray-50 rounded-md p-4 flex flex-col items-start mb-2">
            <input
              type="number"
              // no step, only integer values allowed
              value={monAmount}
              onChange={(e) => setMonAmount(Number(e.target.value))}
              className="text-xl font-semibold bg-transparent border-none focus:ring-0 focus:outline-none w-auto p-0 mb-0"
              style={{ width: `${String(monAmount).length + 3}ch` }}
            />
            <span className="text-xs text-gray-500 mt-1">MON</span>
          </div>
          <div className="flex gap-2 mb-2">
            <button
              className="flex-1 py-1 text-xs bg-gray-100 rounded-md font-medium"
              onClick={() => setMonAmount((prev) => +(prev + 1).toFixed(2))}
            >
              +1
            </button>
            <button
              className="flex-1 py-1 text-xs bg-gray-100 rounded-md font-medium"
              onClick={() => setMonAmount((prev) => +(prev + 20).toFixed(2))}
            >
              +20
            </button>
            <button
              className="flex-1 py-1 text-xs bg-gray-100 rounded-md font-medium"
              onClick={() => setMonAmount((prev) => +(prev + 100).toFixed(2))}
            >
              +100
            </button>
            <button
              className="flex-1 py-1 text-xs bg-gray-100 rounded-md font-medium"
              onClick={() => setMonAmount(1000)}
            >
              Max
            </button>
          </div>
          <button className="w-full py-2 rounded-md bg-purple-600 hover:bg-purple-700 text-white font-semibold text-sm mb-2">
            Make Prediction
          </button>
          <div className="flex gap-2 text-xs mb-2">
            <div className="flex-1 bg-gray-100 rounded-md p-2 text-center">
              <div className="text-gray-500">Pool closes in</div>
              <div className="font-semibold text-gray-800">3h : 27m : 15s</div>
            </div>
            <div className="flex-1 bg-gray-100 rounded-md p-2 text-center">
              <div className="text-gray-500">Snapshot in</div>
              <div className="font-semibold text-gray-800">15h : 27m : 15s</div>
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">Users Sentiment</div>
            <div className="flex items-center w-full h-8 rounded-md overflow-hidden border">
              <div
                className="bg-red-100 text-red-600 flex items-center justify-center h-full"
                style={{ width: "41%" }}
              >
                <span className="font-semibold text-sm">41%</span>
              </div>
              <div
                className="bg-green-100 text-green-600 flex items-center justify-center h-full"
                style={{ width: "59%" }}
              >
                <span className="font-semibold text-sm">59%</span>
              </div>
            </div>
          </div>
        </div>
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
