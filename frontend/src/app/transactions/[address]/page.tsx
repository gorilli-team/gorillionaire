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

    if (params.address) {
      fetchUserProfile();
    }
  }, [params.address, currentPage, v2NFTBalance]);

  const onPageChange = (page: number) => {
    setCurrentPage(page);
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
                        className="inline-flex items-center text-violet-600 text-sm font-medium hover:text-violet-800 transition-colors duration-200"
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
                      Latest Activities
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
                  <div className="space-y-2">
                    {userProfile.activitiesList.length > 0 ? (
                      userProfile.activitiesList.map((activity, index) => (
                        <div
                          key={index}
                          className={`p-3 rounded-lg hover:shadow-sm transition-all duration-200 border border-l-2 border-l-purple-500 border-gray-200"`}
                        >
                          <div className="flex items-center gap-2">
                            <div className="shrink-0">
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center shadow-sm bg-gradient-to-br from-violet-500 to-violet-600`}
                              >
                                {activity.intentId?.tokenSymbol ? (
                                  <Image
                                    src={getTokenImage(
                                      activity.intentId.tokenSymbol
                                    )}
                                    alt={activity.intentId.tokenSymbol}
                                    width={32}
                                    height={32}
                                    className="rounded-full"
                                    onError={(e) => {
                                      e.currentTarget.style.display = "none";
                                      e.currentTarget.parentElement!.innerHTML = `
                                        <span class="text-white text-sm font-bold">
                                          ${activity.name
                                            .charAt(0)
                                            .toUpperCase()}
                                        </span>
                                      `;
                                    }}
                                  />
                                ) : (
                                  <span className="text-white text-sm font-bold">
                                    {activity.name.charAt(0).toUpperCase()}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className="font-medium text-gray-900 text-sm truncate">
                                    {activity.name}
                                  </div>
                                  {activity.intentId?.tokenSymbol && (
                                    <div className="flex items-center gap-1 bg-gray-100 px-1.5 py-0.5 rounded-full shrink-0">
                                      <Image
                                        src={`/tokens/${activity.intentId.tokenSymbol.toLowerCase()}.png`}
                                        alt={activity.intentId.tokenSymbol}
                                        width={12}
                                        height={12}
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
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="text-xs text-gray-500">
                                    {getTimeAgo(activity.date)}
                                  </span>
                                  <div className="inline-flex items-center px-1.5 py-0.5 bg-violet-100 text-violet-800 rounded-full text-xs font-medium">
                                    +{activity.points} pts
                                  </div>
                                </div>
                              </div>

                              {activity?.intentId && (
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                  <div className="flex items-center space-x-1 bg-white px-1.5 py-0.5 rounded-md border border-gray-100">
                                    <span className="text-xs text-gray-500">
                                      Action:
                                    </span>
                                    <span
                                      className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                                        activity.intentId.action === "buy"
                                          ? "bg-green-100 text-green-800"
                                          : "bg-red-100 text-red-800"
                                      }`}
                                    >
                                      {activity.intentId.action.toUpperCase()}
                                    </span>
                                  </div>
                                  <div className="flex items-center space-x-1 bg-white px-1.5 py-0.5 rounded-md border border-gray-100">
                                    <span className="text-xs text-gray-500">
                                      Amount:
                                    </span>
                                    <span className="text-xs font-medium text-gray-900">
                                      {activity.intentId.tokenAmount}{" "}
                                      {activity.intentId.tokenSymbol}
                                    </span>
                                  </div>
                                  <div className="flex items-center space-x-1 bg-white px-1.5 py-0.5 rounded-md border border-gray-100">
                                    <span className="text-xs text-gray-500">
                                      Price:
                                    </span>
                                    <span className="text-xs font-medium text-gray-900">
                                      ${activity.intentId.tokenPrice}
                                    </span>
                                  </div>
                                </div>
                              )}

                              <div className="flex items-center gap-2 mt-1.5">
                                {activity.intentId?.txHash && (
                                  <a
                                    href={`https://testnet.monadexplorer.com/tx/${activity.intentId.txHash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center text-xs text-violet-600 hover:text-violet-800 font-medium transition-colors duration-200"
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
                                    className="inline-flex items-center text-xs text-violet-600 hover:text-violet-800 font-medium transition-colors duration-200"
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
                                        d="M9 5l7 7-7 7"
                                      />
                                    </svg>
                                    View Signal
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

export default TransactionsPage;
