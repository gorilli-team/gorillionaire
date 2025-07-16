"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { usePrivy } from "@privy-io/react-auth";
import Image from "next/image";

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
}

const DailyQuestHeader = () => {
  const { authenticated, user } = usePrivy();
  const [dailyQuests, setDailyQuests] = useState<DailyQuestData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [completedQuests, setCompletedQuests] = useState<Set<string>>(
    new Set()
  );
  const [showCompletedQuests, setShowCompletedQuests] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<{ play: () => void } | null>(null);
  const previousQuestsRef = useRef<DailyQuestData | null>(null);

  // Create audio element for quest completion sound
  useEffect(() => {
    // Create a simple beep sound using Web Audio API
    const createBeepSound = () => {
      try {
        const audioContext = new (window.AudioContext ||
          (
            window as unknown as typeof window & {
              webkitAudioContext: typeof AudioContext;
            }
          ).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(
          600,
          audioContext.currentTime + 0.1
        );

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(
          0.01,
          audioContext.currentTime + 0.2
        );

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.2);
      } catch (error) {
        console.error("Audio not supported or blocked by browser", error);
      }
    };

    audioRef.current = { play: createBeepSound };
  }, []);

  const fetchDailyQuests = useCallback(async () => {
    if (!authenticated || !user?.wallet?.address) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/activity/daily-quests/${user.wallet.address}`
      );
      const data = await response.json();

      // Check for newly completed quests and play sound
      if (previousQuestsRef.current) {
        data.quests.forEach((quest: DailyQuest) => {
          const previousQuest = previousQuestsRef.current!.quests.find(
            (q) => q._id === quest._id
          );
          if (
            quest.isCompleted &&
            previousQuest &&
            !previousQuest.isCompleted
          ) {
            // Quest was just completed (whether claimed or not) - play sound
            setCompletedQuests((prev) => new Set(prev).add(quest._id));
          }
        });
      }

      // Update the ref with current data before setting state
      previousQuestsRef.current = data;
      setDailyQuests(data);
    } catch (error) {
      console.error("Error fetching daily quests:", error);
    }
  }, [authenticated, user?.wallet?.address]);

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
        // Play sound when quest is successfully claimed
        if (audioRef.current) {
          audioRef.current.play();
        }

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

  // Initial fetch and auto-refresh combined into one effect
  useEffect(() => {
    if (!authenticated || !user?.wallet?.address) return;

    // Initial fetch
    fetchDailyQuests();

    // Set up auto-refresh interval
    const interval = setInterval(fetchDailyQuests, 30000);

    return () => clearInterval(interval);
  }, [authenticated, user?.wallet?.address, fetchDailyQuests]);

  // Listen for trade completion events to refresh quests
  useEffect(() => {
    const handleTradeCompleted = (event: CustomEvent) => {
      // Only refresh if the trade was made by the current user (case-insensitive comparison)
      if (
        event.detail?.userAddress?.toLowerCase() ===
        user?.wallet?.address?.toLowerCase()
      ) {
        fetchDailyQuests();
      }
    };

    window.addEventListener(
      "tradeCompleted",
      handleTradeCompleted as EventListener
    );

    return () => {
      window.removeEventListener(
        "tradeCompleted",
        handleTradeCompleted as EventListener
      );
    };
  }, [user?.wallet?.address, fetchDailyQuests]);

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

  // Get active quests (not completed) sorted by order
  const activeQuests = dailyQuests.quests
    .filter((quest) => quest.isActive && !quest.isClaimed)
    .sort((a, b) => a.questOrder - b.questOrder);

  // Get completed quests sorted by order
  const claimedQuests = dailyQuests.quests
    .filter((quest) => quest.isActive && quest.isClaimed)
    .sort((a, b) => a.questOrder - b.questOrder);

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
          className="fixed inset-x-0 top-[60px] mx-4 sm:absolute sm:top-full sm:right-0 sm:left-auto sm:w-96 sm:max-w-none sm:mx-0 max-w-none bg-white rounded-t-lg sm:rounded-lg shadow-xl border border-gray-200 z-50 max-h-[80vh] overflow-y-auto"
        >
          <div className="px-4 sm:px-4 py-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Daily Quests</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowCompletedQuests(!showCompletedQuests)}
                  className={`px-2 py-1 text-xs rounded-lg transition-colors sm:px-3 ${
                    showCompletedQuests
                      ? "bg-violet-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {showCompletedQuests ? "Active" : "Completed"}
                </button>
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
            </div>

            {/* Progress Summary */}
            <div className="mb-4 p-2 sm:p-3 bg-gray-50 rounded-lg">
              <div className="flex justify-between text-xs sm:text-sm text-gray-600 mb-2">
                <span>Today&apos;s Progress</span>
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

            {/* Quests List - Show active or completed quests based on toggle */}
            <div className="space-y-2 sm:space-y-3">
              {showCompletedQuests ? (
                // Show completed quests
                claimedQuests.length > 0 ? (
                  claimedQuests.map((quest) => (
                    <div
                      key={quest._id}
                      className="p-2 sm:p-3 rounded-lg border bg-green-50 border-green-200 flex flex-col sm:flex-row gap-2"
                    >
                      <div className="w-10 h-10 flex items-center justify-center bg-green-100 rounded-lg flex-shrink-0 mx-auto sm:mx-0">
                        <Image
                          src={quest.questImage}
                          alt={quest.questName}
                          width={32}
                          height={32}
                          className="rounded-md"
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h4 className="font-semibold text-gray-900 text-xs sm:text-sm">
                            {quest.questName}
                          </h4>
                          <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
                            ✓ Claimed
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 text-xs font-semibold">
                            +{quest.questRewardAmount} pts
                          </span>
                        </div>

                        <p className="text-gray-600 text-xs mb-2">
                          {quest.questDescription}
                        </p>

                        {/* Progress Bar - Show 100% for completed quests */}
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex-1">
                            <div className="w-full bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-2 rounded-full transition-all duration-300 bg-gradient-to-r from-green-500 to-green-600"
                                style={{ width: "100%" }}
                              ></div>
                            </div>
                          </div>
                          <span className="text-xs text-gray-500 min-w-fit">
                            {quest.questRequirement}/{quest.questRequirement}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-sm">No completed quests yet</div>
                    <div className="text-xs mt-1">
                      Complete some quests to see them here!
                    </div>
                  </div>
                )
              ) : // Show active quests
              activeQuests.length > 0 ? (
                activeQuests.map((quest, index) => {
                  const isFirstQuest = index === 0;
                  const isCompleted = quest.isCompleted && !quest.isClaimed;
                  const isNewlyCompleted = completedQuests.has(quest._id);

                  return (
                    <div
                      key={quest._id}
                      className={`p-2 sm:p-3 rounded-lg border transition-all duration-200 flex flex-col sm:flex-row gap-2 ${
                        isCompleted
                          ? "bg-yellow-50 border-yellow-200"
                          : isFirstQuest
                          ? "bg-violet-50 border-violet-200 shadow-md"
                          : "bg-gray-50 border-gray-200"
                      } ${isNewlyCompleted ? "animate-pulse" : ""}`}
                    >
                      <div className="w-10 h-10 flex items-center justify-center bg-violet-100 rounded-lg flex-shrink-0 mx-auto sm:mx-0">
                        <Image
                          src={quest.questImage}
                          alt={quest.questName}
                          width={32}
                          height={32}
                          className="rounded-md"
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h4 className="font-semibold text-gray-900 text-xs sm:text-sm">
                            {quest.questName}
                            {isFirstQuest && !quest.isClaimed && (
                              <span className="ml-2 px-2 py-0.5 bg-violet-600 text-white text-xs rounded-full">
                                Current
                              </span>
                            )}
                          </h4>
                          <span className="px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 text-xs font-semibold">
                            +{quest.questRewardAmount} pts
                          </span>
                          {isCompleted && (
                            <span className="px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 text-xs font-semibold">
                              Ready to Claim
                            </span>
                          )}
                        </div>

                        <p className="text-gray-600 text-xs mb-2">
                          {quest.questDescription}
                        </p>

                        {/* Progress Bar - Show for all active quests */}
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex-1">
                            <div className="w-full bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className={`h-2 rounded-full transition-all duration-300 ${
                                  isFirstQuest
                                    ? "bg-gradient-to-r from-violet-500 to-indigo-600"
                                    : "bg-gradient-to-r from-gray-400 to-gray-500"
                                }`}
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

                        {/* Show claim button for completed quests */}
                        {isCompleted && (
                          <button
                            onClick={() => handleClaimQuest(quest.questId)}
                            disabled={isLoading}
                            className="w-full px-3 py-1.5 bg-violet-600 text-white rounded-lg text-xs font-medium hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isLoading ? "Claiming..." : "Claim Reward"}
                          </button>
                        )}

                        {/* Show next quest indicator */}
                        {!isFirstQuest && !isCompleted && (
                          <div className="text-xs text-gray-500 italic">
                            Complete previous quests first
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-sm">No active quests available</div>
                  <div className="text-xs mt-1">
                    Check back later for new quests!
                  </div>
                </div>
              )}
            </div>

            {/* Stats Summary */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="text-center">
                <div className="font-semibold text-violet-600 text-lg">
                  {dailyQuests.todayTransactionCount}
                </div>
                <div className="text-xs text-gray-600">Today&apos;s Trades</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DailyQuestHeader;
