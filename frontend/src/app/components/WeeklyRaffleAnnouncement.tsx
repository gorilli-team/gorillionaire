"use client";

import React from "react";
import Link from "next/link";

interface WeeklyRaffleAnnouncementProps {
  variant?: "banner" | "card" | "inline";
  showCTA?: boolean;
}

export default function WeeklyRaffleAnnouncement({
  variant = "card",
  showCTA = true,
}: WeeklyRaffleAnnouncementProps) {
  const baseClasses =
    "bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200 rounded-lg p-4";
  const bannerClasses =
    "bg-gradient-to-r from-violet-600 to-purple-600 text-white py-3 px-4 rounded-lg";

  const containerClasses = variant === "banner" ? bannerClasses : baseClasses;
  const textColor = variant === "banner" ? "text-white" : "text-violet-800";
  const subTextColor =
    variant === "banner" ? "text-violet-100" : "text-violet-600";

  return (
    <div className={containerClasses}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🏆</span>
            <div>
              <div className={`font-bold ${textColor}`}>
                Weekly Raffle Competition
              </div>
              <div className={`text-sm ${subTextColor}`}>
                50 MON to 5 winners • Reset every Monday
              </div>
            </div>
          </div>
        </div>

        {showCTA && (
          <Link
            href="/leaderboard"
            className={`px-4 py-2 rounded-md font-semibold text-sm transition-colors duration-200 ${
              variant === "banner"
                ? "bg-white text-violet-600 hover:bg-gray-100"
                : "bg-violet-600 text-white hover:bg-violet-700"
            }`}
          >
            View Leaderboard
          </Link>
        )}
      </div>
    </div>
  );
}
