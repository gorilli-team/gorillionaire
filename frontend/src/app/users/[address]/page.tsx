"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { nnsClient } from "@/app/providers";
import { getTimeAgo } from "@/app/utils/time";
import { HexString } from "@/app/types";
import Sidebar from "@/app/components/sidebar";
import Header from "@/app/components/header";
import { useReadContract, useAccount } from "wagmi";
import { abi } from "@/app/abi/early-nft";
import { NFT_ACCESS_ADDRESS } from "@/app/utils/constants";
import { getLevelInfo, getXpProgress } from "@/app/utils/xp";
import { LoadingOverlay } from "@/app/components/ui/LoadingSpinner";

const formatNumber = (num: number): string => {
  if (num === 0) return "0.00";
  if (num < 0.000001) return num.toExponential(6);
  if (num < 0.01) return num.toFixed(8);
  if (num < 1) return num.toFixed(6);
  if (num < 100) return num.toFixed(4);
  return num.toFixed(2);
};

interface UserActivity {
  name: string;
  points: string;
  date: string;
  intentId: {
    tokenSymbol: string;
    tokenAmount: number;
    action: "buy" | "sell";
    txHash: string;
    tokenPrice: number;
  };
  signalId: string;
}

interface UserProfile {
  address: string;
  nadName?: string;
  nadAvatar?: string;
  points: number;
  rank: string;
  activitiesList: UserActivity[];
  dollarValue: number;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  hasV2NFT?: boolean;
}

interface Quest {
  _id: string;
  questName: string;
  questDescription: string;
  questImage: string;
  questType: string;
  questRequirement: number;
  questRewardType: string;
  questRewardAmount: number;
  currentProgress: number;
  isCompleted: boolean;
  completedAt: Date | null;
  claimedAt: Date | null;
  isClaimed: boolean;
  progressPercentage: number;
}

const UserProfilePage = () => {
  const params = useParams();
  const { address: connectedAddress } = useAccount();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPage, setSelectedPage] = useState("Profile");
  const [quests, setQuests] = useState<Quest[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [discordUsername, setDiscordUsername] = useState<string | null>(null);
  const [discordQuestCompleted, setDiscordQuestCompleted] = useState(false);
  const [claimedQuests, setClaimedQuests] = useState<Set<string>>(new Set());
  const currentPage = 1;
  const itemsPerPage = 5;
  const [discordError, setDiscordError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { data: v2NFTBalance } = useReadContract({
    abi,
    functionName: "balanceOf",
    address: NFT_ACCESS_ADDRESS,
    args: [params.address as `0x${string}`],
  });

  const isOwnProfile =
    connectedAddress?.toLowerCase() ===
    params.address?.toString().toLowerCase();

  const handleClaimQuest = async (questId: string) => {
    if (!params.address) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/activity/quests/claim`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            address: params.address,
            questId: questId,
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        setClaimedQuests((prev) => new Set(prev).add(questId));
        setSuccessMessage("Quest completed successfully! 🎉");

        // Clear success message after 3 seconds
        setTimeout(() => {
          setSuccessMessage(null);
        }, 3000);

        await fetchUserQuests();

        const profileResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/activity/track/me?address=${params.address}&page=${currentPage}&limit=${itemsPerPage}`
        );
        const profileData = await profileResponse.json();

        if (profileData.userActivity) {
          setUserProfile((prev) =>
            prev
              ? {
                  ...prev,
                  points: profileData.userActivity.points,
                  activitiesList: profileData.userActivity.activitiesList,
                }
              : null
          );
        }
      } else {
        console.error("Error claiming quest:", data.error);
        setDiscordError(
          data.error || "Failed to claim quest. Please try again."
        );
      }
    } catch (error) {
      console.error("Error claiming quest:", error);
      setDiscordError(
        "An error occurred while claiming the quest. Please try again."
      );
    }
  };

  const fetchUserQuests = async () => {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/activity/quests/${params.address}`
    );
    const data = await response.json();
    setQuests(data.quests);

    const alreadyClaimed: Set<string> = new Set(
      data.quests
        .filter((quest: Quest) => quest.claimedAt)
        .map((quest: Quest) => quest._id)
    );
    setClaimedQuests(alreadyClaimed);
  };

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const address = params.address as string;

        if (!address) return;
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/activity/track/me?address=${address}&page=${currentPage}&limit=${itemsPerPage}`
        );
        const data = await response.json();

        let profile = undefined;
        if (typeof address === "string" && address.length > 0) {
          profile = await nnsClient.getProfile(address as HexString);
        }

        setUserProfile({
          address: data.userActivity?.address || address,
          nadName: profile?.primaryName,
          nadAvatar: profile?.avatar,
          points: data.userActivity?.points || 0,
          rank: data.userActivity?.rank || "0",
          activitiesList: data.userActivity?.activitiesList || [],
          dollarValue: data.userActivity?.dollarValue ?? 0,
          pagination: data.userActivity?.pagination,
          hasV2NFT: Number(v2NFTBalance) > 0,
        });
      } catch (error) {
        console.error("Error fetching user profile:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (params.address) {
      fetchUserProfile();
    }
  }, [params.address, currentPage, v2NFTBalance]);

  useEffect(() => {
    if (params.address) {
      fetchUserQuests();
    }
  }, [params.address]);

  useEffect(() => {
    const checkDiscordQuestStatus = async () => {
      if (!params.address) return;

      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/discord/membership/status/${params.address}`
        );
        const data = await response.json();

        if (data.hasCompletedQuest) {
          setDiscordQuestCompleted(true);
          if (data.username) {
            setDiscordUsername(data.username);
          }
        }
      } catch (error) {
        console.error("Error checking Discord quest status:", error);
      }
    };

    checkDiscordQuestStatus();
  }, [params.address]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const discordErrorParam = urlParams.get("discord_error");
    const discordError = urlParams.get("discordError");

    if (discordErrorParam === "not_member" || discordError === "true") {
      setDiscordError(
        "You are not part of the Discord server. Join the server by clicking 'Connect Discord' first."
      );
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const formatAddress = (address: string) => {
    if (!address) return "";
    return `${address.substring(0, 6)}...${address.substring(
      address.length - 4
    )}`;
  };

  if (isLoading) {
    return <LoadingOverlay />;
  }

  if (!userProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-r from-violet-50 to-indigo-50">
        <div className="text-center p-8 bg-white rounded-xl shadow-lg max-w-md">
          <div className="text-5xl mb-4">😕</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            User Not Found
          </h2>
          <p className="text-gray-600 mb-6">
            We couldn&apos;t find the profile you are looking for.
          </p>
          <button
            onClick={() => window.history.back()}
            className="px-5 py-2 bg-violet-600 hover:bg-violet-700 text-white font-medium rounded-lg transition-colors duration-300"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const getOrdinalSuffix = (rank: string) => {
    const num = parseInt(rank);
    if (num === 1) return "st";
    if (num === 2) return "nd";
    if (num === 3) return "rd";
    return "th";
  };

  const handleDiscordConnect = () => {
    const address = params.address as string;
    const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;
    const redirectUri = encodeURIComponent(
      process.env.NEXT_PUBLIC_DISCORD_REDIRECT_URI!
    );
    const scope = encodeURIComponent("identify guilds");
    const state = encodeURIComponent(address);

    const authUrl = `https://discord.com/oauth2/authorize?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&scope=${scope}&state=${state}`;

    window.location.href = authUrl;
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-r from-violet-50 to-indigo-50 text-gray-800">
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-3 rounded-full bg-white shadow-md text-violet-600 hover:bg-violet-100 transition-colors duration-300"
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

      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <main className="flex-1">
        <Header />
        <div className="flex-1 overflow-y-auto">
          <div className="w-full px-2 sm:px-4 pt-2 sm:pt-4 pb-4 sm:pb-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 sm:gap-3">
              <div className="lg:col-span-2 space-y-2 sm:space-y-3">
                <div className="bg-white rounded-lg shadow-lg p-4 sm:p-8 transform transition-all duration-300 hover:shadow-xl">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="relative">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden border-4 border-violet-200 shadow-md">
                          <Image
                            src={
                              userProfile.nadAvatar ||
                              `/avatar_${parseInt(userProfile.rank) % 6}.png`
                            }
                            alt="Profile"
                            width={80}
                            height={80}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>

                      <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">
                          {userProfile.nadName ||
                            formatAddress(userProfile.address)}
                        </h1>

                        {userProfile.nadName && (
                          <p className="text-gray-500 text-sm font-mono mb-2">
                            {formatAddress(userProfile.address)}
                          </p>
                        )}

                        {isOwnProfile && (
                          <div className="flex flex-col gap-2">
                            {/* Discord buttons */}
                            <div className="flex flex-wrap gap-2">
                              {!discordUsername && (
                                <a
                                  href="https://discord.gg/yYtgzHywRF"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                                  onClick={() => setDiscordError(null)}
                                >
                                  <svg
                                    className="w-4 h-4"
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                  >
                                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.30z" />
                                  </svg>
                                  Connect Discord
                                </a>
                              )}

                              {!discordQuestCompleted && (
                                <button
                                  onClick={handleDiscordConnect}
                                  className="flex items-center gap-2 px-3 py-1.5 bg-indigo-400 text-white rounded-lg text-sm font-medium hover:bg-indigo-500 transition-colors"
                                >
                                  <svg
                                    className="w-4 h-4"
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                  >
                                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.30z" />
                                  </svg>
                                  Verify Discord
                                </button>
                              )}

                              {discordUsername && discordQuestCompleted && (
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-violet-400 text-white rounded-lg text-sm font-medium">
                                  <svg
                                    className="w-4 h-4"
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                  >
                                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.30z" />
                                  </svg>
                                  <span>{discordUsername}</span>
                                </div>
                              )}
                            </div>

                            {discordError && (
                              <div className="flex items-center gap-2 px-3 py-2 text-red-700 rounded-lg text-sm">
                                <svg
                                  className="w-4 h-4 flex-shrink-0"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                  />
                                </svg>
                                <span>{discordError}</span>
                                <button
                                  onClick={() => setDiscordError(null)}
                                  className="ml-auto text-red-500 hover:text-red-700"
                                ></button>
                              </div>
                            )}

                            {successMessage && (
                              <div className="flex items-center gap-2 px-3 py-2 text-green-700 bg-green-50 rounded-lg text-sm">
                                <svg
                                  className="w-4 h-4 flex-shrink-0"
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
                                <span>{successMessage}</span>
                                <button
                                  onClick={() => setSuccessMessage(null)}
                                  className="ml-auto text-green-500 hover:text-green-700"
                                >
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
                                      d="M6 18L18 6M6 6l12 12"
                                    />
                                  </svg>
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 flex-wrap">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                        <svg
                          className="w-4 h-4 mr-1"
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
                        Verified
                      </span>

                      {userProfile.hasV2NFT && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-pink-100 text-pink-800">
                          <svg
                            className="w-4 h-4 mr-1"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                            />
                          </svg>
                          V2 Access
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mb-6">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">
                        Level {getLevelInfo(userProfile.points).level}
                      </span>
                      <span className="text-sm text-gray-500">
                        {userProfile.points}/
                        {getLevelInfo(userProfile.points).totalXpForNextLevel}{" "}
                        XP
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-violet-500 to-indigo-600 h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(
                            getXpProgress(userProfile.points),
                            100
                          )}%`,
                        }}
                      ></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-1">
                        Total Volume
                      </h3>
                      <div className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">
                        $
                        {typeof userProfile.dollarValue === "number"
                          ? userProfile.dollarValue.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })
                          : "0.00"}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-1">
                        Total Points
                      </h3>
                      <div className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">
                        {userProfile.points.toLocaleString()}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-1">
                        Global Rank
                      </h3>
                      <div className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">
                        {userProfile.rank}
                        {getOrdinalSuffix(userProfile.rank)}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow-lg p-3 transform transition-all duration-300 hover:shadow-xl">
                  <div className="flex justify-between items-center mb-3">
                    <h2 className="text-base font-bold text-gray-900">
                      Quests
                    </h2>
                  </div>
                  <div className="space-y-2 sm:space-y-3">
                    {quests
                      .filter((quest) => quest.questType !== "discord")
                      .map((quest, idx) => (
                        <div
                          key={idx}
                          className="flex flex-col sm:flex-row sm:items-center bg-white rounded-xl shadow p-3 sm:p-4"
                        >
                          <div className="w-12 h-12 flex items-center justify-center bg-violet-100 rounded-lg mb-3 sm:mb-0 sm:mr-4">
                            <Image
                              src={"/propic.png"}
                              alt={quest.questName}
                              width={32}
                              height={32}
                            />
                          </div>
                          <div className="flex-1 flex flex-col gap-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="font-semibold text-gray-900">
                                {quest.questName}
                              </div>
                              <span className="px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 text-xs font-semibold">
                                +{quest.questRewardAmount} pts
                              </span>
                              {quest.isCompleted && (
                                <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
                                  ✓ Completed
                                </span>
                              )}
                            </div>
                            <div className="text-gray-500 text-sm">
                              {quest.questDescription}
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              <div className="flex-1">
                                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                  <div
                                    className="bg-gradient-to-r from-violet-500 to-indigo-600 h-2 rounded-full transition-all duration-300"
                                    style={{
                                      width: `${
                                        quest.progressPercentage || 0
                                      }%`,
                                    }}
                                  ></div>
                                </div>
                              </div>
                              {!quest.claimedAt &&
                                !claimedQuests.has(quest._id) && (
                                  <span className="text-xs text-gray-500 min-w-fit">
                                    {quest.currentProgress || 0}/
                                    {quest.questRequirement}
                                  </span>
                                )}
                            </div>
                          </div>
                          {isOwnProfile &&
                            !(
                              quest.claimedAt || claimedQuests.has(quest._id)
                            ) && (
                              <button
                                onClick={() => handleClaimQuest(quest._id)}
                                className={`mt-3 sm:mt-0 sm:ml-4 px-4 py-2 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed ${
                                  quest.claimedAt ||
                                  claimedQuests.has(quest._id)
                                    ? "bg-violet-600 text-white hover:bg-violet-700"
                                    : "bg-indigo-600 transition-colors text-white hover:bg-indigo-700"
                                }`}
                                disabled={
                                  quest.currentProgress <
                                    quest.questRequirement ||
                                  !!quest.claimedAt ||
                                  claimedQuests.has(quest._id)
                                }
                              >
                                Claim
                              </button>
                            )}
                        </div>
                      ))}
                  </div>
                </div>
              </div>

              <div className="lg:col-span-1">
                <div className="bg-white rounded-lg shadow-lg transform transition-all duration-300 hover:shadow-xl">
                  <div className="bg-white rounded-xl p-4">
                    <div className="flex justify-between items-center mb-3">
                      <h2 className="text-base font-bold text-gray-900">
                        Latest Activities
                      </h2>
                      <a
                        href={`/transactions/${params.address}`}
                        className="text-violet-600 hover:text-violet-800 text-xs font-medium flex items-center gap-1"
                      >
                        See more
                        <svg
                          className="w-3 h-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </a>
                    </div>
                    {userProfile.activitiesList.length > 0 ? (
                      <div className="space-y-3">
                        {userProfile.activitiesList
                          .slice(0, 5)
                          .map((activity, index) => (
                            <div
                              key={index}
                              className="flex items-center bg-white rounded-xl border border-gray-100 px-4 py-3 shadow-sm hover:shadow-md transition-all duration-200"
                            >
                              <div
                                className="shrink-0 flex items-center justify-center w-10 h-10 rounded-full mr-4"
                                style={{
                                  backgroundColor:
                                    activity?.intentId?.action === "buy"
                                      ? "#E9F9EE"
                                      : activity?.intentId?.action === "sell"
                                      ? "#FDECEC"
                                      : "#F3F4F6",
                                }}
                              >
                                {activity?.intentId?.action === "buy" ? (
                                  <svg
                                    className="w-5 h-5 text-green-500"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth="2"
                                      d="M5 10l7-7m0 0l7 7m-7-7v18"
                                    />
                                  </svg>
                                ) : activity?.intentId?.action === "sell" ? (
                                  <svg
                                    className="w-5 h-5 text-red-500"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth="2"
                                      d="M19 14l-7 7m0 0l-7-7m7 7V3"
                                    />
                                  </svg>
                                ) : activity.name === "Signal Refused" ? (
                                  <svg
                                    className="w-5 h-5 text-gray-500"
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
                                ) : activity.name === "Discord Connected" ? (
                                  <svg
                                    className="w-5 h-5 text-indigo-500"
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                  >
                                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.30z" />
                                  </svg>
                                ) : activity.name.includes("Quest") ? (
                                  <svg
                                    className="w-5 h-5 text-violet-500"
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
                                ) : (
                                  <svg
                                    className="w-5 h-5 text-gray-500"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth="2"
                                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                    />
                                  </svg>
                                )}
                              </div>

                              <div className="flex-1 min-w-0">
                                {/* Trading Activity */}
                                {activity?.intentId?.tokenSymbol && (
                                  <>
                                    <div className="flex items-center gap-3 mb-1">
                                      <Image
                                        src={`/tokens/${activity.intentId.tokenSymbol.toLowerCase()}.png`}
                                        alt={activity.intentId.tokenSymbol}
                                        width={24}
                                        height={24}
                                        className="rounded-full"
                                        onError={(e) => {
                                          (
                                            e.currentTarget as HTMLImageElement
                                          ).style.display = "none";
                                        }}
                                        unoptimized
                                      />
                                      <span className="font-semibold text-gray-900">
                                        {activity.intentId.tokenAmount.toLocaleString()}{" "}
                                        {activity.intentId.tokenSymbol}
                                      </span>
                                      <span
                                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                          activity.intentId.tokenPrice > 1
                                            ? "bg-pink-100 text-pink-600"
                                            : "bg-orange-100 text-orange-600"
                                        }`}
                                      >
                                        {activity.intentId.tokenPrice > 1
                                          ? "V2"
                                          : "V1"}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-gray-500">
                                      <span>
                                        $
                                        {formatNumber(
                                          activity.intentId.tokenPrice
                                        )}
                                      </span>
                                      <span>•</span>
                                      <span>
                                        $
                                        {formatNumber(
                                          activity.intentId.tokenAmount *
                                            activity.intentId.tokenPrice
                                        )}
                                      </span>
                                    </div>
                                  </>
                                )}

                                {/* Non-Trading Activity */}
                                {!activity?.intentId?.tokenSymbol && (
                                  <div className="font-semibold text-gray-900">
                                    {activity.name}
                                  </div>
                                )}

                                {/* Trading Details */}
                                {activity.name === "trade" &&
                                  activity?.intentId && (
                                    <div className="mt-2 flex flex-wrap gap-2">
                                      <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 rounded-lg text-xs">
                                        <span className="text-gray-500">
                                          Type:
                                        </span>
                                        <span
                                          className={`font-medium ${
                                            activity.intentId.action === "buy"
                                              ? "text-green-600"
                                              : "text-red-600"
                                          }`}
                                        >
                                          {activity.intentId.action.toUpperCase()}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 rounded-lg text-xs">
                                        <span className="text-gray-500">
                                          Token:
                                        </span>
                                        <span className="font-medium text-gray-900">
                                          {activity.intentId.tokenSymbol}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 rounded-lg text-xs">
                                        <span className="text-gray-500">
                                          Amount:
                                        </span>
                                        <span className="font-medium text-gray-900">
                                          {formatNumber(
                                            activity.intentId.tokenAmount
                                          )}
                                        </span>
                                      </div>
                                      {activity.intentId.txHash && (
                                        <a
                                          href={`https://testnet.monadexplorer.com/tx/${activity.intentId.txHash}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="flex items-center gap-1.5 px-2 py-1 bg-violet-50 rounded-lg text-xs text-violet-600 hover:bg-violet-100 transition-colors"
                                        >
                                          <svg
                                            className="w-3 h-3"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                          >
                                            <path
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                              strokeWidth="2"
                                              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                            />
                                          </svg>
                                          View TX
                                        </a>
                                      )}
                                    </div>
                                  )}
                              </div>

                              <div className="flex flex-col items-end gap-1 ml-4">
                                <span className="text-xs text-gray-500">
                                  {getTimeAgo(activity.date)}
                                </span>
                                <span className="px-2 py-0.5 rounded-md bg-violet-50 text-violet-700 text-xs font-semibold">
                                  +{activity.points} pts
                                </span>
                              </div>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <div className="text-center p-6 text-gray-400 text-sm">
                        No recent activities.
                      </div>
                    )}
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow-lg transform transition-all duration-300 hover:shadow-xl mt-3">
                  <div className="bg-white rounded-xl p-4">
                    <div className="flex justify-between items-center mb-3">
                      <h2 className="text-base font-bold text-gray-900">
                        Badges
                      </h2>
                    </div>
                    <div className="flex flex-col gap-3">
                      {[
                        {
                          name: "Social Gorilla",
                          description:
                            "Follow Gorilli Twitter, Discord and Telegram profiles.",
                          image: "/01.png",
                          status: "coming-soon",
                        },
                        {
                          name: "Jungle Ambassador",
                          description:
                            "Invite a friend to join Gorillionaire family.",
                          image: "/02.png",
                          status: "coming-soon",
                        },
                        {
                          name: "Streak Ape",
                          description:
                            "Accept at least 1 signal per day for 7 consecutive days.",
                          image: "/03.png",
                          status: "coming-soon",
                        },
                        {
                          name: "Early Adopter",
                          description:
                            "Be one of the first user to join Gorillionaire v2.",
                          image: "/04.png",
                          status: "coming-soon",
                        },
                        {
                          name: "Silverback OG",
                          description:
                            "Reach your first 1,000 points on Gorillionaire.",
                          image: "/05.png",
                          status: "coming-soon",
                        },
                      ].map((badge, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100 shadow-sm"
                        >
                          <div className="w-12 h-12 flex items-center justify-center rounded-full bg-violet-50 border">
                            <Image
                              src={badge.image}
                              alt={badge.name}
                              width={48}
                              height={48}
                              className="rounded-full"
                              unoptimized
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-gray-900 truncate">
                              {badge.name}
                            </div>
                            <div className="text-gray-500 text-xs truncate">
                              {badge.description}
                            </div>
                          </div>
                          <span className="px-3 py-1 rounded-full bg-gray-200 text-gray-600 text-xs font-semibold">
                            Coming Soon
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default UserProfilePage;
