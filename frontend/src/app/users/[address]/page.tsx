"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { nnsClient } from "@/app/providers";
import { HexString } from "@/app/types";
import Sidebar from "@/app/components/sidebar";
import Header from "@/app/components/header";
import { useReadContract, useAccount } from "wagmi";
import { abi } from "@/app/abi/early-nft";
import { NFT_ACCESS_ADDRESS } from "@/app/utils/constants";
import { getLevelInfo, getXpProgress } from "@/app/utils/xp";
import { LoadingOverlay } from "@/app/components/ui/LoadingSpinner";
import { CountdownTimer } from "@/app/components/CountdownTimer";
import ShareableProfileCard from "@/app/components/ShareableProfileCard";

const formatNumber = (num: number): string => {
  if (num === 0) return "0.00";
  if (num < 0.000001) return num.toExponential(6);
  if (num < 0.01) return num.toFixed(8);
  if (num < 1) return num.toFixed(6);
  if (num < 100) return num.toFixed(4);
  return num.toFixed(2);
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    // Past date
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } else if (diffDays === 0) {
    // Today
    return `Today at ${date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  } else if (diffDays === 1) {
    // Tomorrow
    return `Tomorrow at ${date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  } else {
    // Future date
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
};

const formatQuestDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const questDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );

  if (questDate.getTime() === today.getTime()) {
    return "Today";
  } else if (questDate.getTime() === today.getTime() - 24 * 60 * 60 * 1000) {
    return "Yesterday";
  } else {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }
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
  referredUserAddress?: string;
  originalTradePoints?: number;
  referralId?: string;
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
  profileBgImage?: string;
  todayTransactionCount?: number;
  dailyTransactionTarget?: number;
  streak?: number;
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
  questEndDate: string;
}

interface ReferredUser {
  address: string;
  joinedAt: string;
  pointsEarned: number;
  totalPoints: number;
  nadName?: string;
  nadAvatar?: string;
}

interface ReferralStats {
  referralCode: string | null;
  totalReferred: number;
  totalPointsEarned: number;
  referredUsers: ReferredUser[];
}

const UserProfilePage = () => {
  const params = useParams();
  const { address: connectedAddress } = useAccount();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPage, setSelectedPage] = useState("Profile");
  const [quests, setQuests] = useState<Quest[]>([]);
  const [completedDailyQuests, setCompletedDailyQuests] = useState<Quest[]>([]);
  const [questTab, setQuestTab] = useState<"active" | "completed">("active");
  const [completedQuestsPage, setCompletedQuestsPage] = useState(1);
  const [completedQuestsTotal, setCompletedQuestsTotal] = useState(0);
  const [completedQuestsLoading, setCompletedQuestsLoading] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [discordUsername, setDiscordUsername] = useState<string | null>(null);
  const [discordQuestCompleted, setDiscordQuestCompleted] = useState(false);
  const [claimedQuests, setClaimedQuests] = useState<Set<string>>(new Set());
  const currentPage = 1;
  const itemsPerPage = 5;
  const [discordError, setDiscordError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [referralStats, setReferralStats] = useState<ReferralStats | null>(
    null
  );
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [referralError, setReferralError] = useState<string | null>(null);
  const [hasReferrer, setHasReferrer] = useState<boolean | null>(null);
  const [referralCodeInput, setReferralCodeInput] = useState("");
  const [isSubmittingReferral, setIsSubmittingReferral] = useState(false);
  const [showReferredUsers, setShowReferredUsers] = useState(false);

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

  const generateReferralCode = async () => {
    if (!params.address) return;

    setIsGeneratingCode(true);
    setReferralError(null);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/referral/generate-code`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            address: params.address,
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        await fetchReferralStats();
        setSuccessMessage("Referral code generated successfully! 🎉");
        setTimeout(() => {
          setSuccessMessage(null);
        }, 3000);
      } else {
        setReferralError(data.error || "Failed to generate referral code");
      }
    } catch (error) {
      console.error("Error generating referral code:", error);
      setReferralError("An error occurred while generating the referral code");
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const fetchReferralStats = async () => {
    if (!params.address) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/referral/stats/${params.address}`
      );
      const data = await response.json();

      if (response.ok) {
        setReferralStats(data);
      } else {
        console.error("Error fetching referral stats:", data.error);
      }
    } catch (error) {
      console.error("Error fetching referral stats:", error);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setSuccessMessage("Referral code copied to clipboard! 📋");
      setTimeout(() => {
        setSuccessMessage(null);
      }, 2000);
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
      setReferralError("Failed to copy to clipboard");
    }
  };

  const checkIfUserHasReferrer = async () => {
    if (!params.address) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/referral/check-referrer/${params.address}`
      );
      const data = await response.json();

      if (response.ok) {
        setHasReferrer(data.hasReferrer);
      } else {
        console.error("Error checking referrer status:", data.error);
      }
    } catch (error) {
      console.error("Error checking referrer status:", error);
    }
  };

  const submitReferralCode = async () => {
    if (!params.address || !referralCodeInput.trim()) return;

    setIsSubmittingReferral(true);
    setReferralError(null);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/referral/process`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            referralCode: referralCodeInput.trim().toUpperCase(),
            newUserAddress: params.address,
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        setSuccessMessage("Referral code applied successfully! 🎉");
        setReferralCodeInput("");
        setHasReferrer(true);
        setTimeout(() => {
          setSuccessMessage(null);
        }, 3000);
      } else {
        setReferralError(data.error || "Failed to apply referral code");
      }
    } catch (error) {
      console.error("Error submitting referral code:", error);
      setReferralError("An error occurred while applying the referral code");
    } finally {
      setIsSubmittingReferral(false);
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

  const fetchCompletedDailyQuests = async (page = 1) => {
    try {
      setCompletedQuestsLoading(true);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/activity/daily-quests/${params.address}/completed?page=${page}&limit=10`
      );
      const data = await response.json();
      setCompletedDailyQuests(data.quests || []);
      setCompletedQuestsTotal(data.pagination?.total || 0);
      setCompletedQuestsPage(page);
    } catch (error) {
      console.error("Error fetching completed daily quests:", error);
    } finally {
      setCompletedQuestsLoading(false);
    }
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
          profileBgImage: data.userActivity?.profileBgImage || null,
          todayTransactionCount: data.userActivity?.todayTransactionCount || 0,
          dailyTransactionTarget:
            data.userActivity?.dailyTransactionTarget || 3,
          streak: data.userActivity?.streak || 0,
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
      fetchCompletedDailyQuests();
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

  useEffect(() => {
    if (params.address) {
      fetchReferralStats();
    }
  }, [params.address]);

  useEffect(() => {
    if (params.address && isOwnProfile) {
      checkIfUserHasReferrer();
    }
  }, [params.address, isOwnProfile]);

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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 sm:gap-3 items-stretch">
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
                        <h1
                          className="text-xl sm:text-2xl font-bold text-gray-900 mb-1 break-all"
                          title={userProfile.address}
                        >
                          {userProfile.nadName || userProfile.address}
                        </h1>

                        {userProfile.nadName && (
                          <p
                            className="text-gray-500 text-sm font-mono mb-2 break-all"
                            title={userProfile.address}
                          >
                            {userProfile.address}
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
                                    viewBox="0 -28.5 256 256"
                                    fill="currentColor"
                                  >
                                    <path d="M216.856339,16.5966031 C200.285002,8.84328665 182.566144,3.2084988 164.041564,0 C161.766523,4.11318106 159.108624,9.64549908 157.276099,14.0464379 C137.583995,11.0849896 118.072967,11.0849896 98.7430163,14.0464379 C96.9108417,9.64549908 94.1925838,4.11318106 91.8971895,0 C73.3526068,3.2084988 55.6133949,8.86399117 39.0420583,16.6376612 C5.61752293,67.146514 -3.4433191,116.400813 1.08711069,164.955721 C23.2560196,181.510915 44.7403634,191.567697 65.8621325,198.148576 C71.0772151,190.971126 75.7283628,183.341335 79.7352139,175.300261 C72.104019,172.400575 64.7949724,168.822202 57.8887866,164.667963 C59.7209612,163.310589 61.5131304,161.891452 63.2445898,160.431257 C105.36741,180.133187 151.134928,180.133187 192.754523,160.431257 C194.506336,161.891452 196.298154,163.310589 198.110326,164.667963 C191.183787,168.842556 183.854737,172.420929 176.223542,175.320965 C180.230393,183.341335 184.861538,190.991831 190.096624,198.16893 C211.238746,191.588051 232.743023,181.531619 254.911949,164.955721 C260.227747,108.668201 245.831087,59.8662432 216.856339,16.5966031 Z M85.4738752,135.09489 C72.8290281,135.09489 62.4592217,123.290155 62.4592217,108.914901 C62.4592217,94.5396472 72.607595,82.7145587 85.4738752,82.7145587 C98.3405064,82.7145587 108.709962,94.5189427 108.488529,108.914901 C108.508531,123.290155 98.3405064,135.09489 85.4738752,135.09489 Z M170.525237,135.09489 C157.88039,135.09489 147.510584,123.290155 147.510584,108.914901 C147.510584,94.5396472 157.658606,82.7145587 170.525237,82.7145587 C183.391518,82.7145587 193.761324,94.5189427 193.539891,108.914901 C193.539891,123.290155 183.391518,135.09489 170.525237,135.09489 Z" />
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
                                    viewBox="0 -28.5 256 256"
                                    fill="currentColor"
                                  >
                                    <path d="M216.856339,16.5966031 C200.285002,8.84328665 182.566144,3.2084988 164.041564,0 C161.766523,4.11318106 159.108624,9.64549908 157.276099,14.0464379 C137.583995,11.0849896 118.072967,11.0849896 98.7430163,14.0464379 C96.9108417,9.64549908 94.1925838,4.11318106 91.8971895,0 C73.3526068,3.2084988 55.6133949,8.86399117 39.0420583,16.6376612 C5.61752293,67.146514 -3.4433191,116.400813 1.08711069,164.955721 C23.2560196,181.510915 44.7403634,191.567697 65.8621325,198.148576 C71.0772151,190.971126 75.7283628,183.341335 79.7352139,175.300261 C72.104019,172.400575 64.7949724,168.822202 57.8887866,164.667963 C59.7209612,163.310589 61.5131304,161.891452 63.2445898,160.431257 C105.36741,180.133187 151.134928,180.133187 192.754523,160.431257 C194.506336,161.891452 196.298154,163.310589 198.110326,164.667963 C191.183787,168.842556 183.854737,172.420929 176.223542,175.320965 C180.230393,183.341335 184.861538,190.991831 190.096624,198.16893 C211.238746,191.588051 232.743023,181.531619 254.911949,164.955721 C260.227747,108.668201 245.831087,59.8662432 216.856339,16.5966031 Z M85.4738752,135.09489 C72.8290281,135.09489 62.4592217,123.290155 62.4592217,108.914901 C62.4592217,94.5396472 72.607595,82.7145587 85.4738752,82.7145587 C98.3405064,82.7145587 108.709962,94.5189427 108.488529,108.914901 C108.508531,123.290155 98.3405064,135.09489 85.4738752,135.09489 Z M170.525237,135.09489 C157.88039,135.09489 147.510584,123.290155 147.510584,108.914901 C147.510584,94.5396472 157.658606,82.7145587 170.525237,82.7145587 C183.391518,82.7145587 193.761324,94.5189427 193.539891,108.914901 C193.539891,123.290155 183.391518,135.09489 170.525237,135.09489 Z" />
                                  </svg>
                                  Verify Discord
                                </button>
                              )}

                              {discordUsername && discordQuestCompleted && (
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-violet-400 text-white rounded-lg text-sm font-medium">
                                  <svg
                                    className="w-4 h-4"
                                    viewBox="0 -28.5 256 256"
                                    fill="currentColor"
                                  >
                                    <path d="M216.856339,16.5966031 C200.285002,8.84328665 182.566144,3.2084988 164.041564,0 C161.766523,4.11318106 159.108624,9.64549908 157.276099,14.0464379 C137.583995,11.0849896 118.072967,11.0849896 98.7430163,14.0464379 C96.9108417,9.64549908 94.1925838,4.11318106 91.8971895,0 C73.3526068,3.2084988 55.6133949,8.86399117 39.0420583,16.6376612 C5.61752293,67.146514 -3.4433191,116.400813 1.08711069,164.955721 C23.2560196,181.510915 44.7403634,191.567697 65.8621325,198.148576 C71.0772151,190.971126 75.7283628,183.341335 79.7352139,175.300261 C72.104019,172.400575 64.7949724,168.822202 57.8887866,164.667963 C59.7209612,163.310589 61.5131304,161.891452 63.2445898,160.431257 C105.36741,180.133187 151.134928,180.133187 192.754523,160.431257 C194.506336,161.891452 196.298154,163.310589 198.110326,164.667963 C191.183787,168.842556 183.854737,172.420929 176.223542,175.320965 C180.230393,183.341335 184.861538,190.991831 190.096624,198.16893 C211.238746,191.588051 232.743023,181.531619 254.911949,164.955721 C260.227747,108.668201 245.831087,59.8662432 216.856339,16.5966031 Z M85.4738752,135.09489 C72.8290281,135.09489 62.4592217,123.290155 62.4592217,108.914901 C62.4592217,94.5396472 72.607595,82.7145587 85.4738752,82.7145587 C98.3405064,82.7145587 108.709962,94.5189427 108.488529,108.914901 C108.508531,123.290155 98.3405064,135.09489 85.4738752,135.09489 Z M170.525237,135.09489 C157.88039,135.09489 147.510584,123.290155 147.510584,108.914901 C147.510584,94.5396472 157.658606,82.7145587 170.525237,82.7145587 C183.391518,82.7145587 193.761324,94.5189427 193.539891,108.914901 C193.539891,123.290155 183.391518,135.09489 170.525237,135.09489 Z" />
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
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

                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-1">
                        Current Streak
                      </h3>
                      <div className="text-xl sm:text-2xl font-bold text-gray-900 mb-1 flex items-center gap-2">
                        <span>{userProfile.streak || 0}</span>
                        <span className="text-orange-500">🔥</span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {userProfile.streak === 1 ? "day" : "days"}
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

                  {/* Quest Tabs */}
                  <div className="flex space-x-1 mb-4 bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={() => setQuestTab("active")}
                      className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
                        questTab === "active"
                          ? "bg-white text-violet-600 shadow-sm"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      Active Quests
                    </button>
                    <button
                      onClick={() => setQuestTab("completed")}
                      className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
                        questTab === "completed"
                          ? "bg-white text-violet-600 shadow-sm"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      Completed Daily Quests
                    </button>
                  </div>

                  <div className="space-y-1.5 sm:space-y-2">
                    {questTab === "active" ? (
                      // Active Quests
                      quests
                        .filter((quest) => {
                          // Show all quests that are completed
                          if (quest.isCompleted) return true;

                          // Show quests that don't have an end date
                          if (!quest.questEndDate) return true;

                          // Show quests that haven't ended yet
                          const now = new Date();
                          const endDate = new Date(quest.questEndDate);
                          return endDate > now;
                        })
                        .map((quest, idx) => (
                          <div
                            key={idx}
                            className="flex flex-col sm:flex-row sm:items-center bg-white rounded-xl shadow p-3 sm:p-4"
                          >
                            <div className="w-12 h-12 flex items-center justify-center bg-violet-100 rounded-lg mb-3 sm:mb-0 sm:mr-4">
                              {quest.questName.includes("Foundry") ? (
                                <Image
                                  src={"/foundry.png"}
                                  alt={quest.questName}
                                  className="rounded-md"
                                  width={28}
                                  height={28}
                                />
                              ) : quest.questType === "discord" ? (
                                <Image
                                  src={"/discord.png"}
                                  alt={quest.questName}
                                  className="rounded-md"
                                  width={28}
                                  height={28}
                                />
                              ) : (
                                <Image
                                  src={quest?.questImage || "/propic.png"}
                                  alt={quest.questName}
                                  className="rounded-md"
                                  width={28}
                                  height={28}
                                />
                              )}
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
                              {quest.questName.includes("Foundry") && (
                                <>
                                  {quest.questEndDate &&
                                  new Date(quest.questEndDate) > new Date() ? (
                                    <div className="text-gray-500 text-sm">
                                      <CountdownTimer
                                        targetDate={quest.questEndDate}
                                      />{" "}
                                    </div>
                                  ) : (
                                    <div className="text-gray-500 text-sm">
                                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-50 text-red-600 rounded-md text-xs font-medium">
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
                                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                          />
                                        </svg>
                                        Ended {formatDate(quest.questEndDate)}
                                      </span>
                                    </div>
                                  )}
                                </>
                              )}
                              <div className="flex items-center gap-2 mt-2">
                                <div className="flex-1">
                                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                    <div
                                      className="bg-gradient-to-r from-violet-500 to-indigo-600 h-2 rounded-full transition-all duration-300"
                                      style={{
                                        width: quest.isCompleted
                                          ? "100%"
                                          : `${quest.progressPercentage || 0}%`,
                                      }}
                                    ></div>
                                  </div>
                                </div>
                                {!quest.claimedAt &&
                                  !claimedQuests.has(quest._id) &&
                                  quest.questType !== "discord" && (
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
                              ) &&
                              quest.questType !== "discord" && (
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
                        ))
                    ) : // Completed Daily Quests
                    completedQuestsLoading ? (
                      <div className="text-center py-8">
                        <div className="inline-flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-violet-600 border-t-transparent rounded-full animate-spin"></div>
                          <span className="text-sm text-gray-600">
                            Loading completed quests...
                          </span>
                        </div>
                      </div>
                    ) : completedDailyQuests.length > 0 ? (
                      completedDailyQuests.map((quest, idx) => (
                        <div
                          key={idx}
                          className="flex flex-col sm:flex-row sm:items-center bg-white rounded-lg shadow p-2 sm:p-3"
                        >
                          <div className="w-16 h-16 flex items-center justify-center bg-green-100 rounded-lg mb-2 sm:mb-0 sm:mr-3">
                            {quest.questName.includes("Foundry") ? (
                              <Image
                                src={"/foundry.png"}
                                alt={quest.questName}
                                className="rounded-md"
                                width={72}
                                height={72}
                              />
                            ) : quest.questType === "discord" ? (
                              <Image
                                src={"/discord.png"}
                                alt={quest.questName}
                                className="rounded-md"
                                width={72}
                                height={72}
                              />
                            ) : (
                              <Image
                                src={quest?.questImage || "/propic.png"}
                                alt={quest.questName}
                                className="rounded-md"
                                width={72}
                                height={72}
                              />
                            )}
                          </div>
                          <div className="flex-1 flex flex-col gap-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="font-semibold text-gray-900 text-sm">
                                {quest.questName}
                              </div>
                              <span className="px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 text-xs font-semibold">
                                +{quest.questRewardAmount} pts
                              </span>
                              <span className="px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
                                ✓ Completed
                              </span>
                            </div>
                            <div className="text-gray-500 text-xs">
                              {quest.questDescription}
                            </div>
                            {quest.completedAt && (
                              <div className="text-gray-700 text-sm font-medium bg-gray-50 px-2 py-1 rounded-md inline-block">
                                ✓ Completed on{" "}
                                {formatQuestDate(quest.completedAt.toString())}
                              </div>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              <div className="flex-1">
                                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                  <div
                                    className="bg-green-500 h-2 rounded-full"
                                    style={{ width: "100%" }}
                                  ></div>
                                </div>
                              </div>
                              <span className="text-xs text-gray-500 min-w-fit">
                                {quest.currentProgress || 0}/
                                {quest.questRequirement}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <div className="text-4xl mb-2">📋</div>
                        <div className="text-sm">
                          No completed daily quests yet
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          Complete some daily quests to see them here!
                        </div>
                      </div>
                    )}

                    {/* Pagination for completed quests */}
                    {questTab === "completed" && completedQuestsTotal > 10 && (
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                        <div className="text-sm text-gray-600">
                          Showing {(completedQuestsPage - 1) * 10 + 1} to{" "}
                          {Math.min(
                            completedQuestsPage * 10,
                            completedQuestsTotal
                          )}{" "}
                          of {completedQuestsTotal} completed quests
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              fetchCompletedDailyQuests(completedQuestsPage - 1)
                            }
                            disabled={
                              completedQuestsPage <= 1 || completedQuestsLoading
                            }
                            className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Previous
                          </button>
                          <span className="text-sm text-gray-600">
                            Page {completedQuestsPage} of{" "}
                            {Math.ceil(completedQuestsTotal / 10)}
                          </span>
                          <button
                            onClick={() =>
                              fetchCompletedDailyQuests(completedQuestsPage + 1)
                            }
                            disabled={
                              completedQuestsPage >=
                                Math.ceil(completedQuestsTotal / 10) ||
                              completedQuestsLoading
                            }
                            className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="lg:col-span-1 flex flex-col h-full">
                {/* Referral Visualization - Move to top */}
                {referralStats && (
                  <div
                    id="referral"
                    className="bg-white rounded-lg shadow-lg transform transition-all duration-300 hover:shadow-xl mb-3"
                  >
                    <div className="bg-white rounded-xl p-4">
                      <div className="flex flex-col gap-3">
                        {/* Referral Code Input Section for New Users */}
                        {isOwnProfile &&
                          hasReferrer === false &&
                          (userProfile?.activitiesList?.length || 0) < 3 && (
                            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
                              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                                Enter Referral Code
                              </h3>
                              <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={referralCodeInput}
                                    onChange={(e) =>
                                      setReferralCodeInput(e.target.value)
                                    }
                                    placeholder="Enter referral code (e.g., ABC12345)"
                                    className="flex-1 bg-white rounded-lg px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                                    maxLength={8}
                                  />
                                  <button
                                    onClick={submitReferralCode}
                                    disabled={
                                      !referralCodeInput.trim() ||
                                      isSubmittingReferral
                                    }
                                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                                  >
                                    {isSubmittingReferral ? (
                                      <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        Applying...
                                      </div>
                                    ) : (
                                      "Apply"
                                    )}
                                  </button>
                                </div>
                                <div className="text-xs text-gray-600">
                                  Enter a friend&apos;s referral code to get
                                  started and earn bonus points!
                                </div>
                                {referralError && (
                                  <div className="text-red-600 text-xs">
                                    {referralError}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                        {/* Referral Code Section */}
                        {isOwnProfile &&
                          (hasReferrer === true ||
                            (userProfile?.activitiesList?.length || 0) >=
                              3) && (
                            <div className="bg-gradient-to-r from-violet-50 to-indigo-50 rounded-lg p-4 border border-violet-200">
                              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                                Your Referral Code
                              </h3>

                              {referralStats?.referralCode ? (
                                <div className="space-y-3">
                                  <div className="flex items-center gap-2">
                                    <div className="flex-1 bg-white rounded-lg px-3 py-2 border border-gray-200">
                                      <code className="text-lg font-mono text-violet-600 font-bold">
                                        {referralStats.referralCode}
                                      </code>
                                    </div>
                                    <button
                                      onClick={() =>
                                        copyToClipboard(
                                          referralStats.referralCode!
                                        )
                                      }
                                      className="px-3 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
                                      title="Copy to clipboard"
                                    >
                                      <svg
                                        className="w-4 h-4"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                        xmlns="http://www.w3.org/2000/svg"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                                        />
                                      </svg>
                                    </button>
                                  </div>
                                  <div className="text-xs text-gray-600">
                                    Share this code with friends to{" "}
                                    <b>
                                      earn 100 points for each referral plus 10%
                                      of their trade points!
                                    </b>
                                  </div>
                                  <div className="text-xs text-gray-600">
                                    The referred user will get{" "}
                                    <b>2X XP for the first 7 days!</b> Tell them
                                    to push <b>hard as a gorilla!</b>
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  <button
                                    onClick={generateReferralCode}
                                    disabled={isGeneratingCode}
                                    className="w-full px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    {isGeneratingCode ? (
                                      <div className="flex items-center justify-center gap-2">
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        Generating...
                                      </div>
                                    ) : (
                                      "Generate Referral Code"
                                    )}
                                  </button>
                                  <div className="text-xs text-gray-600">
                                    Create your unique referral code to start
                                    earning points
                                  </div>
                                </div>
                              )}

                              {referralError && (
                                <div className="text-red-600 text-xs mt-2">
                                  {referralError}
                                </div>
                              )}
                            </div>
                          )}

                        {/* Referral Statistics */}
                        <div className="grid grid-cols-2 gap-3">
                          <div
                            className={`bg-white rounded-lg p-3 border text-center cursor-pointer transition-colors duration-200 flex items-center justify-center gap-2 ${
                              showReferredUsers
                                ? "border-violet-400 bg-violet-50"
                                : "border-gray-200 hover:bg-violet-50 hover:border-violet-300"
                            }`}
                            onClick={() => setShowReferredUsers((v) => !v)}
                            aria-expanded={showReferredUsers}
                          >
                            <div className="text-2xl font-bold text-violet-600">
                              {referralStats.totalReferred}
                            </div>
                            <div className="text-xs text-gray-600">
                              Total Referred
                            </div>
                            <svg
                              className={`w-4 h-4 ml-2 transition-transform duration-200 ${
                                showReferredUsers ? "rotate-90" : "rotate-0"
                              }`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5l7 7-7 7"
                              />
                            </svg>
                          </div>
                          <div className="bg-white rounded-lg p-3 border border-gray-200 text-center cursor-pointer transition-colors duration-200 flex items-center justify-center gap-2 hover:bg-green-50 hover:border-green-300">
                            <div className="text-2xl font-bold text-green-600">
                              {referralStats.totalPointsEarned}
                            </div>
                            <div className="text-xs text-gray-600">
                              Points Earned
                            </div>
                          </div>
                        </div>

                        {/* Referred Users List - only show if toggled */}
                        {showReferredUsers && (
                          <div className="space-y-2">
                            {referralStats.referredUsers.length > 0 ? (
                              <>
                                <h4 className="text-sm font-semibold text-gray-900">
                                  Referred Users
                                </h4>
                                <div className="max-h-48 overflow-y-auto space-y-2">
                                  {referralStats.referredUsers.map(
                                    (user, index) => (
                                      <Link
                                        href={`/users/${user.address}`}
                                        key={user.address}
                                        className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                                      >
                                        <div className="w-8 h-8 rounded-full overflow-hidden border border-gray-200">
                                          <Image
                                            src={
                                              user.nadAvatar ||
                                              `/avatar_${index % 6}.png`
                                            }
                                            alt="User Avatar"
                                            width={32}
                                            height={32}
                                            className="w-full h-full object-cover"
                                          />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="text-sm font-medium text-gray-900 truncate">
                                            {user.nadName ||
                                              formatAddress(user.address)}
                                          </div>
                                          <div className="text-xs text-gray-500">
                                            {user.totalPoints} pts • Joined{" "}
                                            {formatDate(user.joinedAt)}
                                          </div>
                                        </div>
                                        <div className="text-xs text-green-600 font-medium">
                                          +{user.pointsEarned}
                                        </div>
                                      </Link>
                                    )
                                  )}
                                </div>
                              </>
                            ) : (
                              <div className="text-center py-6 text-gray-500">
                                <div className="text-4xl mb-2">🤝</div>
                                <div className="text-sm font-medium mb-1">
                                  No referrals yet
                                </div>
                                <div className="text-xs">
                                  {isOwnProfile
                                    ? "Share your referral code to start earning points!"
                                    : "This user hasn't referred anyone yet"}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                {/* Share Profile Card - Only show for own profile */}
                {/* {isOwnProfile && ( */}
                <div className="bg-white rounded-lg shadow-lg transform transition-all duration-300 hover:shadow-xl mb-3">
                  <ShareableProfileCard
                    userProfile={{
                      address: userProfile.address,
                      nadName: userProfile.nadName,
                      nadAvatar: userProfile.nadAvatar,
                      points: userProfile.points,
                      rank: userProfile.rank,
                      dollarValue: userProfile.dollarValue,
                    }}
                    referralStats={referralStats}
                    totalTransactions={userProfile.pagination?.total}
                    isOwnProfile={isOwnProfile}
                    backgroundImage={userProfile.profileBgImage}
                  />
                </div>
                {/* )} */}

                {/* Latest Activities */}
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
                                    viewBox="0 -28.5 256 256"
                                    fill="currentColor"
                                  >
                                    <path d="M216.856339,16.5966031 C200.285002,8.84328665 182.566144,3.2084988 164.041564,0 C161.766523,4.11318106 159.108624,9.64549908 157.276099,14.0464379 C137.583995,11.0849896 118.072967,11.0849896 98.7430163,14.0464379 C96.9108417,9.64549908 94.1925838,4.11318106 91.8971895,0 C73.3526068,3.2084988 55.6133949,8.86399117 39.0420583,16.6376612 C5.61752293,67.146514 -3.4433191,116.400813 1.08711069,164.955721 C23.2560196,181.510915 44.7403634,191.567697 65.8621325,198.148576 C71.0772151,190.971126 75.7283628,183.341335 79.7352139,175.300261 C72.104019,172.400575 64.7949724,168.822202 57.8887866,164.667963 C59.7209612,163.310589 61.5131304,161.891452 63.2445898,160.431257 C105.36741,180.133187 151.134928,180.133187 192.754523,160.431257 C194.506336,161.891452 196.298154,163.310589 198.110326,164.667963 C191.183787,168.842556 183.854737,172.420929 176.223542,175.320965 C180.230393,183.341335 184.861538,190.991831 190.096624,198.16893 C211.238746,191.588051 232.743023,181.531619 254.911949,164.955721 C260.227747,108.668201 245.831087,59.8662432 216.856339,16.5966031 Z M85.4738752,135.09489 C72.8290281,135.09489 62.4592217,123.290155 62.4592217,108.914901 C62.4592217,94.5396472 72.607595,82.7145587 85.4738752,82.7145587 C98.3405064,82.7145587 108.709962,94.5189427 108.488529,108.914901 C108.508531,123.290155 98.3405064,135.09489 85.4738752,135.09489 Z M170.525237,135.09489 C157.88039,135.09489 147.510584,123.290155 147.510584,108.914901 C147.510584,94.5396472 157.658606,82.7145587 170.525237,82.7145587 C183.391518,82.7145587 193.761324,94.5189427 193.539891,108.914901 C193.539891,123.290155 183.391518,135.09489 170.525237,135.09489 Z" />
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
                                ) : activity.name === "Referral Trade Bonus" ? (
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
                                      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
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

                                {/* Referral Trade Bonus Details */}
                                {activity.name === "Referral Trade Bonus" && (
                                  <div className="space-y-2">
                                    <div className="text-sm text-gray-600">
                                      Earned from{" "}
                                      {activity.referredUserAddress
                                        ? formatAddress(
                                            activity.referredUserAddress
                                          )
                                        : "referred user"}
                                      &apos;s trade
                                    </div>
                                    {activity.originalTradePoints && (
                                      <div className="text-xs text-gray-500">
                                        Original trade:{" "}
                                        {activity.originalTradePoints} points
                                      </div>
                                    )}
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
                                <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded-md">
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
                                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                    />
                                  </svg>
                                  {formatDate(activity.date)}
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
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default UserProfilePage;
