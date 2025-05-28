"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { nnsClient } from "@/app/providers";
// import { getTimeAgo } from "@/app/utils/time";
// import { getTokenImage } from "@/app/utils/tokens";
import { HexString } from "@/app/types";
import Sidebar from "@/app/components/sidebar";
import Header from "@/app/components/header";
// import { Pagination } from "flowbite-react";
// import ActivitiesChart from "@/app/components/activities-chart";
import { useReadContract, useAccount } from "wagmi";
import { abi } from "@/app/abi/early-nft";
import { NFT_ACCESS_ADDRESS } from "@/app/utils/constants";
import { getLevelInfo, getXpProgress } from "@/app/utils/xp";
import Link from "next/link";

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
  const { address: connectedAddress } = useAccount();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  // const [allActivities, setAllActivities] = useState<UserActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPage, setSelectedPage] = useState("Leaderboard");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  // const [currentPage, setCurrentPage] = useState(1);
  const currentPage = 1;
  const itemsPerPage = 5;

  // Read NFT balance for the V2 contract
  const { data: v2NFTBalance } = useReadContract({
    abi,
    functionName: "balanceOf",
    address: NFT_ACCESS_ADDRESS,
    args: [params.address as `0x${string}`],
  });

  // Helper function to check if the profile is the connected user's profile
  const isOwnProfile =
    connectedAddress?.toLowerCase() ===
    params.address?.toString().toLowerCase();

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
        console.log(data);
        // setAllActivities(data.userActivity?.activitiesList || []);
      } catch (error) {
        console.error("Error fetching all activities:", error);
      }
    };

    if (params.address) {
      fetchUserProfile();
      fetchAllActivities();
    }
  }, [params.address, currentPage, v2NFTBalance]);

  // const onPageChange = (page: number) => {
  //   setCurrentPage(page);
  // };

  // Helper function to format address
  const formatAddress = (address: string) => {
    if (!address) return "";
    return `${address.substring(0, 6)}...${address.substring(
      address.length - 4
    )}`;
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

      {/* Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="flex-1">
        <Header />
        <div className="flex-1 overflow-y-auto">
          <div className="w-full px-4 pt-4 pb-8">
            {/* Two-column layout for desktop */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
              {/* Left Column: Profile & Activity Chart - 3/5 width */}
              <div className="lg:col-span-3 space-y-6">
                {/* Profile Header */}
                <div className="bg-white rounded-lg shadow-lg p-8 transform transition-all duration-300 hover:shadow-xl">
                  {/* Top Section: Avatar, Name, Badges, and Social Buttons */}
                  <div className="flex items-start justify-between mb-6">
                    {/* Left: Avatar and Name */}
                    <div className="flex items-center gap-4">
                      <div className="relative">
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
                      </div>

                      <div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-1">
                          {userProfile.nadName ||
                            formatAddress(userProfile.address)}
                        </h1>

                        {userProfile.nadName && (
                          <p className="text-gray-500 text-sm font-mono mb-2">
                            {formatAddress(userProfile.address)}
                          </p>
                        )}

                        {/* Social Connection Buttons */}
                        {isOwnProfile && (
                          <div className="flex gap-2">
                            <button className="flex items-center gap-2 px-3 py-1.5 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors">
                              <svg
                                className="w-4 h-4"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                              >
                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                              </svg>
                              Connect X
                            </button>
                            <button className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
                              <svg
                                className="w-4 h-4"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                              >
                                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
                              </svg>
                              Connect Discord
                            </button>
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

                  {/* Level Progress Bar */}
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

                  {/* Stats Section */}
                  <div className="grid grid-cols-3 gap-6">
                    {/* Total Volume */}
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-1">
                        Total Volume
                      </h3>
                      <div className="text-2xl font-bold text-gray-900 mb-1">
                        $1,721
                      </div>
                      {/* <div className="flex items-center text-sm text-green-600">
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
                            d="M7 11l5-5m0 0l5 5m-5-5v12"
                          />
                        </svg>
                        +$197 this week
                      </div> */}
                    </div>

                    {/* Total Points */}
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-1">
                        Total Points
                      </h3>
                      <div className="text-2xl font-bold text-gray-900 mb-1">
                        {userProfile.points.toLocaleString()}
                      </div>
                      {/* <div className="flex items-center text-sm text-green-600">
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
                            d="M7 11l5-5m0 0l5 5m-5-5v12"
                          />
                        </svg>
                        +386 points this week
                      </div> */}
                    </div>

                    {/* Global Rank */}
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-1">
                        Global Rank
                      </h3>
                      <div className="text-2xl font-bold text-gray-900 mb-1">
                        {userProfile.rank}
                        {getOrdinalSuffix(userProfile.rank)}
                      </div>
                      {/* <div className="flex items-center text-sm text-red-600">
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
                            d="M17 13l-5 5m0 0l-5-5m5 5V6"
                          />
                        </svg>
                        2 positions this week
                      </div> */}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Empty - 2/5 width */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-lg shadow-lg p-8 transform transition-all duration-300 hover:shadow-xl">
                  <h2 className="text-xl font-bold text-gray-900">
                    Activity Overview
                  </h2>
                  <div className="bg-gray-50 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full">
                          {/* give me the list of the last activities */}
                          {userProfile.activitiesList.map((activity) => (
                            <div key={activity.signalId}>
                              {activity.name}
                              {activity.intentId.tokenSymbol}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <Link href={`/transactions/${userProfile.address}`}>
                      View all transactions
                    </Link>
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
