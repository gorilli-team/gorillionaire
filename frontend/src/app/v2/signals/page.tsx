"use client";

import ProtectPage from "@/app/components/protect-page/index";
import { useRouter } from "next/navigation";
import { useState, useCallback, useEffect } from "react";
import { apiClient } from "@/app/services/api";
import { ENDPOINTS } from "@/app/const/Endpoints";
import { getTimeAgo } from "@/app/utils/time";
import { useSSE } from "@/app/hooks/useSSE";
import { Pagination } from "flowbite-react";
import { usePrivy } from "@privy-io/react-auth";
import { useTrade } from "@/app/contexts/TradeContext";
import { useAccount } from "wagmi";
import { Token } from "@/app/types";
import { getTokenImage } from "@/app/utils/tokens";

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

type PriceData = {
  timestamp: string;
  close: number;
};

type TokenData = {
  token_id: string;
  symbol: string;
  name: string;
  decimal: string;
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
  const [hasAccess, setHasAccess] = useState(false);
  const [signals, setSignals] = useState<Map<string, Signal>>(new Map());
  const [tokens, setTokens] = useState<Map<string, Token>>(new Map());
  const [events, setEvents] = useState<Event[]>([]);
  const [latestEventId, setLatestEventId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 15;
  const [charts, setCharts] = useState<Map<string, ChartData[]>>(new Map());
  const { user } = usePrivy();
  const { handleOptionSelect } = useTrade();
  const { chainId } = useAccount();

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

  const fetchSignals = useCallback(async () => {
    const response = await apiClient.get<{ signals: Signal[] }>({
      url: ENDPOINTS.SIGNALS_LIST,
      auth: true,
    });
    if (response && response.status === 200) {
      const signals = new Map<string, Signal>(
        response.data.signals.map((signal: Signal) => [signal.id, signal])
      );
      setSignals(signals);
    }
  }, []);

  const fetchCharts = useCallback(async (events: Event[]) => {
    for (const event of events) {
      const response = await apiClient.get<PriceData[]>({
        url: ENDPOINTS.PRICE_DATA.replace(":id", event.token_id) + "?limit=500",
        auth: true,
      });
      const chartData = response.data.map((item: PriceData) => ({
        timestamp: item.timestamp,
        price: item.close,
      }));
      chartData.sort(
        (a: ChartData, b: ChartData) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      setCharts((prev) => {
        const newCharts = new Map(prev);
        newCharts.set(event.token_id, chartData);
        return newCharts;
      });
    }
  }, []);

  const fetchEvents = useCallback(async () => {
    const response = await apiClient.get<Event[]>({
      url: ENDPOINTS.SIGNAL_EVENTS_ALL,
      auth: true,
    });
    if (response && response.status === 200) {
      const events = response.data.slice(0, 50);
      console.log("events", events);
      setEvents(events);
      const uniqueEvents = events.filter(
        (event: Event, index: number, self: Event[]) => {
          return index === self.findIndex((t) => t.token_id === event.token_id);
        }
      );
      fetchCharts(uniqueEvents);
    } else {
      console.log("error", response);
    }
  }, [fetchCharts]);

  const fetchTokens = useCallback(async () => {
    const response = await apiClient.get<TokenData[]>({
      url: ENDPOINTS.TOKENS_INFO + "?type=token",
      auth: true,
    });
    if (response && response.status === 200) {
      const tokens = response.data;
      console.log("tokens", tokens);
      setTokens((prev) => {
        const newTokens = new Map(prev);
        tokens.forEach((token: TokenData) => {
          const token_ids = token.token_id.split(":");
          const chainId = parseInt(token_ids[0]);
          const tokenAddress = token_ids[1];
          newTokens.set(token.symbol, {
            symbol: token.symbol,
            name: token.name,
            decimals: parseInt(token.decimal),
            address: tokenAddress as `0x${string}`,
            chainId: chainId,
            totalHolding: 0,
            price: 0,
            imageUrl: getTokenImage(token.symbol),
          });
        });
        return newTokens;
      });
    }
  }, []);

  useEffect(() => {
    const access = localStorage.getItem("hasAccess");
    if (!access) {
      router.push("/v2/access");
    } else {
      setHasAccess(true);
    }
  }, [router]);

  useEffect(() => {
    fetchSignals();
    fetchTokens();
  }, [fetchTokens, fetchSignals]);

  useEffect(() => {
    fetchEvents();
  }, [signals, fetchEvents]);

  useSSE(
    `${process.env.NEXT_PUBLIC_API_V2_URL}${ENDPOINTS.SIGNAL_SSE_EVENTS}`,
    handleEvent
  );

  const colorSignalName = (name: string) => {
    switch (name) {
      case "RSI":
        return (
          <span className="bg-blue-200 text-blue-800 px-2 py-1 rounded-md text-xs">
            {name}
          </span>
        );
      case "MACD":
        return (
          <span className="bg-pink-200 text-pink-800 px-2 py-1 rounded-md text-xs">
            {name}
          </span>
        );
      case "ADX":
        return (
          <span className="bg-orange-200 text-orange-800 px-2 py-1 rounded-md text-xs">
            {name}
          </span>
        );
      default:
        return name;
    }
  };

  if (!hasAccess) {
    return null;
  }

  return (
    <ProtectPage>
      <div className="w-full min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
        <div className="bg-white rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold px-4 py-2">Signals</h2>
            <div className="flex items-center">
              <select className="border border-gray-300 rounded-md px-3 py-1 text-xs mr-2">
                <option value="">All Actions</option>
                <option value="BUY">Buy</option>
                <option value="SELL">Sell</option>
              </select>

              <select className="border border-gray-300 rounded-md px-3 py-1 text-xs mr-2">
                <option value="">All Timeframes</option>
                <option value="1h">1 Hour</option>
                <option value="4h">4 Hours</option>
                <option value="1d">1 Day</option>
                <option value="1w">1 Week</option>
              </select>

              <select className="border border-gray-300 rounded-md px-3 py-1 text-xs">
                <option value="">All Signals</option>
                <option value="PRICE_CHANGE">Price Change</option>
                <option value="VOLUME_SPIKE">Volume Spike</option>
                <option value="ACTIVITY_SPIKE">Activity Spike</option>
                <option value="HOLDER_CHANGE">Holder Change</option>
              </select>

              <div>
                <div className="flex items-center space-x-2 ml-4 mr-4">
                  <button
                    className="w-20 px-3 py-1 text-xs rounded-md bg-white text-gray-500 hover:bg-gray-100 border border-gray-300"
                    onClick={() => {
                      /* TODO: Implement filter */
                    }}
                  >
                    All
                  </button>
                  <button
                    className="w-20 px-3 py-1 text-xs rounded-md bg-white text-gray-500 hover:bg-gray-100 border border-gray-300"
                    onClick={() => {
                      /* TODO: Implement filter */
                    }}
                  >
                    Buy
                  </button>
                  <button
                    className="w-20 px-3 py-1 text-xs rounded-md bg-white text-gray-500 hover:bg-gray-100 border border-gray-300"
                    onClick={() => {
                      /* TODO: Implement filter */
                    }}
                  >
                    Sell
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <div className="min-w-full">
              {/* Desktop view */}
              <div>
                <table className="w-full border-collapse hidden md:table">
                  <thead className="sticky top-0 bg-white z-10">
                    <tr className="text-left text-xs text-gray-500 bg-gray-50">
                      <th className="px-4 py-2 text-xs">ACTION</th>
                      <th className="px-4 py-2 text-xs">SYMBOL</th>
                      <th className="px-4 py-2 text-xs">PRICE</th>
                      <th className="px-4 py-2 text-xs text-center">CHART</th>
                      <th className="px-4 py-2 text-xs">SIGNAL</th>
                      <th className="px-4 py-2 text-xs">TIMEFRAME</th>
                      <th className="px-4 py-2 text-xs">CREATED</th>
                      <th className="px-4 py-2 text-xs text-center">ACTIONS</th>
                      <th className="px-4 py-2 text-xs text-center">
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
                          className={`border-b border-gray-100 text-xs text-gray-500 transition-colors duration-1000 ${
                            latestEventId === event.id
                              ? event.action === "BUY"
                                ? "bg-green-100"
                                : "bg-red-100"
                              : ""
                          }`}
                        >
                          <td className="text-gray-500 px-4 py-2 text-xs">
                            <div className="flex items-center">
                              <div
                                className={`w-4 h-4 rounded-full mr-2 flex items-center justify-center ${
                                  event.action === "BUY"
                                    ? "bg-green-400"
                                    : "bg-red-400"
                                }`}
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="w-3 h-4 text-white"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
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
                              <span className="text-xs">
                                {event.action.charAt(0).toUpperCase() +
                                  event.action.slice(1).toLowerCase()}
                              </span>
                            </div>
                          </td>
                          <td className="text-gray-500 text-xs font-bold">
                            <a
                              className="text-xs cursor-pointer px-4 py-2 hover:underline"
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
                          <td className="text-gray-500 px-4 py-2 text-xs">
                            {event.price.toFixed(6)}
                          </td>
                          <td className="text-gray-500 px-4 py-2 text-xs">
                            <a
                              className="cursor-pointer"
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
                          <td className="text-gray-500 px-4 py-2 text-xs">
                            {colorSignalName(
                              signals.get(event.signal_id)?.name ||
                                event.signal_id
                            )}
                          </td>
                          <td className="text-gray-500 px-4 py-2 text-xs">
                            <span className="bg-gray-200 text-gray-800 px-2 py-1 rounded-md text-xs">
                              {signals.get(event.signal_id)?.timeframe || ""}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-xs">
                            {getTimeAgo(event.timestamp)}
                          </td>
                          <td className="px-4 py-2 text-xs"></td>
                          <td className="px-4 py-2 text-xs flex justify-end items-center">
                            <button
                              className="text-xs cursor-pointer px-3 py-1 rounded-md bg-white text-gray-800 hover:bg-gray-100 border border-gray-300 mr-2"
                              onClick={() => {
                                handleOptionSelect({
                                  signal_id: event.signal_id,
                                  option: "No",
                                  user: user
                                    ? {
                                        wallet: {
                                          address: user.wallet?.address || "",
                                        },
                                      }
                                    : null,
                                  tokens: event.symbol
                                    .split("/")
                                    .map(
                                      (symbol) => tokens.get(symbol) as Token
                                    ),
                                  chainId: chainId || null,
                                });
                              }}
                            >
                              Refuse
                            </button>
                            <button
                              className="text-xs cursor-pointer px-3 py-1 rounded-md bg-purple-600 text-white hover:bg-purple-700"
                              onClick={() => {
                                handleOptionSelect({
                                  signal_id: event.signal_id,
                                  option: "Yes",
                                  user: user
                                    ? {
                                        wallet: {
                                          address: user.wallet?.address || "",
                                        },
                                      }
                                    : null,
                                  tokens: event.symbol
                                    .split("/")
                                    .map(
                                      (symbol) => tokens.get(symbol) as Token
                                    ),
                                  amount: event.price,
                                  type: event.action,
                                  chainId: chainId || null,
                                });
                              }}
                            >
                              Accept
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>

                {/* Pagination Controls */}
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-500">
                    <span className="text-sm text-gray-500 mb-4 sm:mb-0">
                      <span className="font-normal">Showing</span>{" "}
                      <span className="font-bold">
                        {(currentPage - 1) * rowsPerPage + 1}-
                        {Math.min(currentPage * rowsPerPage, events.length)}
                      </span>{" "}
                      <span className="font-normal">of</span>{" "}
                      <span className="font-bold">{events.length}</span>
                    </span>
                  </div>
                  <div className="flex-grow flex justify-center mb-2">
                    <Pagination
                      currentPage={currentPage}
                      totalPages={events.length}
                      onPageChange={() =>
                        setCurrentPage((prev) =>
                          Math.min(
                            prev + 1,
                            Math.ceil(events.length / rowsPerPage)
                          )
                        )
                      }
                      showIcons={false}
                    />
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
