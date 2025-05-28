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
import { useReadContract } from "wagmi";
import { abi } from "@/app/abi/early-nft";
import { NFT_ACCESS_ADDRESS } from "@/app/utils/constants";

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

const TransactionsPage = () => {
  const params = useParams();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  //   const [allActivities, setAllActivities] = useState<UserActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPage, setSelectedPage] = useState("Leaderboard");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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
          activitiesList: (data.userActivity?.activitiesList || []).filter(
            (activity: UserActivity) =>
              activity.intentId &&
              (activity.intentId.action === "buy" ||
                activity.intentId.action === "sell")
          ),
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

  const onPageChange = (page: number) => {
    setCurrentPage(page);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-r from-violet-50 to-indigo-50">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-violet-600"></div>
          <p className="mt-4 text-violet-600 font-medium">Loading profile...</p>
        </div>
      </div>
    );
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
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-12">
                <div className="bg-white rounded-2xl shadow-lg p-6 h-full">
                  <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-4">
                      <a
                        href={`/users/${params.address}`}
                        className="inline-flex items-center text-violet-600 hover:text-violet-800 transition-colors duration-200"
                      >
                        <svg
                          className="w-5 h-5 mr-1"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M10 19l-7-7m0 0l7-7m-7 7h18"
                          />
                        </svg>
                        Back to Profile
                      </a>
                    </div>
                  </div>

                  {/* Header */}
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-900">
                      Latest Transactions
                    </h2>
                    <a
                      href={`/users/${params.address}`}
                      className="text-violet-600 hover:text-violet-800 text-sm font-medium flex items-center gap-1"
                    >
                      See more
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
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </a>
                  </div>

                  {/* Activities List */}
                  <div className="space-y-3">
                    {userProfile.activitiesList.length > 0 ? (
                      userProfile.activitiesList.map((activity, index) => (
                        <div
                          key={index}
                          className="flex items-center bg-white rounded-xl border border-gray-100 px-4 py-3 shadow-sm gap-3"
                        >
                          {/* Buy/Sell Icon */}
                          <div
                            className="shrink-0 flex items-center justify-center w-7 h-7 rounded-full"
                            style={{
                              backgroundColor:
                                activity.intentId.action === "buy"
                                  ? "#E9F9EE"
                                  : "#FDECEC",
                            }}
                          >
                            {activity.intentId.action === "buy" ? (
                              <svg
                                className="w-4 h-4 text-green-500"
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
                            ) : (
                              <svg
                                className="w-4 h-4 text-red-500"
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
                            )}
                          </div>
                          {/* Action */}
                          <span
                            className={`font-medium text-sm ${
                              activity.intentId.action === "buy"
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {activity.intentId.action.charAt(0).toUpperCase() +
                              activity.intentId.action.slice(1)}
                          </span>
                          {/* Token Image */}
                          {activity.intentId?.tokenSymbol && (
                            <Image
                              src={getTokenImage(activity.intentId.tokenSymbol)}
                              alt={activity.intentId.tokenSymbol}
                              width={24}
                              height={24}
                              className="rounded-full"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                              }}
                            />
                          )}
                          {/* Amount + Symbol */}
                          <span className="font-semibold text-gray-900 text-sm">
                            {activity.intentId.tokenAmount.toLocaleString()}{" "}
                            {activity.intentId.tokenSymbol}
                          </span>
                          {/* Time ago */}
                          <span className="text-xs text-gray-500 ml-auto">
                            {getTimeAgo(activity.date)}
                          </span>
                          {/* Points pill */}
                          <span className="ml-2 px-2 py-0.5 rounded-md bg-violet-50 text-violet-700 text-xs font-semibold">
                            +{activity.points} pts
                          </span>
                          {/* Version pill */}
                          <span
                            className={`ml-2 px-2 py-0.5 rounded-md text-xs font-semibold ${
                              activity.intentId.tokenPrice > 1
                                ? "bg-pink-100 text-pink-600"
                                : "bg-orange-100 text-orange-600"
                            }`}
                          >
                            {activity.intentId.tokenPrice > 1 ? "V2" : "V1"}
                          </span>
                          {/* External link icon */}
                          <a
                            href={`https://testnet.monadexplorer.com/tx/${activity.intentId.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-2 text-violet-600 hover:text-violet-800"
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
                                d="M14 3h7m0 0v7m0-7L10 14"
                              />
                            </svg>
                          </a>
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

export default TransactionsPage;
