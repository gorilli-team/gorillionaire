"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { nnsClient } from "@/app/providers";
import { getTimeAgo } from "@/app/utils/time";
import { getTokenImage } from "@/app/utils/tokens";
import { HexString } from "@/app/types";
import Sidebar from "@/app/components/sidebar";
import Header from "@/app/components/header";
import { Pagination } from "flowbite-react";
import ActivitiesChart from "@/app/components/activities-chart";
import { useReadContract } from "wagmi";
import { abi } from "@/app/abi/early-nft";
import { NFT_ACCESS_ADDRESS } from "@/app/utils/constants";
import { LoadingOverlay } from "@/app/components/ui/LoadingSpinner";

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
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  hasV2NFT?: boolean;
}

const UserProfilePage = () => {
  const params = useParams();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [allActivities, setAllActivities] = useState<UserActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPage, setSelectedPage] = useState("Leaderboard");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Read NFT balance for the V2 contract
  const { data: v2NFTBalance } = useReadContract({
    abi,
    functionName: "balanceOf",
    address: NFT_ACCESS_ADDRESS,
    args: [params.address as `0x${string}`],
  });

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const address = params.address as string;
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/activity/track/me?address=${address}&page=${currentPage}&limit=${itemsPerPage}`
        );
        const data = await response.json();

        const profile = await nnsClient.getProfile(address as HexString);

        setUserProfile({
          address: data.userActivity?.address || address,
          nadName: profile?.primaryName,
          nadAvatar: profile?.avatar,
          points: data.userActivity?.points || 0,
          rank: data.userActivity?.rank || "0",
          activitiesList: data.userActivity?.activitiesList || [],
          pagination: data.userActivity?.pagination,
          hasV2NFT: Number(v2NFTBalance) > 0,
        });
      } catch (error) {
        console.error("Error fetching user profile:", error);
      } finally {
        setIsLoading(false);
      }
    };

    const fetchAllActivities = async () => {
      try {
        const address = params.address as string;
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/activity/track/me?address=${address}&limit=1000`
        );
        const data = await response.json();
        setAllActivities(data.userActivity?.activitiesList || []);
      } catch (error) {
        console.error("Error fetching all activities:", error);
      }
    };

    if (params.address) {
      fetchUserProfile();
      fetchAllActivities();
    }
  }, [params.address, currentPage, v2NFTBalance]);

  const onPageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Helper function to format address
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

  return (
    <div className="flex min-h-screen bg-gradient-to-r from-violet-50 to-indigo-50 text-gray-800">
      {/* Mobile menu button */}
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
          w-72 lg:w-auto
          h-screen lg:h-auto
          overflow-y-auto
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
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        <Header />
        <div className="flex-1 overflow-y-auto">
          <div className="w-full px-4 py-8">
            {/* Two-column layout for desktop */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Profile & Activity Chart */}
              <div className="lg:col-span-6 space-y-6">
                {/* Profile Header */}
                <div className="bg-white rounded-2xl shadow-lg px-10 py-4 transform transition-all duration-300 hover:shadow-xl">
                  <div className="flex flex-row items-center flex-wrap gap-4">
                    {/* Left Column: Avatar and Name */}
                    <div className="flex flex-col items-center">
                      <div className="relative mb-2">
                        <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-violet-200 shadow-md">
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
                        <div className="absolute -bottom-1 -right-1 bg-violet-600 text-white rounded-full w-8 h-8 flex items-center justify-center shadow-lg text-sm">
                          <span className="font-bold">{userProfile.rank}</span>
                          <span className="text-xs">
                            {getOrdinalSuffix(userProfile.rank)}
                          </span>
                        </div>
                      </div>

                      <h1 className="text-xl font-bold text-gray-900 leading-tight">
                        {userProfile.nadName ||
                          formatAddress(userProfile.address)}
                      </h1>

                      {userProfile.nadName && (
                        <p className="text-gray-500 text-sm font-mono mt-0.5">
                          {formatAddress(userProfile.address)}
                        </p>
                      )}
                    </div>

                    {/* Right Column: Points and Badges */}
                    <div className="flex-1 flex flex-col items-end">
                      <div className="p-3 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-xl text-center shadow-lg w-80">
                        <div className="text-3xl font-bold text-white">
                          {userProfile.points}
                        </div>
                        <div className="text-violet-100 text-sm">
                          Total Points
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                          <svg
                            className="w-3 h-3 mr-1"
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
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            <svg
                              className="w-3 h-3 mr-1"
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
                  </div>
                </div>

                {/* Activities Chart Card */}
                <div className="bg-white rounded-2xl shadow-lg p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-900">
                      Activity Overview
                    </h2>
                    <span className="px-3 py-1 bg-violet-100 text-violet-800 rounded-full text-sm font-medium">
                      {userProfile.pagination?.total || 0} Total
                    </span>
                  </div>

                  <div className="bg-gray-50 rounded-xl">
                    <ActivitiesChart activities={allActivities} />
                  </div>

                  {/* Summary Stats */}
                  <div className="grid grid-cols-2 gap-4 mt-6">
                    <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
                      <div className="text-sm text-gray-700 font-medium">
                        Buy Transactions
                      </div>
                      <div className="flex items-center mt-1">
                        <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                        <span className="text-2xl font-bold text-gray-900">
                          {
                            allActivities.filter(
                              (a) => a.intentId?.action === "buy"
                            ).length
                          }
                        </span>
                      </div>
                    </div>
                    <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
                      <div className="text-sm text-gray-700 font-medium">
                        Sell Transactions
                      </div>
                      <div className="flex items-center mt-1">
                        <span className="w-3 h-3 bg-red-500 rounded-full mr-2"></span>
                        <span className="text-2xl font-bold text-gray-900">
                          {
                            allActivities.filter(
                              (a) => a.intentId?.action === "sell"
                            ).length
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Activities List */}
              <div className="lg:col-span-6">
                <div className="bg-white rounded-2xl shadow-lg p-6 h-full">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">
                      Activity History
                    </h2>
                  </div>

                  {/* Activities List */}
                  <div className="space-y-4">
                    {userProfile.activitiesList.length > 0 ? (
                      userProfile.activitiesList.map((activity, index) => (
                        <div
                          key={index}
                          className={`p-4 rounded-xl hover:shadow-md transition-all duration-300 border border-l-2 border-l-purple-500 border-gray-200"`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="shrink-0 mt-1">
                              <div
                                className={`w-10 h-10 rounded-full flex items-center justify-center shadow-md bg-gradient-to-br from-violet-500 to-violet-600`}
                              >
                                {activity.intentId?.tokenSymbol ? (
                                  <Image
                                    src={getTokenImage(
                                      activity.intentId.tokenSymbol
                                    )}
                                    alt={activity.intentId.tokenSymbol}
                                    width={48}
                                    height={48}
                                    className="rounded-full"
                                    onError={(e) => {
                                      e.currentTarget.style.display = "none";
                                      e.currentTarget.parentElement!.innerHTML = `
                                        <span class="text-white font-bold">
                                          ${activity.name
                                            .charAt(0)
                                            .toUpperCase()}
                                        </span>
                                      `;
                                    }}
                                  />
                                ) : (
                                  <span className="text-white font-bold">
                                    {activity.name.charAt(0).toUpperCase()}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex-1">
                              <div className="flex justify-between">
                                <div>
                                  <div className="font-semibold text-gray-900 flex items-center gap-2">
                                    {activity.name}
                                    {activity.intentId?.tokenSymbol && (
                                      <div className="flex items-center gap-1.5 bg-gray-100 px-2 py-0.5 rounded-full">
                                        <Image
                                          src={`/tokens/${activity.intentId.tokenSymbol.toLowerCase()}.png`}
                                          alt={activity.intentId.tokenSymbol}
                                          width={16}
                                          height={16}
                                          className="rounded-full"
                                          onError={(e) => {
                                            e.currentTarget.style.display =
                                              "none";
                                          }}
                                        />
                                        <span className="text-xs font-medium text-gray-700">
                                          {activity.intentId.tokenSymbol}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {getTimeAgo(activity.date)}
                                  </div>
                                </div>
                                <div>
                                  <div className="inline-flex items-center px-2 py-1 bg-violet-100 text-violet-800 rounded-full text-xs font-medium">
                                    +{activity.points} pts
                                  </div>
                                </div>
                              </div>

                              {activity?.intentId && (
                                <div className="mt-3 flex flex-row flex-wrap gap-2">
                                  <div className="flex items-center space-x-2 bg-white p-2 rounded-lg shadow-sm border border-gray-100">
                                    <span className="text-xs font-medium text-gray-500">
                                      Action:
                                    </span>
                                    <span
                                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                        activity.intentId.action === "buy"
                                          ? "bg-green-100 text-green-800"
                                          : "bg-red-100 text-red-800"
                                      }`}
                                    >
                                      {activity.intentId.action.toUpperCase()}
                                    </span>
                                  </div>
                                  <div className="flex items-center space-x-2 bg-white p-2 rounded-lg shadow-sm border border-gray-100">
                                    <span className="text-xs font-medium text-gray-500">
                                      Token:
                                    </span>
                                    <span className="text-xs font-semibold text-gray-900">
                                      {activity.intentId.tokenSymbol}
                                    </span>
                                  </div>
                                  <div className="flex items-center space-x-2 bg-white p-2 rounded-lg shadow-sm border border-gray-100">
                                    <span className="text-xs font-medium text-gray-500">
                                      Amount:
                                    </span>
                                    <span className="text-xs font-semibold text-gray-900">
                                      {activity.intentId.tokenAmount}
                                    </span>
                                  </div>
                                  <div className="flex items-center space-x-2 bg-white p-2 rounded-lg shadow-sm border border-gray-100">
                                    <span className="text-xs font-medium text-gray-500">
                                      Price:
                                    </span>
                                    <span className="text-xs font-semibold text-gray-900">
                                      ${activity.intentId.tokenPrice}
                                    </span>
                                  </div>
                                </div>
                              )}

                              <div className="flex flex-row justify-between items-center gap-2 mt-2">
                                {activity.intentId?.txHash && (
                                  <a
                                    href={`https://testnet.monadexplorer.com/tx/${activity.intentId.txHash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center text-xs text-violet-600 hover:text-violet-800 font-medium transition-colors duration-200"
                                    style={{ flex: 1 }}
                                  >
                                    <svg
                                      className="w-3 h-3 mr-1"
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
                                    View Transaction
                                  </a>
                                )}
                                {activity.signalId && (
                                  <a
                                    href={`/signals/${activity.signalId}`}
                                    className="inline-flex items-center text-xs text-violet-600 hover:text-violet-800 hover:underline font-medium transition-colors duration-200 justify-end"
                                    style={{
                                      flex: 1,
                                      justifyContent: "flex-end",
                                      textAlign: "right",
                                    }}
                                  >
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
                                        d="M9 5l7 7-7 7"
                                      />
                                    </svg>
                                    View Related Signal
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center p-12 bg-gray-50 rounded-xl">
                        <div className="text-5xl mb-4">📊</div>
                        <h3 className="text-xl font-semibold text-gray-800 mb-2">
                          No Activities Yet
                        </h3>
                        <p className="text-gray-600">
                          This user has not recorded any activities yet.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Pagination */}
                  {userProfile.pagination &&
                    userProfile.pagination.totalPages > 1 && (
                      <div className="mt-6">
                        <Pagination
                          currentPage={currentPage}
                          totalPages={userProfile.pagination.totalPages}
                          onPageChange={onPageChange}
                          showIcons={true}
                        />
                      </div>
                    )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfilePage;
