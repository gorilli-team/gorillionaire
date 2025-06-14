"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import PriceChart from "../../components/price-chart";
import { trackedTokens } from "@/app/shared/tokenData";
import Image from "next/image";
import { getTimeAgo } from "@/app/utils/time";
import { Time } from "lightweight-charts";

interface TokenData {
  address: string;
  name: string;
  symbol: string;
  image?: string;
  trackedSince?: string;
  signalsGenerated?: number;
  holders?: number;
}

interface TokenEvent {
  id: string;
  type: "PRICE_CHANGE" | "VOLUME_SPIKE" | "HOLDER_CHANGE" | "SIGNAL";
  timestamp: string;
  description: string;
  value: string;
  impact: "HIGH" | "MEDIUM" | "LOW";
}

interface PriceData {
  time: Time;
  value: number;
}

export default function TokenPage() {
  const params = useParams();
  const [token, setToken] = useState<TokenData | null>(null);
  const [events, setEvents] = useState<TokenEvent[]>([]);
  const [allEvents, setAllEvents] = useState<TokenEvent[]>([]);
  const [filterLabel, setFilterLabel] = useState("ALL");
  const [filterEvent, setFilterEvent] = useState("ALL");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [eventsNumber, setEventsNumber] = useState(0);
  const [newEventIds, setNewEventIds] = useState<Set<string>>(new Set());
  const [tokenHolders, setTokenHolders] = useState<{
    total: number;
    holders: {
      holder: string;
      amount: number;
      percentage: number;
    }[];
  } | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const [priceData, setPriceData] = useState<PriceData[]>([]);
  const [priceLoading, setPriceLoading] = useState(false);

  const fetchPriceData = async (symbol: string) => {
    if (!symbol) return;

    try {
      setPriceLoading(true);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/events/prices?symbol=${symbol}`
      );

      const data = await response.json();

      if (data.success && data.data) {
        const chartData = data.data.map(
          (item: { timestamp: string; price: number }) => {
            const date = new Date(item.timestamp);
            const timeValue = Math.floor(date.getTime() / 1000);
            return {
              time: timeValue,
              value: item.price,
            };
          }
        );

        chartData.sort(
          (a: PriceData, b: PriceData) =>
            (a.time as number) - (b.time as number)
        );

        setPriceData(chartData);
      }
    } catch (error) {
      console.error("Error fetching price data:", error);
    } finally {
      setPriceLoading(false);
    }
  };

  const fetchHolders = async (tokenAddress: string) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/token/holders/${tokenAddress}`
      );
      const data = await response.json();
      setTokenHolders({
        total: data.total,
        holders: data.holders,
      });
    } catch (error) {
      console.error("Error fetching holders:", error);
    }
  };

  useEffect(() => {
    const fetchTokenData = async () => {
      if (!params.address) return;

      const tokenData = trackedTokens.find(
        (t: TokenData) =>
          t.address.toLowerCase() ===
          (typeof params.address === "string"
            ? params.address.toLowerCase()
            : undefined)
      );

      if (tokenData) {
        if (
          tokenData.name === "Chog" ||
          tokenData.name === "Molandak" ||
          tokenData.name === "Moyaki"
        ) {
          setToken(tokenData);
          if (tokenData.symbol) {
            fetchPriceData(tokenData.symbol);
            fetchHolders(tokenData.address);
          }
        } else {
          setToken(tokenData);
          if (tokenData.symbol) {
            fetchPriceData(tokenData.symbol);
          }
        }
      }

      if (tokenData) {
        if (
          tokenData.name === "Chog" ||
          tokenData.name === "Molandak" ||
          tokenData.name === "Moyaki"
        ) {
          try {
            const response = await fetch(
              `${process.env.NEXT_PUBLIC_API_URL}/events/token/${tokenData.name}`
            );
            const data = await response.json();
            setToken({
              ...tokenData,
              signalsGenerated: data?.pagination?.total,
              trackedSince: data?.tokenInfo?.trackedSince,
            });
            setAllEvents(data?.events || []);
            setEvents(data?.events || []);
            return;
          } catch (error) {
            console.error("Error fetching events:", error);
          }
        } else {
          const randomEvents = generateRandomEvents(
            tokenData,
            tokenData.signalsGenerated || 3
          );
          setAllEvents(randomEvents);
          setEvents(randomEvents);
        }
      }
    };

    fetchTokenData();
  }, [params.address]);

  useEffect(() => {
    if (
      !token ||
      (token.name !== "Chog" &&
        token.name !== "Molandak" &&
        token.name !== "Moyaki")
    ) {
      return;
    }

    if (wsRef.current) {
      wsRef.current.close();
    }

    const wsUrl = `${process.env.NEXT_PUBLIC_API_URL}/events/token/${token.name}`;
    wsRef.current = new WebSocket(wsUrl);

    wsRef.current.onopen = () => {
      console.log("WebSocket connection established");
    };

    wsRef.current.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log("WebSocket message received:", message);

        if (message.type === "NEW_EVENT") {
          const newEvent = message.data;

          setNewEventIds((prevIds) => {
            const updatedIds = new Set(prevIds);
            updatedIds.add(newEvent.id);
            return updatedIds;
          });

          setEvents((prevEvents) => {
            if (prevEvents.some((e) => e.id === newEvent.id)) {
              return prevEvents;
            }
            return [newEvent, ...prevEvents];
          });

          setAllEvents((prevEvents) => {
            if (prevEvents.some((e) => e.id === newEvent.id)) {
              return prevEvents;
            }
            return [newEvent, ...prevEvents];
          });

          setEventsNumber((prev) => prev + 1);

          setTimeout(() => {
            setNewEventIds((prevIds) => {
              const updatedIds = new Set(prevIds);
              updatedIds.delete(newEvent.id);
              return updatedIds;
            });
          }, 5000);
        }
      } catch (error) {
        console.error("Error processing WebSocket message:", error);
      }
    };

    wsRef.current.onclose = () => {
      console.log("WebSocket connection closed");
    };

    wsRef.current.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    return () => {
      if (wsRef.current) {
        console.log("Closing WebSocket connection");
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [token?.name, token]);

  useEffect(() => {
    const fetchFilteredEvents = async () => {
      if (!token) return;

      setPage(1);
      setHasMore(true);

      if (
        token.name === "Chog" ||
        token.name === "Molandak" ||
        token.name === "Moyaki"
      ) {
        try {
          setLoading(true);
          const filterParam =
            filterLabel === "ALL" && filterEvent === "ALL"
              ? ""
              : filterLabel === "ALL"
              ? `&type=${filterEvent}`
              : filterEvent === "ALL"
              ? `&impact=${filterLabel}`
              : `&impact=${filterLabel}&type=${filterEvent}`;
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/events/token/${token.name}?page=1&limit=20${filterParam}`
          );
          const data = await response.json();

          if (data?.events) {
            setEvents(data.events);
            setEventsNumber(data.pagination.total);
            setHasMore(data.events.length === 20 && data.pagination.total > 20);
          } else {
            setEvents([]);
            setHasMore(false);
          }
        } catch (error) {
          console.error("Error fetching filtered events:", error);
          setEvents([]);
        } finally {
          setLoading(false);
        }
      } else {
        if (filterLabel === "ALL") {
          setEvents(allEvents);
        } else {
          const filteredEvents = allEvents.filter(
            (event) => event.impact === filterLabel
          );
          setEvents(filteredEvents);
        }
        if (filterEvent !== "ALL") {
          const filteredEvents = allEvents.filter(
            (event) => event.type === filterEvent
          );
          setEvents(filteredEvents);
        }
      }
    };

    fetchFilteredEvents();
  }, [filterLabel, filterEvent, token, allEvents]);

  const loadMoreEvents = async () => {
    if (!token || loading || !hasMore) return;

    setLoading(true);
    const nextPage = page + 1;

    try {
      if (
        token.name === "Chog" ||
        token.name === "Molandak" ||
        token.name === "Moyaki"
      ) {
        const filterParam =
          filterLabel === "ALL" && filterEvent === "ALL"
            ? ""
            : filterLabel === "ALL"
            ? `&type=${filterEvent}`
            : filterEvent === "ALL"
            ? `&impact=${filterLabel}`
            : `&impact=${filterLabel}&type=${filterEvent}`;
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/events/token/${token.name}?page=${nextPage}&limit=20${filterParam}`
        );
        const data = await response.json();

        if (data?.events && data.events.length > 0) {
          setEvents((prevEvents) => [...prevEvents, ...data.events]);
          setPage(nextPage);
          setHasMore(data.events.length === 20);
        } else {
          setHasMore(false);
        }
      } else {
        const newRandomEvents = generateRandomEvents(token, 20);

        if (filterLabel === "ALL" && filterEvent === "ALL") {
          setEvents((prevEvents) => [...prevEvents, ...newRandomEvents]);
        } else {
          const filteredNewEvents = newRandomEvents.filter(
            (event) =>
              event.impact === filterLabel && event.type === filterEvent
          );
          setEvents((prevEvents) => [...prevEvents, ...filteredNewEvents]);
        }

        setAllEvents((prevEvents) => [...prevEvents, ...newRandomEvents]);
        setPage(nextPage);
      }
    } catch (error) {
      console.error("Error loading more events:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case "HIGH":
        return "bg-red-100 text-red-800";
      case "MEDIUM":
        return "bg-yellow-100 text-yellow-800";
      case "LOW":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case "PRICE_CHANGE":
        return "💰";
      case "VOLUME_SPIKE":
        return "📈";
      case "ACTIVITY_SPIKE":
        return "🔥";
      case "HOLDER_CHANGE":
        return "👥";
      case "SIGNAL":
        return "🎯";
      case "TRANSFER":
        return "💸";
      default:
        return "📊";
    }
  };

  const renderPriceChart = () => {
    if (priceLoading) {
      return (
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <h2 className="text-lg font-semibold mb-2">Price Chart</h2>
          <div className="h-[300px] flex items-center justify-center">
            <span>Loading price data...</span>
          </div>
        </div>
      );
    }

    if (priceData.length === 0) {
      return (
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <h2 className="text-lg font-semibold mb-2">Price Chart</h2>
          <div className="h-[300px] flex items-center justify-center">
            <span>No price data available</span>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <PriceChart data={priceData} tokenSymbol={token?.symbol || ""} />
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-auto bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex items-center">
            {token.image ? (
              <Image
                src={token.image}
                alt={token.name}
                width={64}
                height={64}
                className="rounded-full"
              />
            ) : (
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                <span className="text-2xl font-bold">{token.symbol[0]}</span>
              </div>
            )}
            <div className="ml-4">
              <h1 className="text-2xl font-bold">{token.name}</h1>
              <p className="text-gray-600">{token.symbol}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
            <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
              <p className="text-sm text-gray-600">Tracked Since</p>
              <p className="text-lg sm:text-lg font-semibold truncate">
                {token.trackedSince || "N/A"}
              </p>
            </div>
            <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
              <p className="text-sm text-gray-600">Events Tracked</p>
              <p className="text-lg sm:text-lg font-semibold">
                {eventsNumber || 0}
              </p>
            </div>
            <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
              <p className="text-sm text-gray-600">Holders</p>
              <p className="text-lg sm:text-lg font-semibold">
                {tokenHolders?.total?.toLocaleString() || "N/A"}
              </p>
            </div>
          </div>
        </div>

        {renderPriceChart()}

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold mb-6">Events ({eventsNumber})</h2>
            <div className="flex items-center space-x-4">
              <select
                aria-label="Filter events by type"
                className="w-full sm:w-auto bg-white border border-gray-300 hover:border-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-md px-3 py-2 text-sm font-medium text-gray-700 shadow-sm appearance-none cursor-pointer transition-colors duration-200 focus:outline-none"
                value={filterEvent}
                onChange={(e) => {
                  e.preventDefault();
                  setFilterEvent(e.target.value);
                }}
              >
                <option value="ALL">All Events</option>
                <option value="ACTIVITY_SPIKE">Activity Spike</option>
                <option value="TRANSFER">Transfer</option>
              </select>
              <select
                aria-label="Filter events by level"
                className="w-full sm:w-auto bg-white border border-gray-300 hover:border-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-md px-3 py-2 text-sm font-medium text-gray-700 shadow-sm appearance-none cursor-pointer transition-colors duration-200 focus:outline-none"
                value={filterLabel}
                onChange={(e) => {
                  e.preventDefault();
                  setFilterLabel(e.target.value);
                }}
              >
                <option value="ALL">Levels</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>
          </div>
          <div className="space-y-4">
            {events.map((event) => (
              <div
                key={event.id}
                className={`border-l-4 border-blue-500 pl-4 py-2 ${
                  newEventIds.has(event.id) ? "bg-green-200" : "bg-white"
                } transition-all duration-700 ease-in-out`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="text-2xl mr-2">
                      {getEventTypeIcon(event.type)}
                    </span>
                    <div>
                      <p className="font-semibold">{event.description}</p>
                      <p className="text-sm text-gray-600">
                        {getTimeAgo(event.timestamp)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{event.value}</span>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold ${getImpactColor(
                        event.impact
                      )}`}
                    >
                      {event.impact}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-center mt-6">
            {hasMore && (
              <button
                className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition-colors duration-5000 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={loadMoreEvents}
                disabled={loading}
              >
                {loading ? "Loading..." : "Load More"}
              </button>
            )}
          </div>
        </div>
        {/* add here a whales section with the top 20 holders */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mt-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
            <h2 className="text-xl font-bold">Top 20 Holders</h2>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center">
                <span className="text-2xl mr-1">🐋🐋🐋</span>
                <span className="text-xs bg-blue-100 px-2 py-1 rounded-full">
                  {">"} 10%
                </span>
              </div>
              <div className="flex items-center">
                <span className="text-2xl mr-1">🐋🐋</span>
                <span className="text-xs bg-blue-100 px-2 py-1 rounded-full">
                  5-10%
                </span>
              </div>
              <div className="flex items-center">
                <span className="text-2xl mr-1">🐋</span>
                <span className="text-xs bg-blue-100 px-2 py-1 rounded-full">
                  {"<"} 5%
                </span>
              </div>
            </div>
          </div>

          {/* Table header - visible only on medium screens and up */}
          <div className="hidden md:grid md:grid-cols-5 gap-4 mb-2 px-4 font-semibold text-gray-700">
            <div>Address</div>
            <div className="text-center">Tokens</div>
            <div className="text-center">Classification</div>
            <div className="text-center">Percentage</div>
            <div></div>
          </div>

          {/* Table rows */}
          <div className="space-y-4">
            {tokenHolders?.holders?.map(
              (holder: {
                holder: string;
                amount: number;
                percentage: number;
              }) => (
                <div
                  key={holder.holder}
                  className="border-l-4 border-blue-500 pl-4 py-3 bg-white hover:bg-gray-50 transition-all duration-200 shadow-sm rounded-r"
                >
                  {/* For mobile: Stack layout */}
                  <div className="md:hidden space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="flex-1 break-all">
                        <p className="font-medium text-gray-800">
                          {holder.holder}
                        </p>
                      </div>
                      <div className="ml-2">
                        <button
                          onClick={() => {
                            window.open(
                              `https://testnet.monadexplorer.com/address/${holder.holder}`,
                              "_blank"
                            );
                          }}
                          className="text-sm bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded-md font-medium flex items-center transition-colors"
                        >
                          View
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4 ml-1"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold text-blue-700 text-lg">
                          {holder.amount.toLocaleString()}{" "}
                          <span className="text-xs text-gray-500">tokens</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">
                          {holder.percentage > 10
                            ? "🐋🐋🐋"
                            : holder.percentage > 5
                            ? "🐋🐋"
                            : "🐋"}
                        </span>
                        <span className="font-medium text-blue-600">
                          {holder.percentage.toFixed(2)}%
                        </span>
                      </div>
                    </div>

                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className="bg-blue-600 h-2.5 rounded-full"
                        style={{
                          width: `${Math.min(holder.percentage, 100)}%`,
                        }}
                      ></div>
                    </div>
                  </div>

                  {/* For tablet and desktop: Grid layout */}
                  <div className="hidden md:grid md:grid-cols-5 gap-4 items-center">
                    {/* Column 1: Address */}
                    <div className="overflow-hidden text-ellipsis">
                      <p className="font-medium text-gray-800 hover:overflow-visible hover:text-clip break-all">
                        {holder.holder}
                      </p>
                    </div>

                    {/* Column 2: Token Amount */}
                    <div className="text-center">
                      <p className="font-bold text-blue-700 text-lg">
                        {holder.amount.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500">tokens</p>
                    </div>

                    {/* Column 3: Whale Classification */}
                    <div className="text-center">
                      <span className="text-2xl">
                        {holder.percentage > 10
                          ? "🐋🐋🐋"
                          : holder.percentage > 5
                          ? "🐋🐋"
                          : "🐋"}
                      </span>
                    </div>

                    {/* Column 4: Percentage with Bar */}
                    <div className="flex flex-col items-center">
                      <div className="w-full bg-gray-200 rounded-full h-2.5 mb-1">
                        <div
                          className="bg-blue-600 h-2.5 rounded-full"
                          style={{
                            width: `${Math.min(holder.percentage, 100)}%`,
                          }}
                        ></div>
                      </div>
                      <span className="font-medium text-blue-600">
                        {holder.percentage.toFixed(2)}%
                      </span>
                    </div>

                    {/* Column 5: View Details Button */}
                    <div className="flex justify-end">
                      <button
                        onClick={() => {
                          window.open(
                            `https://testnet.monadexplorer.com/address/${holder.holder}`,
                            "_blank"
                          );
                        }}
                        className="text-sm bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded-md font-medium flex items-center transition-colors"
                      >
                        View Details
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4 ml-1"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function generateRandomEvents(
  tokenData: TokenData,
  count: number
): TokenEvent[] {
  const eventTypes = [
    "PRICE_CHANGE",
    "VOLUME_SPIKE",
    "HOLDER_CHANGE",
    "SIGNAL",
  ] as const;
  const impacts = ["HIGH", "MEDIUM", "LOW"] as const;

  const randomEvents: TokenEvent[] = Array.from(
    { length: count },
    (_, index) => {
      const randomType =
        eventTypes[Math.floor(Math.random() * eventTypes.length)];
      const randomImpact = impacts[Math.floor(Math.random() * impacts.length)];
      const hoursAgo = Math.floor(Math.random() * 24 * (index + 1));

      const descriptions = {
        PRICE_CHANGE: [
          "Price increased significantly",
          "Price dropped sharply",
          "Price showing volatility",
        ],
        VOLUME_SPIKE: [
          "Unusual trading volume detected",
          "Trading volume surge",
          "Volume above average",
        ],
        HOLDER_CHANGE: [
          "New whale wallet detected",
          "Major holder reduced position",
          "Significant holder movement",
        ],
        SIGNAL: [
          "Buy signal generated",
          "Sell signal detected",
          "Trading opportunity identified",
        ],
      };

      const values = {
        PRICE_CHANGE: [`${(Math.random() * 30 - 15).toFixed(1)}%`],
        VOLUME_SPIKE: [`${(Math.random() * 5 + 1).toFixed(1)}x average`],
        HOLDER_CHANGE: [`${(Math.random() * 1000000).toFixed(0)} tokens`],
        SIGNAL: ["Strong", "Moderate", "Weak"],
      };

      return {
        id: `additional-${index}-${Date.now()}`,
        type: randomType,
        timestamp: new Date(Date.now() - hoursAgo * 3600000).toISOString(),
        description: descriptions[randomType][Math.floor(Math.random() * 3)],
        value:
          randomType === "HOLDER_CHANGE"
            ? (Math.random() > 0.5 ? "+" : "-") + values[randomType][0]
            : values[randomType][0],
        impact: randomImpact,
      };
    }
  );

  return randomEvents.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}
