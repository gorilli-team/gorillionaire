"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import Sidebar from "@/app/components/sidebar";
import Header from "@/app/components/header";
import { getTimeAgo } from "@/app/utils/time";
import { apiClient } from "@/app/services/api";
import { ENDPOINTS } from "@/app/const/Endpoints";
import CandlestickChart from "@/app/components/candlestick-chart/index";
import type { Time } from "lightweight-charts";
import ProtectPage from "@/app/components/protect-page/index";

interface SignalData {
  id: string;
  name: string;
  description: string;
  timeframe: string;
}

interface SignalEvent {
  id: string;
  token_id: string;
  signal_id: string;
  signal_name: string;
  action: string;
  symbol: string;
  price: number;
  timestamp: string;
}

interface Token {
  id: string;
  name: string;
  symbol: string;
  image: string;
  trackedSince: string;
  trackingTime: string;
  signalsGenerated: number;
}

interface PriceData {
  id: number;
  token_id: string;
  chain_id: number;
  currency: string;
  high: number;
  low: number;
  open: number;
  close: number;
  volume: number;
  timestamp: string;
}

const parseTimeStringToTimestamp = (timeStr: string): number => {
  const now = Date.now();

  if (timeStr.trim() === "now") {
    return now;
  }

  const regex = /^(-?\d+)([smhdw])$/i; // allow capital letters too
  const match = timeStr.trim().match(regex); // trim spaces

  if (!match) {
    throw new Error(`Invalid time string format: ${timeStr}`);
  }

  const value = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();

  const multipliers: Record<string, number> = {
    s: 1000, // seconds
    m: 60 * 1000, // minutes
    h: 60 * 60 * 1000, // hours
    d: 24 * 60 * 60 * 1000, // days
    w: 7 * 24 * 60 * 60 * 1000, // weeks
  };

  if (!(unit in multipliers)) {
    throw new Error(`Unsupported time unit: ${unit}`);
  }

  return now + value * multipliers[unit];
}

export default function SignalPage() {
  const { id } = useParams<{ id: string }>();
  console.log("id", id);
  const ids = decodeURIComponent(id).split("|");
  console.log("ids", ids);
  const signal_id = ids?.[0];
  const token_id = ids?.[1];
  const currency = ids?.[2];

  console.log("token_id", token_id);
  console.log("signal_id", signal_id);
  console.log("currency", currency);
  
  // Add layout state
  const [selectedPage, setSelectedPage] = useState("V2");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const [signal, setSignal] = useState<SignalData | null>(null);
  const [signals, setSignals] = useState<SignalEvent[]>([]);
  const [token, setToken] = useState<Token | null>(null);
  const [prices, setPrices] = useState<{ time: number; open: number; high: number; low: number; close: number }[]>([]);

  const [loading, setLoading] = useState(true);

  const { from, to } = useMemo(() => {
    return {
      from: parseTimeStringToTimestamp("-6h"),
      to: parseTimeStringToTimestamp("now"),
    };
  }, []);

  const fetchPriceData = async (
    token_id: string,
    timeframe: string,
    from: number,
    to: number
  ) => {
    if (!token_id || !timeframe || !from || !to) return;

    try {
      const response = await apiClient.get({
        url:
          ENDPOINTS.PRICE_DATA.replace(":id", token_id) +
          `?tf=${timeframe}&from=${from}&to=${to}`,
        auth: true,
      });

      if (response.status === 200) {
        console.log("prices", response.data);
        const chartData = (response.data as PriceData[]).map((item: PriceData) => {
          const date = new Date(item.timestamp);
          const timeValue = Math.floor(date.getTime() / 1000);
          return {
            time: timeValue,
            open: item.open,
            high: item.high,
            low: item.low,
            close: item.close,
          };
        });

        chartData.sort(
          (
            a: { time: number; open: number; high: number; low: number; close: number },
            b: { time: number; open: number; high: number; low: number; close: number }
          ) => a.time - b.time
        );

        setPrices(chartData);
      }
    } catch (error) {
      console.error("Error fetching price data:", error);
    }
  };

  const fetchSignalInfo = async (signal_id: string) => {
    const response = await apiClient.get({
      url: ENDPOINTS.SIGNAL_INFO.replace(":id", signal_id),
      auth: true,
    });
    console.log("signal", response.data);
    setSignal(response.data as SignalData);
  };

  const fetchTokenInfo = async (token_id: string) => {
    const response = await apiClient.get({
      url: ENDPOINTS.TOKEN_INFO.replace(":id", token_id),
      auth: true,
    });
    console.log("token", response.data);
    setToken(response.data as Token);
  };

  const fetchSignalEvents = async (
    signal_id: string,
    token_id: string,
    currency: string,
    from: number,
    to: number
  ) => {
    const response = await apiClient.get({
      url:
        ENDPOINTS.SIGNAL_EVENTS.replace(":signal_id", signal_id) +
        "?token=" +
        token_id +
        "&curr=" +
        currency +
        "&from=" +
        from +
        "&to=" +
        to,
      auth: true,
    });
    console.log("signals", response.data);
    const data = response.data as { events: SignalEvent[] };
    setSignals(data.events);
  };

  // const fetchHolders = async (tokenAddress: string) => {
  //   try {
  //     console.log("fetching holders", tokenAddress);
  //     const response = await fetch(
  //       `${process.env.NEXT_PUBLIC_API_URL}/token/holders/${tokenAddress}`
  //     );
  //     const data = await response.json();
  //     console.log("holders", data);
  //     setTokenHolders({
  //       total: data.total,
  //       holders: data.holders,
  //     });
  //   } catch (error) {
  //     console.error("Error fetching holders:", error);
  //   }
  // };

  // const getImpactColor = (impact: string) => {
  //   switch (impact) {
  //     case "HIGH":
  //       return "bg-red-100 text-red-800";
  //     case "MEDIUM":
  //       return "bg-yellow-100 text-yellow-800";
  //     case "LOW":
  //       return "bg-blue-100 text-blue-800";
  //     default:
  //       return "bg-gray-100 text-gray-800";
  //   }
  // };

  // const getEventTypeIcon = (type: string) => {
  //   switch (type) {
  //     case "PRICE_CHANGE":
  //       return "💰";
  //     case "VOLUME_SPIKE":
  //       return "📈";
  //     case "ACTIVITY_SPIKE":
  //       return "🔥";
  //     case "HOLDER_CHANGE":
  //       return "👥";
  //     case "SIGNAL":
  //       return "🎯";
  //     case "TRANSFER":
  //       return "💸";
  //     default:
  //       return "📊";
  //   }
  // };

  const renderPriceChart = () => {
    if (loading) {
      return (
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <h2 className="text-lg font-semibold mb-2">Price Chart</h2>
          <div className="h-[300px] flex items-center justify-center">
            <span>Loading price data...</span>
          </div>
        </div>
      );
    }

    if (prices.length === 0) {
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
      <CandlestickChart
        data={prices.map(item => ({
          ...item,
          time: item.time as Time
        }))}
        tokenSymbol={
          token?.symbol + " - " + signal?.name + " - " + signal?.timeframe
        }
        signals={signals}
      />
    );
  };

  useEffect(() => {
    fetchSignalInfo(signal_id);
    fetchTokenInfo(token_id);
    fetchSignalEvents(signal_id, token_id, currency, from, to);
  }, [signal_id, token_id, currency, from, to]);

  useEffect(() => {
    if (signal && token_id) {
      fetchPriceData(token_id, signal?.timeframe, from, to);
      setLoading(false);
    }
  }, [signal, token_id, from, to]);

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
              <div className="grid grid-cols-3 gap-4">
                {/* Chart section */}
                <div className="col-span-2 gap-4 mb-2 px-4 font-semibold text-gray-700 p-4 bg-white rounded-lg shadow-md">
                  {renderPriceChart()}
                </div>
                
                {/* Signal Events section */}
                <div className="bg-white rounded-lg shadow-md p-4 text-xs col-span-1">
                  <h2 className="font-semibold mb-2">Signal Events</h2>
                  {signals.map((event: SignalEvent, index: number) => (
                    <div
                      key={index || event.id}
                      className="bg-white rounded-lg p-4 text-xs border border-gray-100"
                    >
                      <div
                        key={event.id}
                        className=" grid grid-cols-2 border-b border-gray-100"
                      >
                        <div className="flex items-center">
                          <div
                            className={`w-4 h-4 rounded-full mr-2 flex items-center justify-center ${
                              event.action === "BUY" ? "bg-green-400" : "bg-red-400"
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
                        <div className="px-4 py-2 text-xs flex justify-end items-center">
                          <button
                            className="text-xs cursor-pointer px-3 py-1 rounded-md bg-white text-gray-800 hover:bg-gray-100 border border-gray-300 mr-2"
                            onClick={() => {
                              // TODO: Implement refuse
                            }}
                          >
                            Refuse
                          </button>
                          <button className="text-xs cursor-pointer px-3 py-1 rounded-md bg-purple-600 text-white hover:bg-purple-700">
                            Accept
                          </button>
                        </div>
                      </div>
                      <div className="items-center grid grid-cols-3 text-xs mt-2">
                        <div className="">
                          <div className="text-xs">Price</div>
                          <div className="text-xs">{event.price.toFixed(6)}</div>
                        </div>
                        <div className="">
                          <div className="text-xs">Created</div>
                          <div className="text-xs">{getTimeAgo(event.timestamp)}</div>
                        </div>
                        <div className="">
                          <div className="text-xs">User Actions</div>
                          <div className="text-xs"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectPage>
  );
}