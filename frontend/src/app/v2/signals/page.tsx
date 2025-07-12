"use client";

import React from "react";
import Sidebar from "@/app/components/sidebar";
import Header from "@/app/components/header";
import ProtectPage from "@/app/components/protect-page/index";
import { useRouter } from "next/navigation";
import { useState, useCallback, useEffect } from "react";
import { apiClient } from "@/app/services/api";
import { ENDPOINTS } from "@/app/const/Endpoints";
import { getTimeAgo } from "@/app/utils/time";
import { useSSE } from "@/app/hooks/useSSE";
import { Pagination } from "flowbite-react";

type Signal = {
  id: string;
  name: string;
  timeframe: string;
  description: string;
};

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

type ChartData = {
  timestamp: string;
  price: number;
};

const chart = (data: ChartData[]) => {
  if (!data || data.length === 0) {
    return (
      <div className="w-24 h-8 bg-gray-50 rounded flex items-center justify-center text-gray-400 text-xs">
        No data
      </div>
    );
  }

  // Find min and max values for scaling
  const prices = data.map((d) => d.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice;

  // SVG dimensions
  const width = 100;
  const height = 40;
  const padding = 4;

  // Calculate points for the line
  const points = data
    .map((d, i) => {
      const x = (i / (data.length - 1)) * (width - padding * 2) + padding;
      const y =
        height -
        padding -
        ((d.price - minPrice) / priceRange) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");

  // Create area path
  const firstPoint = points.split(" ")[0];
  const lastPoint = points.split(" ")[points.split(" ").length - 1];
  const areaPath = `M ${firstPoint} L ${points} L ${lastPoint.split(",")[0]},${
    height - padding
  } L ${firstPoint.split(",")[0]},${height - padding} Z`;

  // Determine colors based on price trend
  const firstPrice = data[0].price;
  const lastPrice = data[data.length - 1].price;
  const isPositive = lastPrice >= firstPrice;
  const lineColor = isPositive ? "#22c55e" : "#ef4444";
  const fillColor = isPositive
    ? "rgba(34, 197, 94, 0.1)"
    : "rgba(239, 68, 68, 0.1)";

  return (
    <div className="w-24 h-8">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <path d={areaPath} fill={fillColor} />
        <polyline
          points={points}
          fill="none"
          stroke={lineColor}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};

export default function SignalsPage() {
  const router = useRouter();
  const [selectedPage, setSelectedPage] = useState("V2");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [signals, setSignals] = useState<Map<string, Signal>>(new Map());
  const [events, setEvents] = useState<Event[]>([]);
  const [latestEventId, setLatestEventId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 15;
  const [charts, setCharts] = useState<Map<string, ChartData[]>>(new Map());

  const handleEvent = useCallback(
    (data: Event) => {
      console.log("New sse event", data);
      if (latestEventId === null || data.id > latestEventId) {
        setLatestEventId(data.id);
      }
      setEvents((prev) =>
        [data, ...prev]
          .slice(0, 50)
          .sort(
            (a, b) =>
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          )
      ); // Keep last 50 signals
      setTimeout(() => setLatestEventId(null), 3000); // Remove highlight after 3s
    },
    [latestEventId]
  );

  const navigateToSignalDetail = (id: string) => {
    router.push(`/v2/signals/${id}`);
  };

  const fetchSignals = async () => {
    const response = await apiClient.get({
      url: ENDPOINTS.SIGNALS_LIST,
      auth: true,
    });
    if (response && response.status === 200) {
      const signals = new Map<string, Signal>(
        (response.data as { signals: Signal[] }).signals.map(
          (signal: Signal) => [signal.id, signal]
        )
      );
      setSignals(signals);
    }
  };

  const fetchCharts = useCallback(async (events: Event[]) => {
    for (const event of events) {
      try {
        const response = await apiClient.get({
          url:
            ENDPOINTS.PRICE_DATA.replace(":id", event.token_id) + "?limit=500",
          auth: true,
        });

        // Check if response.data has the expected structure
        if (!response.data) {
          console.warn("No data in response for token", event.token_id);
          continue;
        }

        // Handle different possible response structures
        let chartData: ChartData[] = [];

        if (Array.isArray(response.data)) {
          // If response.data is directly an array
          chartData = response.data.map(
            (item: { timestamp: string; close: number }) => ({
              timestamp: item.timestamp,
              price: item.close,
            })
          );
        } else if (
          response.data &&
          typeof response.data === "object" &&
          "data" in response.data &&
          Array.isArray(response.data.data)
        ) {
          // If response.data.data is the array
          chartData = response.data.data.map(
            (item: { timestamp: string; close: number }) => ({
              timestamp: item.timestamp,
              price: item.close,
            })
          );
        } else {
          console.warn(
            "Unexpected response structure for token",
            event.token_id,
            ":",
            response.data
          );
          continue;
        }

        chartData.sort(
          (a: ChartData, b: ChartData) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

        setCharts((prev) => {
          const newCharts = new Map(prev);
          newCharts.set(event.token_id, chartData);
          return newCharts;
        });
      } catch (error) {
        console.error(
          "Error fetching chart data for token",
          event.token_id,
          ":",
          error
        );
      }
    }
  }, []);

  const fetchEvents = useCallback(async () => {
    const response = await apiClient.get<{ data: Event[] }>({
      url: ENDPOINTS.SIGNAL_EVENTS_ALL,
      auth: true,
    });
    if (response && response.status === 200) {
      const events = Array.isArray(response.data)
        ? response.data.slice(0, 50)
        : [];
      console.log("events", events);
      setEvents(events);
      const uniqueEvents = events.filter(
        (event: Event, index: number, self: Event[]) => {
          return index === self.findIndex((t) => t.token_id === event.token_id);
        }
      );
      fetchCharts(uniqueEvents);
    }
  }, [fetchCharts]);

  useEffect(() => {
    fetchSignals();
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [signals, fetchEvents]);

  useSSE(
    `${process.env.NEXT_PUBLIC_API_V2_URL}${ENDPOINTS.SIGNAL_SSE_EVENTS}`,
    handleEvent
  );

  const colorSignalName = (name: string) => {
    const base =
      "px-2.5 py-1 rounded-md text-sm font-medium text-center inline-block";
    switch (name) {
      case "RSI":
        return (
          <span className={`text-green-700 bg-green-50 ${base}`}>{name}</span>
        );
      case "MACD":
        return (
          <span className={`text-blue-700 bg-blue-50 ${base}`}>{name}</span>
        );
      case "ADX":
        return (
          <span className={`text-orange-700 bg-orange-50 ${base}`}>{name}</span>
        );
      case "SMA":
        return <span className={`text-red-700 bg-red-50 ${base}`}>{name}</span>;
      default:
        return (
          <span className={`text-gray-800 bg-gray-100 ${base}`}>{name}</span>
        );
    }
  };

  const getTimeframeBadge = (timeframe: string) => {
    return (
      <span className="bg-gray-100 text-gray-800 rounded-md px-2.5 py-1 text-sm font-medium inline-block">
        {timeframe}
      </span>
    );
  };

  return (
    <ProtectPage>
      <div className="flex min-h-screen bg-gray-100 text-gray-800">
        {/* Mobile menu button */}
        <button
          className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-full bg-gray-200"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle menu"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d={
                isMobileMenuOpen
                  ? "M6 18L18 6M6 6l12 12"
                  : "M4 6h16M4 12h16M4 18h16"
              }
            />
          </svg>
        </button>

        {/* Sidebar */}
        <div
          className={`
            fixed lg:static
            ${
              isMobileMenuOpen
                ? "translate-x-0"
                : "-translate-x-full lg:translate-x-0"
            }
            transition-transform duration-300 ease-in-out
            z-40 lg:z-0
            bg-white
            shadow-xl lg:shadow-none
            w-64 lg:w-auto
          `}
        >
          <Sidebar
            selectedPage={selectedPage}
            setSelectedPage={setSelectedPage}
          />
        </div>

        {/* Overlay */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <div className="flex-1 overflow-y-auto">
            <div className="w-full max-w-7xl mx-auto p-4 md:p-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                  <h2 className="text-2xl font-bold text-gray-900">
                    V2 Signals
                  </h2>
                  <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
                    <div className="flex flex-wrap gap-2">
                      <select className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-gray-300">
                        <option value="">All Actions</option>
                        <option value="BUY">Buy</option>
                        <option value="SELL">Sell</option>
                      </select>

                      <select className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-gray-300">
                        <option value="">All Timeframes</option>
                        <option value="1h">1 Hour</option>
                        <option value="4h">4 Hours</option>
                        <option value="1d">1 Day</option>
                        <option value="1w">1 Week</option>
                      </select>

                      <select className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-gray-300">
                        <option value="">All Signals</option>
                        <option value="PRICE_CHANGE">Price Change</option>
                        <option value="VOLUME_SPIKE">Volume Spike</option>
                        <option value="ACTIVITY_SPIKE">Activity Spike</option>
                        <option value="HOLDER_CHANGE">Holder Change</option>
                      </select>
                    </div>

                    <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                      <button
                        className="px-4 py-2 text-sm flex items-center justify-center w-16 bg-blue-50 text-blue-700 border-r border-gray-200 transition-all duration-200 hover:bg-blue-100"
                        onClick={() => {
                          /* TODO: Implement filter */
                        }}
                      >
                        All
                      </button>
                      <button
                        className="px-4 py-2 text-sm flex items-center justify-center w-16 bg-white text-gray-600 transition-all duration-200 hover:bg-gray-50 border-r border-gray-200"
                        onClick={() => {
                          /* TODO: Implement filter */
                        }}
                      >
                        Buy
                      </button>
                      <button
                        className="px-4 py-2 text-sm flex items-center justify-center w-16 bg-white text-gray-600 transition-all duration-200 hover:bg-gray-50"
                        onClick={() => {
                          /* TODO: Implement filter */
                        }}
                      >
                        Sell
                      </button>
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <div className="min-w-full">
                    {/* Desktop view */}
                    <div>
                      <table className="w-full border-collapse hidden md:table">
                        <thead className="sticky top-0 bg-white z-10">
                          <tr className="text-left text-sm text-gray-600 bg-gray-50 font-medium border-b border-gray-200">
                            <th className="px-4 py-3 text-sm">ACTION</th>
                            <th className="px-4 py-3 text-sm">PAIR</th>
                            <th className="px-4 py-3 text-sm">PRICE</th>
                            <th className="px-4 py-3 text-sm text-center">
                              CHART
                            </th>
                            <th className="px-4 py-3 text-sm">SIGNAL</th>
                            <th className="px-4 py-3 text-sm">TIMEFRAME</th>
                            <th className="px-4 py-3 text-sm">CREATED</th>
                            <th className="px-4 py-3 text-sm text-center">
                              DECISION
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {events
                            .slice(
                              (currentPage - 1) * rowsPerPage,
                              currentPage * rowsPerPage
                            )
                            .map((event) => (
                              <tr
                                key={event.id}
                                className={`border-b border-gray-100 text-sm transition-colors duration-1000 ${
                                  latestEventId === event.id
                                    ? event.action === "BUY"
                                      ? "bg-emerald-50"
                                      : "bg-rose-50"
                                    : ""
                                }`}
                              >
                                <td className="text-gray-900 px-4 py-2 text-sm">
                                  <div className="flex items-center">
                                    <div
                                      className={`w-5 h-5 rounded-full mr-2 flex items-center justify-center ${
                                        event.action === "BUY"
                                          ? "bg-emerald-500"
                                          : "bg-rose-500"
                                      }`}
                                    >
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="w-3 h-3 text-white"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                      >
                                        {event.action === "BUY" ? (
                                          <>
                                            <line
                                              x1="12"
                                              y1="20"
                                              x2="12"
                                              y2="10"
                                              stroke="currentColor"
                                              strokeWidth="2"
                                            />
                                            <path
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                              strokeWidth={2}
                                              d="M5 15l7-7 7 7"
                                            />
                                          </>
                                        ) : (
                                          <>
                                            <line
                                              x1="12"
                                              y1="4"
                                              x2="12"
                                              y2="14"
                                              stroke="currentColor"
                                              strokeWidth="2"
                                            />
                                            <path
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                              strokeWidth={2}
                                              d="M19 9l-7 7-7-7"
                                            />
                                          </>
                                        )}
                                      </svg>
                                    </div>
                                    <span className="text-sm font-medium text-gray-900">
                                      {event.action.charAt(0).toUpperCase() +
                                        event.action.slice(1).toLowerCase()}
                                    </span>
                                  </div>
                                </td>
                                <td className="text-gray-900 text-sm font-semibold">
                                  <a
                                    className="text-sm font-semibold cursor-pointer px-4 py-2 hover:text-violet-600 transition-colors"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigateToSignalDetail(
                                        `${event.signal_id}|${event.token_id}|${event.currency}`
                                      );
                                    }}
                                  >
                                    {event.symbol}
                                  </a>
                                </td>
                                <td className="text-gray-900 px-4 py-2 text-sm font-medium">
                                  {event.price.toFixed(6)}
                                </td>
                                <td className="text-gray-900 px-4 py-2 text-sm">
                                  <a
                                    className="cursor-pointer hover:opacity-80 transition-opacity"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigateToSignalDetail(
                                        `${event.signal_id}|${event.token_id}|${event.currency}`
                                      );
                                    }}
                                  >
                                    {chart(charts.get(event.token_id) || [])}
                                  </a>
                                </td>
                                <td className="text-gray-900 px-4 py-2 text-sm">
                                  {colorSignalName(
                                    signals.get(event.signal_id)?.name ||
                                      event.signal_id
                                  )}
                                </td>
                                <td className="text-gray-900 px-4 py-3 text-sm">
                                  {getTimeframeBadge(
                                    signals.get(event.signal_id)?.timeframe ||
                                      ""
                                  )}
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-600">
                                  {getTimeAgo(event.timestamp)}
                                </td>
                                <td className="px-4 py-3 text-sm flex justify-end items-center">
                                  <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                                    <button
                                      className="px-3 py-1.5 text-xs flex items-center justify-center w-16 bg-white text-gray-500 transition-all duration-200 hover:bg-gray-50 border-r border-gray-200"
                                      onClick={() => {
                                        // TODO: Implement refuse
                                      }}
                                    >
                                      Refuse
                                    </button>
                                    <button className="px-3 py-1.5 text-xs flex items-center justify-center w-16 bg-blue-50 text-blue-700 transition-all duration-200 hover:bg-blue-100">
                                      Accept
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>

                      {/* Mobile view */}
                      <div className="md:hidden">
                        {events
                          .slice(
                            (currentPage - 1) * rowsPerPage,
                            currentPage * rowsPerPage
                          )
                          .map((event) => (
                            <div
                              key={event.id}
                              className={`border-b border-gray-100 p-4 transition-colors duration-1000 ${
                                latestEventId === event.id
                                  ? event.action === "BUY"
                                    ? "bg-emerald-50"
                                    : "bg-rose-50"
                                  : ""
                              }`}
                            >
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center">
                                  <div
                                    className={`w-6 h-6 rounded-full mr-3 flex items-center justify-center ${
                                      event.action === "BUY"
                                        ? "bg-emerald-500"
                                        : "bg-rose-500"
                                    }`}
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      className="w-4 h-4 text-white"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                    >
                                      {event.action === "BUY" ? (
                                        <>
                                          <line
                                            x1="12"
                                            y1="20"
                                            x2="12"
                                            y2="10"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                          />
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M5 15l7-7 7 7"
                                          />
                                        </>
                                      ) : (
                                        <>
                                          <line
                                            x1="12"
                                            y1="4"
                                            x2="12"
                                            y2="14"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                          />
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M19 9l-7 7-7-7"
                                          />
                                        </>
                                      )}
                                    </svg>
                                  </div>
                                  <div>
                                    <div className="text-lg font-semibold text-gray-900">
                                      {event.symbol}
                                    </div>
                                    <div className="text-sm text-gray-600">
                                      {event.action.charAt(0).toUpperCase() +
                                        event.action.slice(1).toLowerCase()}
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-lg font-bold text-gray-900">
                                    ${event.price.toFixed(6)}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {getTimeAgo(event.timestamp)}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center space-x-2">
                                  {colorSignalName(
                                    signals.get(event.signal_id)?.name ||
                                      event.signal_id
                                  )}
                                  <span className="bg-gray-50 text-gray-700 px-2.5 py-1 rounded-md text-xs font-medium">
                                    {signals.get(event.signal_id)?.timeframe ||
                                      ""}
                                  </span>
                                </div>
                                <a
                                  className="cursor-pointer hover:opacity-80 transition-opacity"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigateToSignalDetail(
                                      `${event.signal_id}|${event.token_id}|${event.currency}`
                                    );
                                  }}
                                >
                                  {chart(charts.get(event.token_id) || [])}
                                </a>
                              </div>

                              <div className="flex justify-end">
                                <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                                  <button
                                    className="px-4 py-2 text-sm flex items-center justify-center w-20 bg-white text-gray-500 transition-all duration-200 hover:bg-gray-50 border-r border-gray-200"
                                    onClick={() => {
                                      // TODO: Implement refuse
                                    }}
                                  >
                                    Refuse
                                  </button>
                                  <button className="px-4 py-2 text-sm flex items-center justify-center w-20 bg-blue-50 text-blue-700 transition-all duration-200 hover:bg-blue-100">
                                    Accept
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>

                      {/* Pagination Controls */}
                      <div className="flex flex-col md:flex-row justify-between items-center p-4 gap-4">
                        <div className="text-sm text-gray-500 text-center md:text-left">
                          <span className="font-normal">Showing</span>{" "}
                          <span className="font-bold">
                            {(currentPage - 1) * rowsPerPage + 1}-
                            {Math.min(currentPage * rowsPerPage, events.length)}
                          </span>{" "}
                          <span className="font-normal">of</span>{" "}
                          <span className="font-bold">{events.length}</span>
                        </div>
                        <div className="flex-grow flex justify-center">
                          <Pagination
                            currentPage={currentPage}
                            totalPages={Math.ceil(events.length / rowsPerPage)}
                            onPageChange={setCurrentPage}
                            showIcons={false}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectPage>
  );
}
