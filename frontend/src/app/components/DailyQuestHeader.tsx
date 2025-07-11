"use client";

import React, { useState, useEffect, useRef } from "react";
import { usePrivy } from "@privy-io/react-auth";
import Image from "next/image";
import Cookies from "js-cookie";

interface DailyQuest {
  _id: string;
  questId: string;
  questName: string;
  questDescription: string;
  questImage: string;
  questType: string;
  questRequirement: number;
  questRewardType: string;
  questRewardAmount: number;
  questLevel: number;
  questOrder: number;
  currentProgress: number;
  isCompleted: boolean;
  completedAt: Date | null;
  claimedAt: Date | null;
  isClaimed: boolean;
  progressPercentage: number;
  isActive: boolean;
}

interface DailyQuestData {
  quests: DailyQuest[];
  todayTransactionCount: number;
  todayVolume: number;
  currentStreak: number;
}

const DailyQuestHeader = () => {
  const { authenticated, user } = usePrivy();
  const [dailyQuests, setDailyQuests] = useState<DailyQuestData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [claimedQuests, setClaimedQuests] = useState<Set<string>>(new Set());
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const fetchDailyQuests = async () => {
    if (!authenticated || !user?.wallet?.address) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/activity/daily-quests/${user.wallet.address}`
      );
      const data = await response.json();
      setDailyQuests(data);

      // Track claimed quests
      const claimed: Set<string> = new Set(
        data.quests
          .filter((quest: DailyQuest) => quest.claimedAt)
          .map((quest: DailyQuest) => quest._id)
      );
      setClaimedQuests(claimed);
    } catch (error) {
      console.error("Error fetching daily quests:", error);
    }
  };

  const handleClaimQuest = async (questId: string) => {
    if (!user?.wallet?.address) return;

    setIsLoading(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/activity/daily-quests/claim`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            address: user.wallet.address,
            questId: questId,
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        setClaimedQuests((prev) => new Set(prev).add(questId));
        setSuccessMessage(`Quest completed! +${data.rewardPoints} points`);

        // Refresh quests
        await fetchDailyQuests();

        // Clear success message after 3 seconds
        setTimeout(() => {
          setSuccessMessage(null);
        }, 3000);
      } else {
        console.error("Error claiming quest:", data.error);
      }
    } catch (error) {
      console.error("Error claiming quest:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (authenticated && user?.wallet?.address) {
      fetchDailyQuests();
    }
  }, [authenticated, user?.wallet?.address]);

  // Auto-refresh quests every 30 seconds
  useEffect(() => {
    if (!authenticated || !user?.wallet?.address) return;

    const interval = setInterval(fetchDailyQuests, 30000);
    return () => clearInterval(interval);
  }, [authenticated, user?.wallet?.address]);

  // Click outside to close panel
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target as Node)
      ) {
        setIsExpanded(false);
      }
    };

    if (isExpanded) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isExpanded]);

  if (!authenticated || !dailyQuests) {
    return null;
  }

  // Get the next uncompleted quest
  const nextQuest = dailyQuests.quests.find(
    (quest) => !quest.isClaimed && quest.isActive
  );

  // Get completed quests count
  const completedCount = dailyQuests.quests.filter(
    (quest) => quest.isClaimed
  ).length;

  const totalQuests = dailyQuests.quests.filter(
    (quest) => quest.isActive
  ).length;

  return (
    <div className="relative">
      {/* Daily Quest Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-violet-500 to-indigo-600 text-white rounded-lg text-sm font-medium hover:from-violet-600 hover:to-indigo-700 transition-all duration-200 shadow-md"
      >
        <div className="relative">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          {nextQuest && nextQuest.isCompleted && !nextQuest.isClaimed && (
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
          )}
        </div>
        <span>Daily Quests</span>
        <span className="text-xs bg-white bg-opacity-20 px-1.5 py-0.5 rounded">
          {completedCount}/{totalQuests}
        </span>
      </button>

      {/* Success Message */}
      {successMessage && (
        <div className="absolute top-full left-0 mt-2 px-3 py-2 bg-green-500 text-white text-xs rounded-lg shadow-lg z-50 animate-fade-in">
          {successMessage}
        </div>
      )}

      {/* Expanded Quest Panel */}
      {isExpanded && (
        <div 
          ref={panelRef}
          className="absolute top-full right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-96 overflow-y-auto"
        >
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Daily Quests</h3>
              <button
                onClick={() => setIsExpanded(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Progress Summary */}
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Today's Progress</span>
                <span>
                  {completedCount}/{totalQuests} completed
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-violet-500 to-indigo-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(completedCount / totalQuests) * 100}%` }}
                ></div>
              </div>
            </div>

            {/* Quests List */}
            <div className="space-y-3">
              {dailyQuests.quests
                .filter((quest) => quest.isActive)
                .map((quest) => (
                  <div
                    key={quest._id}
                    className={`p-3 rounded-lg border transition-all duration-200 ${
                      quest.isClaimed
                        ? "bg-green-50 border-green-200"
                        : quest.isCompleted
                        ? "bg-yellow-50 border-yellow-200"
                        : "bg-gray-50 border-gray-200"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 flex items-center justify-center bg-violet-100 rounded-lg flex-shrink-0">
                        <Image
                          src={quest.questImage}
                          alt={quest.questName}
                          width={24}
                          height={24}
                          className="rounded-md"
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-gray-900 text-sm">
                            {quest.questName}
                          </h4>
                          <span className="px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 text-xs font-semibold">
                            +{quest.questRewardAmount} pts
                          </span>
                          {quest.isClaimed && (
                            <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
                              ✓ Claimed
                            </span>
                          )}
                        </div>

                        <p className="text-gray-600 text-xs mb-2">
                          {quest.questDescription}
                        </p>

                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex-1">
                            <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-gradient-to-r from-violet-500 to-indigo-600 h-1.5 rounded-full transition-all duration-300"
                                style={{
                                  width: `${quest.progressPercentage}%`,
                                }}
                              ></div>
                            </div>
                          </div>
                          <span className="text-xs text-gray-500 min-w-fit">
                            {quest.currentProgress}/{quest.questRequirement}
                          </span>
                        </div>

                        {quest.isCompleted && !quest.isClaimed && (
                          <button
                            onClick={() => handleClaimQuest(quest._id)}
                            disabled={isLoading}
                            className="w-full px-3 py-1.5 bg-violet-600 text-white rounded-lg text-xs font-medium hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isLoading ? "Claiming..." : "Claim Reward"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>

            {/* Stats Summary */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-3 gap-2 text-xs text-gray-600">
                <div className="text-center">
                  <div className="font-semibold text-violet-600">
                    {dailyQuests.todayTransactionCount}
                  </div>
                  <div>Today's Trades</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-green-600">
                    ${dailyQuests.todayVolume.toLocaleString()}
                  </div>
                  <div>Today's Volume</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-orange-600">
                    {dailyQuests.currentStreak}
                  </div>
                  <div>Day Streak</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DailyQuestHeader;
