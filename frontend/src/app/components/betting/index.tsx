"use client";

import React, { useState, useEffect } from "react";
import { LoadingOverlay } from "../ui/LoadingSpinner";

const BettingComponent = () => {
  const [betAmount, setBetAmount] = useState<string>("");
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [selectedDirection, setSelectedDirection] = useState<
    "bullish" | "neutral" | "bearish" | null
  >(null);
  const [monBalance, setMonBalance] = useState<number | null>(null);
  const [priceChange, setPriceChange] = useState<number>(0);
  const [nextCheckTime, setNextCheckTime] = useState<Date | null>(null);
  const [bettingEndTime, setBettingEndTime] = useState<Date | null>(null);
  const [isHovered, setIsHovered] = useState<string | null>(null);
  const [currentPhase, setCurrentPhase] = useState<"betting" | "checking">(
    "betting"
  );
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  const [betTotals, setBetTotals] = useState({
    bullish: 0,
    neutral: 0,
    bearish: 0,
  });

  // Simulated current price and MON balance - replace with real API calls
  useEffect(() => {
    // TODO: Replace with real BTC price API
    setCurrentPrice(50000);
    // TODO: Replace with real MON balance API
    setMonBalance(1000);
    // Simulated price change
    setPriceChange(2.5);

    // Calculate betting end time (6 hours from now)
    const bettingEnd = new Date();
    bettingEnd.setHours(bettingEnd.getHours() + 6);
    setBettingEndTime(bettingEnd);

    // Calculate check time (6 hours after betting ends)
    const checkTime = new Date(bettingEnd);
    checkTime.setHours(checkTime.getHours() + 6);
    setNextCheckTime(checkTime);
  }, []);

  // Update current phase and time remaining based on time
  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const targetTime =
        currentPhase === "betting" ? bettingEndTime : nextCheckTime;

      if (!targetTime) return;

      if (now >= targetTime) {
        if (currentPhase === "betting") {
          setCurrentPhase("checking");
          // Recalculate target time for checking phase
          const newTargetTime = new Date(targetTime);
          newTargetTime.setHours(newTargetTime.getHours() + 6);
          setNextCheckTime(newTargetTime);
        }
        return;
      }

      const diff = targetTime.getTime() - now.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
    };

    // Update immediately
    updateTimer();

    // Then update every second
    const interval = setInterval(updateTimer, 1000);

    // Cleanup interval on unmount
    return () => clearInterval(interval);
  }, [currentPhase, bettingEndTime, nextCheckTime]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!currentPrice || !selectedDirection || !monBalance) return;

    const targetPrice =
      selectedDirection === "bullish"
        ? currentPrice * 1.05
        : selectedDirection === "bearish"
        ? currentPrice * 0.95
        : currentPrice;

    // Validate MON balance
    if (Number(betAmount) > monBalance) {
      alert("Insufficient MON balance");
      return;
    }

    // Update bet totals
    setBetTotals((prev) => ({
      ...prev,
      [selectedDirection]: prev[selectedDirection] + Number(betAmount),
    }));

    console.log({
      betAmount,
      currentPrice,
      selectedDirection,
      targetPrice,
      monBalance,
    });
  };

  if (!currentPrice || !monBalance || !nextCheckTime || !bettingEndTime) {
    return (
      <div className="w-full min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="w-full px-3 py-4">
          <div className="flex flex-col items-center justify-center">
            <div className="w-full max-w-5xl">
              <div className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
                <div className="p-4">
                  <LoadingOverlay />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="w-full px-3 py-4">
        <div className="flex flex-col lg:flex-row items-start justify-center gap-4">
          {/* Main betting interface */}
          <div className="w-full lg:w-2/3">
            <div className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-white">
                      BTC Price Prediction
                    </h3>
                    <p className="text-indigo-100 text-sm">
                      Predict BTC price movements and win MON tokens
                    </p>
                  </div>
                  <div className="hidden sm:flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg p-2">
                    <span className="text-sm text-white">Powered by</span>
                    <span className="font-bold text-white">MON</span>
                  </div>
                </div>
              </div>

              <div className="p-4">
                {/* Phase Indicator */}
                <div className="mb-4">
                  <div className="flex items-center justify-between bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-3 border border-gray-200">
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-2 w-2 rounded-full ${
                          currentPhase === "betting"
                            ? "bg-green-500"
                            : "bg-blue-500"
                        }`}
                      ></div>
                      <span className="text-sm font-medium text-gray-700">
                        {currentPhase === "betting"
                          ? "Betting Phase"
                          : "Price Check Phase"}
                      </span>
                    </div>
                    <div className="text-sm font-medium text-gray-600">
                      {currentPhase === "betting"
                        ? `Betting ends in: ${timeRemaining}`
                        : `Price check in: ${timeRemaining}`}
                    </div>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="bg-gradient-to-br from-white to-gray-50 rounded-lg shadow p-4 border border-gray-100 hover:shadow-md transition-all duration-200">
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="text-base font-semibold text-gray-700">
                        BTC Price
                      </h2>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-600 font-medium">
                        Live
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-gray-800">
                      ${currentPrice.toLocaleString()}
                    </p>
                    <div className="flex items-center">
                      <span
                        className={`text-xs font-medium ${
                          priceChange >= 0 ? "text-green-500" : "text-red-500"
                        }`}
                      >
                        {priceChange >= 0 ? "↑" : "↓"} {Math.abs(priceChange)}%
                      </span>
                      <span className="text-xs text-gray-500 ml-2">24h</span>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-white to-gray-50 rounded-lg shadow p-4 border border-gray-100 hover:shadow-md transition-all duration-200">
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="text-base font-semibold text-gray-700">
                        MON Balance
                      </h2>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-600 font-medium">
                        Available
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-gray-800">
                      {monBalance.toLocaleString()} MON
                    </p>
                    <p className="text-xs text-gray-500">
                      ≈ ${(monBalance * 0.1).toLocaleString()}
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-white to-gray-50 rounded-lg shadow p-4 border border-gray-100 hover:shadow-md transition-all duration-200">
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="text-base font-semibold text-gray-700">
                        Next Phase
                      </h2>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-600 font-medium">
                        {currentPhase === "betting" ? "Check" : "Results"}
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-gray-800">
                      {currentPhase === "betting" ? "6 Hours" : "6 Hours"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {currentPhase === "betting"
                        ? `Price check at ${nextCheckTime.toLocaleTimeString()}`
                        : `Results at ${new Date(
                            nextCheckTime.getTime() + 6 * 60 * 60 * 1000
                          ).toLocaleTimeString()}`}
                    </p>
                  </div>
                </div>

                {/* Social Betting Stats */}
                <div className="bg-white rounded-lg shadow p-4 mb-4 border border-gray-100">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">
                      Community Bets
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">
                        Total Volume:
                      </span>
                      <span className="font-semibold text-gray-800">
                        {(
                          betTotals.bullish +
                          betTotals.neutral +
                          betTotals.bearish
                        ).toLocaleString()}{" "}
                        MON
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Bullish Section */}
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border border-green-100">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-green-800">Bullish</h4>
                        <span className="text-sm font-semibold text-green-600">
                          {(
                            (betTotals.bullish /
                              (betTotals.bullish +
                                betTotals.neutral +
                                betTotals.bearish)) *
                            100
                          ).toFixed(1)}
                          %
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-sm text-gray-600">+12 more</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Volume</span>
                        <span className="font-semibold text-green-700">
                          {betTotals.bullish.toLocaleString()} MON
                        </span>
                      </div>
                    </div>

                    {/* Neutral Section */}
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-blue-800">Neutral</h4>
                        <span className="text-sm font-semibold text-blue-600">
                          {(
                            (betTotals.neutral /
                              (betTotals.bullish +
                                betTotals.neutral +
                                betTotals.bearish)) *
                            100
                          ).toFixed(1)}
                          %
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-sm text-gray-600">+8 more</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Volume</span>
                        <span className="font-semibold text-blue-700">
                          {betTotals.neutral.toLocaleString()} MON
                        </span>
                      </div>
                    </div>

                    {/* Bearish Section */}
                    <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-lg p-4 border border-red-100">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-red-800">Bearish</h4>
                        <span className="text-sm font-semibold text-red-600">
                          {(
                            (betTotals.bearish /
                              (betTotals.bullish +
                                betTotals.neutral +
                                betTotals.bearish)) *
                            100
                          ).toFixed(1)}
                          %
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-sm text-gray-600">+5 more</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Volume</span>
                        <span className="font-semibold text-red-700">
                          {betTotals.bearish.toLocaleString()} MON
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Recent Activity */}
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">
                      Recent Activity
                    </h4>
                    <div className="space-y-2">
                      {[...Array(3)].map((_, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-3 text-sm"
                        >
                          <div className="flex-1">
                            <span className="font-medium text-gray-800">
                              User_{i + 10}
                            </span>
                            <span className="text-gray-600"> bet </span>
                            <span className="font-medium text-gray-800">
                              {(Math.random() * 1000).toFixed(0)} MON
                            </span>
                            <span className="text-gray-600"> on </span>
                            <span
                              className={`font-medium ${
                                i % 3 === 0
                                  ? "text-green-600"
                                  : i % 3 === 1
                                  ? "text-blue-600"
                                  : "text-red-600"
                              }`}
                            >
                              {i % 3 === 0
                                ? "Bullish"
                                : i % 3 === 1
                                ? "Neutral"
                                : "Bearish"}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500">
                            {i + 1}m ago
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Betting Form */}
                <div
                  className={`bg-gradient-to-br from-white to-gray-50 rounded-lg shadow p-4 border border-gray-100 ${
                    currentPhase === "checking"
                      ? "opacity-50 pointer-events-none"
                      : ""
                  }`}
                >
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label
                        htmlFor="betAmount"
                        className="block text-base font-medium text-gray-700 mb-2"
                      >
                        Bet Amount
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          id="betAmount"
                          value={betAmount}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setBetAmount(e.target.value)
                          }
                          className="w-full px-3 py-2 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                          placeholder="Enter amount to bet"
                          min="1"
                          max={monBalance}
                          required
                          disabled={currentPhase === "checking"}
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                          MON
                        </div>
                      </div>
                      <div className="flex justify-between mt-2">
                        <p className="text-xs text-gray-500">
                          Available: {monBalance.toLocaleString()} MON
                        </p>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              setBetAmount(
                                String(Math.floor(monBalance * 0.25))
                              )
                            }
                            className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded transition-colors duration-200"
                            disabled={currentPhase === "checking"}
                          >
                            25%
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setBetAmount(String(Math.floor(monBalance * 0.5)))
                            }
                            className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded transition-colors duration-200"
                            disabled={currentPhase === "checking"}
                          >
                            50%
                          </button>
                          <button
                            type="button"
                            onClick={() => setBetAmount(String(monBalance))}
                            className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded transition-colors duration-200"
                            disabled={currentPhase === "checking"}
                          >
                            Max
                          </button>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-base font-medium text-gray-700 mb-2 flex items-center gap-2">
                        BTC Price Direction
                      </label>
                      <div className="grid grid-cols-3 gap-3">
                        <button
                          type="button"
                          onClick={() => setSelectedDirection("bullish")}
                          onMouseEnter={() => setIsHovered("bullish")}
                          onMouseLeave={() => setIsHovered(null)}
                          className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                            selectedDirection === "bullish"
                              ? "border-green-500 bg-green-50 shadow-md"
                              : isHovered === "bullish"
                              ? "border-green-300 bg-green-50/50"
                              : "border-gray-200 hover:border-green-300"
                          } ${
                            currentPhase === "checking"
                              ? "opacity-50 cursor-not-allowed"
                              : ""
                          }`}
                          disabled={currentPhase === "checking"}
                        >
                          <div className="flex flex-col items-center">
                            <div className="text-lg font-bold text-green-600">
                              Bullish
                            </div>
                            <div className="text-sm text-green-500 font-semibold">
                              {">"} +5%
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              ${(currentPrice * 1.05).toLocaleString()}
                            </div>
                            <div className="mt-2 text-xs font-medium text-green-600">
                              Total: {betTotals.bullish.toLocaleString()} MON
                            </div>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedDirection("neutral")}
                          onMouseEnter={() => setIsHovered("neutral")}
                          onMouseLeave={() => setIsHovered(null)}
                          className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                            selectedDirection === "neutral"
                              ? "border-blue-500 bg-blue-50 shadow-md"
                              : isHovered === "neutral"
                              ? "border-blue-300 bg-blue-50/50"
                              : "border-gray-200 hover:border-blue-300"
                          } ${
                            currentPhase === "checking"
                              ? "opacity-50 cursor-not-allowed"
                              : ""
                          }`}
                          disabled={currentPhase === "checking"}
                        >
                          <div className="flex flex-col items-center">
                            <div className="text-lg font-bold text-blue-600">
                              Neutral
                            </div>
                            <div className="text-sm text-blue-500 font-semibold">
                              ±5%
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              ${(currentPrice * 0.95).toLocaleString()} - $
                              {(currentPrice * 1.05).toLocaleString()}
                            </div>
                            <div className="mt-2 text-xs font-medium text-blue-600">
                              Total: {betTotals.neutral.toLocaleString()} MON
                            </div>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedDirection("bearish")}
                          onMouseEnter={() => setIsHovered("bearish")}
                          onMouseLeave={() => setIsHovered(null)}
                          className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                            selectedDirection === "bearish"
                              ? "border-red-500 bg-red-50 shadow-md"
                              : isHovered === "bearish"
                              ? "border-red-300 bg-red-50/50"
                              : "border-gray-200 hover:border-red-300"
                          } ${
                            currentPhase === "checking"
                              ? "opacity-50 cursor-not-allowed"
                              : ""
                          }`}
                          disabled={currentPhase === "checking"}
                        >
                          <div className="flex flex-col items-center">
                            <div className="text-lg font-bold text-red-600">
                              Bearish
                            </div>
                            <div className="text-sm text-red-500 font-semibold">
                              {"<"} -5%
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              ${(currentPrice * 0.95).toLocaleString()}
                            </div>
                            <div className="mt-2 text-xs font-medium text-red-600">
                              Total: {betTotals.bearish.toLocaleString()} MON
                            </div>
                          </div>
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={
                        !selectedDirection ||
                        !betAmount ||
                        Number(betAmount) > monBalance ||
                        currentPhase === "checking"
                      }
                      className={`w-full py-2 px-4 rounded-lg text-base font-semibold transition-all duration-200 ${
                        selectedDirection &&
                        betAmount &&
                        Number(betAmount) <= monBalance &&
                        currentPhase === "betting"
                          ? "bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white hover:shadow-md"
                          : "bg-gray-300 text-gray-500 cursor-not-allowed"
                      }`}
                    >
                      {currentPhase === "checking"
                        ? "Betting Closed"
                        : "Place Bet"}
                    </button>
                  </form>
                </div>

                {/* Active Bets Section */}
                <div className="mt-4 bg-gradient-to-br from-white to-gray-50 rounded-lg shadow border border-gray-200 overflow-hidden">
                  <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 p-3">
                    <h3 className="font-medium text-gray-700">
                      Your Active Bets
                    </h3>
                  </div>
                  <div className="p-4">
                    <div className="text-center py-6">
                      <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                        <svg
                          className="w-6 h-6 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                      <p className="text-gray-500 text-sm font-medium">
                        No active bets yet
                      </p>
                      <p className="text-gray-400 text-xs mt-1">
                        Place your first bet to get started
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 p-3 bg-gradient-to-r from-gray-50 to-gray-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div className="flex items-center text-xs text-gray-500">
                    <span className="mr-1">Powered by</span>
                    <span className="font-medium text-purple-600">
                      Monad 10,000 TPS Infrastructure
                    </span>
                  </div>
                  <div className="flex items-center">
                    <div className="h-1.5 w-1.5 bg-green-500 rounded-full mr-1 flex-shrink-0"></div>
                    <span className="text-xs text-gray-600">
                      Live price predictions
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Betting Rules Side Panel */}
          <div className="w-full lg:w-1/3">
            <div className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden sticky top-4">
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4">
                <h3 className="text-lg font-bold text-white">
                  BTC Betting Rules
                </h3>
              </div>

              <div className="p-4 space-y-4">
                {/* Current BTC Price */}
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-gray-800">
                      Current BTC Price
                    </h4>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-600 font-medium">
                      Live
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-gray-800">
                    ${currentPrice?.toLocaleString()}
                  </p>
                  <div className="flex items-center mt-1">
                    <span
                      className={`text-sm font-medium ${
                        priceChange >= 0 ? "text-green-500" : "text-red-500"
                      }`}
                    >
                      {priceChange >= 0 ? "↑" : "↓"} {Math.abs(priceChange)}%
                    </span>
                    <span className="text-sm text-gray-500 ml-2">
                      24h change
                    </span>
                  </div>
                </div>

                {/* Phase Information */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
                  <h4 className="font-semibold text-blue-800 mb-2">
                    Betting Phases
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-blue-600 font-bold">1</span>
                      </div>
                      <div>
                        <p className="font-medium text-blue-900">
                          Betting Phase
                        </p>
                        <p className="text-sm text-blue-700">
                          6 hours to place your bets
                        </p>
                        <p className="text-xs text-blue-600 mt-1">
                          Ends in: {timeRemaining}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-indigo-600 font-bold">2</span>
                      </div>
                      <div>
                        <p className="font-medium text-indigo-900">
                          Price Check Phase
                        </p>
                        <p className="text-sm text-indigo-700">
                          6 hours to verify price movement
                        </p>
                        <p className="text-xs text-indigo-600 mt-1">
                          Next check: {nextCheckTime?.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Betting Conditions */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-100">
                  <h4 className="font-semibold text-green-800 mb-2">
                    BTC Price Targets
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500 mt-2 flex-shrink-0"></div>
                      <div>
                        <p className="font-medium text-green-900">Bullish</p>
                        <p className="text-sm text-green-700">
                          Price must increase by more than 5%
                        </p>
                        <p className="text-xs text-green-600 mt-1">
                          Target: ${(currentPrice * 1.05).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
                      <div>
                        <p className="font-medium text-blue-900">Neutral</p>
                        <p className="text-sm text-blue-700">
                          Price must stay within ±5% range
                        </p>
                        <p className="text-xs text-blue-600 mt-1">
                          Range: ${(currentPrice * 0.95).toLocaleString()} - $
                          {(currentPrice * 1.05).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-500 mt-2 flex-shrink-0"></div>
                      <div>
                        <p className="font-medium text-red-900">Bearish</p>
                        <p className="text-sm text-red-700">
                          Price must decrease by more than 5%
                        </p>
                        <p className="text-xs text-red-600 mt-1">
                          Target: ${(currentPrice * 0.95).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payout Information */}
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-100">
                  <h4 className="font-semibold text-purple-800 mb-2">
                    Payout Information
                  </h4>
                  <div className="space-y-2">
                    <p className="text-sm text-purple-700">
                      • Winnings are distributed after price check phase
                    </p>
                    <p className="text-sm text-purple-700">
                      • Payouts are proportional to bet amounts
                    </p>
                    <p className="text-sm text-purple-700">
                      • House fee: 2% of total pool
                    </p>
                  </div>
                </div>

                {/* Current Pool Stats */}
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-4 border border-gray-200">
                  <h4 className="font-semibold text-gray-800 mb-2">
                    Current Pool
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total Pool:</span>
                      <span className="font-medium text-gray-800">
                        {(
                          betTotals.bullish +
                          betTotals.neutral +
                          betTotals.bearish
                        ).toLocaleString()}{" "}
                        MON
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Active Bets:</span>
                      <span className="font-medium text-gray-800">
                        {
                          Object.values(betTotals).filter((total) => total > 0)
                            .length
                        }
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BettingComponent;
