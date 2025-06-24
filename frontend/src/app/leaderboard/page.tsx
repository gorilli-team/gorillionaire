"use client";

import React, { useState } from "react";
import Sidebar from "@/app/components/sidebar";
import Header from "@/app/components/header";
import LeaderboardComponent from "@/app/components/leaderboard/index";
import WeeklyLeaderboardComponent from "@/app/components/leaderboard/WeeklyLeaderboard";

const LeaderboardPage = () => {
  const [selectedPage, setSelectedPage] = useState("Leaderboard");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"all-time" | "weekly">("all-time");

  return (
    <div className="flex h-screen bg-gray-100 text-gray-800 overflow-hidden">
      {/* Mobile menu button - adjusted positioning */}
      <button
        aria-label="hamburger menu"
        className="rounded-full lg:hidden fixed top-4 left-4 z-50 p-2 bg-gray-200"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
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

      {/* Sidebar with adjusted width and positioning */}
      <div
        className={`
          fixed lg:static
          w-64
          h-full
          ${isMobileMenuOpen ? "left-0" : "-left-64 lg:left-0"}
          top-0
          z-40 lg:z-0
          bg-white
          shadow-xl lg:shadow-none
          transition-all duration-300 ease-in-out
        `}
      >
        <Sidebar
          selectedPage={selectedPage}
          setSelectedPage={setSelectedPage}
        />
      </div>

      {/* Overlay for mobile - increased z-index */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Main content with adjusted width and positioning */}
      <div className="lg:ml-0 flex-1 flex flex-col w-full overflow-hidden">
        <Header />
        <div className="flex-1 overflow-auto pb-20">
          {/* Tab Navigation */}
          <div className="w-full bg-white border-b border-gray-200 px-4 py-2">
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg max-w-md mx-auto">
              <button
                onClick={() => setActiveTab("all-time")}
                className={`flex-1 py-2 px-4 rounded-md text-md font-medium transition-colors ${
                  activeTab === "all-time"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                All-Time
              </button>
              <button
                onClick={() => setActiveTab("weekly")}
                className={`flex-1 py-2 px-4 rounded-md text-md font-medium transition-colors ${
                  activeTab === "weekly"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                🦍 This Week
              </button>
            </div>
          </div>

          {/* Leaderboard Content */}
          {activeTab === "all-time" ? (
            <LeaderboardComponent />
          ) : (
            <WeeklyLeaderboardComponent />
          )}
        </div>
      </div>
    </div>
  );
};

export default LeaderboardPage;
