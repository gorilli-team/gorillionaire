"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { nnsClient } from "@/app/providers";
import { getTimeAgo } from "@/app/utils/time";
import { HexString } from "@/app/types";
import Sidebar from "@/app/components/sidebar";
import Header from "@/app/components/header";
import { Pagination } from "flowbite-react";
import ActivitiesChart from "@/app/components/activities-chart";

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
}

const UserProfilePage = () => {
  const params = useParams();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [allActivities, setAllActivities] = useState<UserActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPage, setSelectedPage] = useState("Leaderboard");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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
  }, [params.address, currentPage]);

  const onPageChange = (page: number) => {
    setCurrentPage(page);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-violet-600"></div>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">User not found</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100 text-gray-800">
      {/* Mobile menu button */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-full bg-gray-200"
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
          w-64 lg:w-auto
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
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-4 py-8">
            {/* Profile Header */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <div className="flex items-center space-x-4">
                <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-violet-200">
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
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-gray-900">
                    {userProfile.nadName || userProfile.address}
                  </h1>
                  <p className="text-gray-500 text-sm">
                    {userProfile.nadName ? userProfile.address : ""}
                  </p>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-violet-600">
                      {userProfile.points}
                    </div>
                    <div className="text-sm text-gray-500">Points</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-violet-600">
                      {userProfile.rank}
                      {userProfile.rank === "1"
                        ? "st"
                        : userProfile.rank === "2"
                        ? "nd"
                        : userProfile.rank === "3"
                        ? "rd"
                        : "th"}
                    </div>
                    <div className="text-sm text-gray-500">Rank</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Activities Section */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Recent Activities ({userProfile.pagination?.total || 0})
              </h2>

              {/* Add Activities Chart */}
              <div className="mb-6">
                <ActivitiesChart activities={allActivities} />
              </div>

              <div className="space-y-4">
                {userProfile.activitiesList.length > 0 ? (
                  userProfile.activitiesList.map((activity, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center">
                          <span className="text-violet-600 font-semibold">
                            {activity.name.charAt(0)}
                          </span>
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">
                            {activity.name}
                          </div>
                          {activity?.intentId && (
                            <div className="mt-1 space-y-1">
                              <div className="flex items-center space-x-2">
                                <span className="text-sm font-medium text-gray-700">
                                  Token:
                                </span>
                                <span className="text-sm text-gray-600">
                                  {activity.intentId.tokenSymbol}
                                </span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className="text-sm font-medium text-gray-700">
                                  Amount:
                                </span>
                                <span className="text-sm text-gray-600">
                                  {activity.intentId.tokenAmount}
                                </span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className="text-sm font-medium text-gray-700">
                                  Price:
                                </span>
                                <span className="text-sm text-gray-600">
                                  ${activity.intentId.tokenPrice}
                                </span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className="text-sm font-medium text-gray-700">
                                  Action:
                                </span>
                                <span
                                  className={`text-sm px-2 py-0.5 rounded-full ${
                                    activity.intentId.action === "buy"
                                      ? "bg-green-100 text-green-800"
                                      : "bg-red-100 text-red-800"
                                  }`}
                                >
                                  {activity.intentId.action.toUpperCase()}
                                </span>
                              </div>
                              {activity.intentId.txHash && (
                                <div className="flex items-center space-x-2">
                                  <span className="text-sm font-medium text-gray-700">
                                    Transaction:
                                  </span>
                                  <a
                                    href={`https://testnet.monadexplorer.com/tx/${activity.intentId.txHash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-violet-600 hover:text-violet-800 hover:underline"
                                  >
                                    View on Explorer
                                  </a>
                                </div>
                              )}
                            </div>
                          )}
                          <div className="text-sm text-gray-500 mt-1">
                            {getTimeAgo(activity.date)}
                          </div>
                        </div>
                      </div>
                      <div className="text-violet-600 font-semibold text-lg">
                        +{activity.points}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    No activities found
                  </div>
                )}
              </div>

              {/* Pagination */}
              {userProfile.pagination &&
                userProfile.pagination.totalPages > 1 && (
                  <div className="mt-6 flex justify-center">
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
  );
};

export default UserProfilePage;
