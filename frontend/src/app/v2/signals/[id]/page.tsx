"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Sidebar from "@/app/components/sidebar";
import Header from "@/app/components/header";
import PriceChart from "@/app/components/price-chart";
import { trackedTokens } from "@/app/shared/tokenData";
import Image from "next/image";
import { getTimeAgo } from "@/app/utils/time";
import { Time } from "lightweight-charts";
import { apiClient } from "@/app/services/api";
import { ENDPOINTS } from "@/app/const/Endpoints";

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

interface PriceData {
  time: Time;
  value: number;
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
  const [signal, setSignal] = useState<SignalData | null>(null);
  const [signals, setSignals] = useState<SignalEvent[]>([]);
  const [prices, setPrices] = useState<PriceData[]>([]);

  const [loading, setLoading] = useState(true);

  const from = "-12h";
  const to = "now";

  const fetchPriceData = async (
    token_id: string,
    timeframe: string,
    from: string,
    to: string
  ) => {
    if (!token_id) return;

    try {
      const response = await apiClient.get({
        url:
          ENDPOINTS.PRICE_DATA.replace(":id", token_id) +
          `?tf=${timeframe}&from=${from}&to=${to}`,
        auth: true,
      });

      if (response.status === 200) {
        const chartData = response.data.map(
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
    return response.data;
  };

  const fetchTokenInfo = async (token_id: string) => {
    const response = await apiClient.get({
      url: ENDPOINTS.TOKEN_INFO.replace(":id", token_id),
      auth: true,
    });
    return response.data;
  };

  const fetchSignalEvents = async (signal_id: string, token_id: string, currency: string) => {
    const response = await apiClient.get({
      url: ENDPOINTS.SIGNAL_EVENTS.replace(":signal_id", signal_id) + "?token=" + token_id + "&curr=" + currency,
      auth: true,
    });
    return response.data;
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
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <PriceChart data={prices} tokenSymbol={token_id || ""} />
      </div>
    );
  };

  useEffect(() => {
    fetchSignalInfo(signal_id);
    fetchTokenInfo(token_id);
    fetchSignalEvents(signal_id, token_id, currency);
  }, [signal_id, token_id, currency]);


  useEffect(() => {
    fetchPriceData(token_id, signal?.timeframe, from, to);
  }, [signal]);

  return (
    <div className="flex-1 overflow-auto bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* add here a whales section with the top 20 holders */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mt-6">

          {/* Table header - visible only on medium screens and up */}
          <div className="gap-4 mb-2 px-4 font-semibold text-gray-700">
            {renderPriceChart()}
          </div>

          {/* Table rows */}
        </div>
      </div>
    </div>
  );
}
