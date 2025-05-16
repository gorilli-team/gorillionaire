"use client";

import React, { useState, useEffect } from "react";
import { Pagination } from "flowbite-react";
import { useAccount } from "wagmi";
import Image from "next/image";
import { getTimeAgo } from "@/app/utils/time";
import { nnsClient } from "@/app/providers";
import Link from "next/link";

interface Investor {
  rank: number;
  address: string;
  nadName?: string;
  nadAvatar?: string;
  points: number;
  activitiesList: Activity[];
}

interface Activity {
  name: string;
  points: string;
  date: string;
}

const isValidUrl = (urlString: string): boolean => {
  try {
    const url = new URL(urlString);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

const LeaderboardComponent = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [activitiesPage, setActivitiesPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredInvestors, setFilteredInvestors] = useState<Investor[]>([]);
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [investorCount, setInvestorCount] = useState(0);

  const { address } = useAccount();

  const onPageChange = (page: number) => {
    setCurrentPage(page);
    fetchLeaderboard(page);
  };

  const onActivitiesPageChange = (page: number) => setActivitiesPage(page);

  const fetchLeaderboard = async (currentPage: number) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/activity/track/leaderboard?page=${currentPage}`
      );
      const data = await response.json();

      const nadProfiles = await nnsClient.getProfiles(
        data.users?.map((u: Investor) => u.address)
      );

      setInvestors(
        data.users.map((u: Investor, i: number) => ({
          ...u,
          nadName: nadProfiles[i]?.primaryName,
          nadAvatar: nadProfiles[i]?.avatar || `/avatar_${i % 6}.png`,
        })) || []
      );
      setInvestorCount(data.pagination.total);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      setInvestors([]);
    }
  };

  const fetchMe = async () => {
    try {
      if (!address) return;
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/activity/track/me?address=${address}`
      );
      const data = await response.json();
      console.log("userActivity:", data);
      setActivities(data?.userActivity.activitiesList || []);
    } catch (error) {
      console.error("Error fetching user activity:", error);
      setActivities([]);
    }
  };

  useEffect(() => {
    fetchLeaderboard(currentPage);
    fetchMe();

    // Set up an interval to refresh data every 30 seconds
    const interval = setInterval(() => {
      fetchLeaderboard(currentPage);
      fetchMe();
    }, 30000);

    // Cleanup interval on component unmount
    return () => clearInterval(interval);
  }, [address, currentPage]);

  // Effect to update filteredInvestors when investors change
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredInvestors(investors);
    } else {
      const filtered = investors.filter((investor) =>
        investor.address.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredInvestors(filtered);
    }
  }, [investors, searchTerm]);

  // Separate effect to reset to page 1 when search term changes
  useEffect(() => {
    if (searchTerm.trim() !== "") {
      setCurrentPage(1);
    }
  }, [searchTerm]);

  // Pagination logic for investors - no slicing since the server already returns paginated data
  const itemsPerPage = 10;
  const totalInvestorPages = Math.ceil(investorCount / itemsPerPage);
  const currentInvestors = filteredInvestors; // Use directly, no slicing

  // Pagination logic for activities - this stays as client-side pagination
  const totalActivityPages = Math.ceil(activities.length / itemsPerPage);
  const indexOfLastActivity = activitiesPage * itemsPerPage;
  const indexOfFirstActivity = indexOfLastActivity - itemsPerPage;
  const currentActivities = activities.slice(
    indexOfFirstActivity,
    indexOfLastActivity
  );

  // Function to create empty rows to maintain height
  const getEmptyRows = <T,>(items: T[], itemsPerPage: number): null[] => {
    const currentItemCount = items.length;
    if (currentItemCount < itemsPerPage) {
      return Array(itemsPerPage - currentItemCount).fill(null);
    }
    return [];
  };

  // Empty rows for both tables
  const emptyInvestorRows = getEmptyRows(currentInvestors, itemsPerPage);
  const emptyActivityRows = getEmptyRows(currentActivities, itemsPerPage);

  // Function to check if the current wallet address matches an investor
  const isCurrentUserAddress = (investorAddress: string): boolean => {
    if (!address) return false;
    return address.toLowerCase() === investorAddress.toLowerCase();
  };

  return (
    <div className="w-full bg-gray-100 px-2">
      <div className="w-full mx-auto px-1 sm:px-4 md:px-6 pt-4">
        <div className="bg-white rounded-lg shadow-sm p-1 sm:p-3 md:p-6 mt-4">
          {/* Search */}
          <div className="mb-3 sm:mb-6 px-1 sm:px-0">
            <div className="relative">
              <input
                type="text"
                placeholder="Search"
                className="w-full px-4 py-2 border border-gray-200 rounded-md pl-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <div className="absolute left-3 top-3 text-gray-400">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Table with reduced padding on mobile */}
          <div className="overflow-x-auto -mx-1 sm:-mx-3 md:-mx-6">
            <div className="px-1 sm:px-3 md:px-6">
              <div className="h-[400px] sm:h-[500px] md:h-[600px] lg:h-[680px] overflow-auto">
                {/* Desktop/Tablet View */}
                <table className="w-full border-collapse hidden sm:table">
                  <thead className="sticky top-0 bg-white z-10">
                    <tr className="text-left text-sm text-gray-500 border-b">
                      <th className="pb-2 pr-2 font-medium">RANK</th>
                      <th className="pb-2 pr-2 font-medium">INVESTOR</th>
                      <th className="pb-2 pr-2 font-medium text-center">
                        ACTIVITIES
                      </th>
                      <th className="pb-2 pr-2 font-medium">POINTS</th>
                      <th className="pb-2 font-medium">LATEST ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentInvestors.map((investor) => (
                      //log investor
                      <tr
                        key={investor.address}
                        className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                          isCurrentUserAddress(investor.address)
                            ? "bg-violet-200"
                            : ""
                        }`}
                      >
                        <td className="py-4 h-16 text-gray-700 pr-2 pl-4">
                          <div className="flex items-center">
                            {investor.rank <= 3 ? (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full mr-2 bg-amber-100 text-amber-800 font-bold">
                                {investor.rank}
                              </span>
                            ) : (
                              <span>{investor.rank}</span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 h-16 pr-2">
                          <Link
                            href={`/users/${investor.address}`}
                            className="flex items-center hover:opacity-80 transition-opacity"
                          >
                            <div className="w-8 h-8 rounded-full flex items-center justify-center mr-2 overflow-hidden">
                              {investor.nadAvatar &&
                              investor.nadAvatar !== "" &&
                              isValidUrl(investor.nadAvatar) ? (
                                <Image
                                  src={investor.nadAvatar}
                                  alt="User Avatar"
                                  width={32}
                                  height={32}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.style.display = "none";
                                    e.currentTarget.parentElement!.innerHTML = `
                                      <Image
                                        src="/avatar_${investor.rank % 6}.png"
                                        alt="User Avatar"
                                        width={32}
                                        height={32}
                                        className="w-full h-full object-cover"
                                      />
                                    `;
                                  }}
                                />
                              ) : (
                                <Image
                                  src={`/avatar_${investor.rank % 6}.png`}
                                  alt="User Avatar"
                                  width={32}
                                  height={32}
                                  className="w-full h-full object-cover"
                                />
                              )}
                            </div>
                            <span className="text-gray-700 font-bold truncate max-w-[200px] md:max-w-full">
                              {investor?.nadName || investor.address}
                            </span>
                          </Link>
                        </td>
                        <td className="py-4 h-16 text-center text-gray-700 pr-2">
                          <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-medium rounded-full bg-blue-50 text-blue-700">
                            {investor.activitiesList.length}
                          </span>
                        </td>
                        <td className="py-4 h-16 text-gray-700 pr-2 font-bold">
                          {investor.points}
                        </td>
                        <td className="py-4 h-16 text-gray-700">
                          {investor.activitiesList &&
                            investor.activitiesList.length > 0 && (
                              <div className="flex flex-col">
                                <span className="text-sm font-medium">
                                  {
                                    investor.activitiesList[
                                      investor.activitiesList.length - 1
                                    ].name
                                  }
                                  <span className="ml-2 text-xs font-normal text-blue-600">
                                    +
                                    {
                                      investor.activitiesList[
                                        investor.activitiesList.length - 1
                                      ].points
                                    }
                                    pts
                                  </span>
                                </span>
                                <span className="text-xs text-gray-500">
                                  {getTimeAgo(
                                    investor.activitiesList[
                                      investor.activitiesList.length - 1
                                    ].date
                                  )}
                                </span>
                              </div>
                            )}
                        </td>
                      </tr>
                    ))}
                    {/* Empty rows to maintain fixed height when fewer items */}
                    {emptyInvestorRows.map((_, index) => (
                      <tr
                        key={`empty-${index}`}
                        className="border-b border-gray-100"
                      >
                        <td className="h-16"></td>
                        <td className="h-16"></td>
                        <td className="h-16"></td>
                        <td className="h-16"></td>
                        <td className="h-16"></td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Mobile View */}
                <div className="sm:hidden space-y-4">
                  {currentInvestors.map((investor) => (
                    <div
                      key={investor.address}
                      className={`border rounded-lg p-3 space-y-3 hover:border-gray-300 transition-colors ${
                        isCurrentUserAddress(investor.address)
                          ? "bg-violet-200"
                          : ""
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          {investor.rank <= 3 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full mr-2 bg-amber-100 text-amber-800 font-bold">
                              {investor.rank}
                            </span>
                          ) : (
                            <span className="mr-2 text-gray-700 font-medium">
                              {investor.rank}
                            </span>
                          )}
                          <div className="w-7 h-7 rounded-full flex items-center justify-center mr-2 overflow-hidden">
                            <Image
                              src={`/avatar_${investor.rank % 6}.png`}
                              alt="User Avatar"
                              width={28}
                              height={28}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-gray-900 font-bold">
                            {investor.points}
                          </span>
                          <span className="text-xs text-gray-500">points</span>
                        </div>
                      </div>

                      <div>
                        <span className="text-xs text-gray-500 block mb-1">
                          INVESTOR
                        </span>
                        <Link
                          href={`/users/${investor.address}`}
                          className="text-gray-700 font-medium text-sm break-all hover:opacity-80 transition-opacity"
                        >
                          {investor.address}
                        </Link>
                      </div>

                      <div className="flex justify-between items-center pt-1">
                        <div>
                          <span className="text-xs text-gray-500 block mb-1">
                            ACTIVITIES
                          </span>
                          <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-medium rounded-full bg-blue-50 text-blue-700">
                            {investor.activitiesList.length}
                          </span>
                        </div>

                        {investor.activitiesList &&
                          investor.activitiesList.length > 0 && (
                            <div className="flex flex-col items-end">
                              <span className="text-xs text-gray-500 block mb-1">
                                LATEST ACTIVITY
                              </span>
                              <div className="text-right">
                                <span className="text-sm font-medium">
                                  {
                                    investor.activitiesList[
                                      investor.activitiesList.length - 1
                                    ].name
                                  }
                                </span>
                                <span className="ml-1 text-xs font-medium text-blue-600">
                                  +
                                  {
                                    investor.activitiesList[
                                      investor.activitiesList.length - 1
                                    ].points
                                  }
                                </span>
                                <span className="text-xs text-gray-500 block">
                                  {getTimeAgo(
                                    investor.activitiesList[
                                      investor.activitiesList.length - 1
                                    ].date
                                  )}
                                </span>
                              </div>
                            </div>
                          )}
                      </div>
                    </div>
                  ))}

                  {/* Empty state for mobile if needed */}
                  {emptyInvestorRows.length > 0 &&
                    currentInvestors.length === 0 && (
                      <div className="text-center text-gray-500 text-sm py-8">
                        No investors to display
                      </div>
                    )}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row items-center justify-between px-1 sm:px-0">
            <span className="text-sm text-gray-500 mb-3 sm:mb-0 font-bold">
              <span className="font-normal">Showing</span>{" "}
              {investors.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}-
              {Math.min(currentPage * itemsPerPage, investorCount)}{" "}
              <span className="font-normal">of</span> {investorCount}
            </span>
            <div className="flex-grow flex justify-center">
              <Pagination
                currentPage={currentPage}
                totalPages={totalInvestorPages > 0 ? totalInvestorPages : 1}
                onPageChange={onPageChange}
                showIcons={true}
              />
            </div>
            <div className="hidden sm:block sm:w-32"></div>
          </div>
        </div>

        {/* Activity Section */}
        <div className="bg-white rounded-lg shadow-sm p-1 sm:p-3 md:p-6 mt-4 sm:mt-6 mb-6">
          <h2 className="text-lg sm:text-xl font-medium mb-3 sm:mb-4 ml-1 sm:ml-0">
            My activities
          </h2>

          <div className="overflow-x-auto -mx-1 sm:-mx-3 md:-mx-6">
            <div className="px-1 sm:px-3 md:px-6">
              <div className="h-[300px] sm:h-[400px] md:h-[500px] lg:h-[680px] overflow-auto">
                {/* Desktop/Tablet View */}
                <table className="w-full border-collapse hidden sm:table">
                  <thead className="sticky top-0 bg-white z-10">
                    <tr className="text-left text-sm text-gray-500 border-b">
                      <th className="pb-2 font-medium">ACTIVITY</th>
                      <th className="pb-2 font-medium text-right">DATE</th>
                      <th className="pb-2 font-medium text-right">POINTS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentActivities.length > 0 ? (
                      currentActivities.map((activity, index) => (
                        <tr
                          key={index}
                          className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                        >
                          <td className="py-4 h-16">
                            <div className="flex items-center">
                              <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center mr-3 text-blue-600">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-4 w-4"
                                  viewBox="0 0 20 20"
                                  fill="currentColor"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              </div>
                              <span className="truncate max-w-[250px] md:max-w-full font-medium">
                                {activity.name}
                              </span>
                            </div>
                          </td>
                          <td className="py-4 h-16 text-right text-gray-500">
                            {getTimeAgo(activity.date)}
                          </td>
                          <td className="py-4 h-16 text-right">
                            <span className="inline-flex items-center justify-center px-2.5 py-1 text-xs font-medium rounded-full bg-green-50 text-green-700">
                              +{activity.points} Points
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr className="border-b border-gray-100">
                        <td
                          colSpan={3}
                          className="py-8 text-center text-gray-500"
                        >
                          No activities yet
                        </td>
                      </tr>
                    )}

                    {/* Empty rows */}
                    {emptyActivityRows.map((_, index) => (
                      <tr
                        key={`empty-${index}`}
                        className="border-b border-gray-100"
                      >
                        <td className="h-16"></td>
                        <td className="h-16"></td>
                        <td className="h-16"></td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Mobile View */}
                <div className="sm:hidden space-y-3">
                  {currentActivities.length > 0 ? (
                    currentActivities.map((activity, index) => (
                      <div
                        key={index}
                        className="border rounded-lg p-3 hover:border-gray-300 transition-colors"
                      >
                        <div className="flex items-center mb-2">
                          <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center mr-2 text-blue-600">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-3.5 w-3.5"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                          <span className="font-medium text-gray-800">
                            {activity.name}
                          </span>
                        </div>

                        <div className="flex justify-between items-center mt-3">
                          <div className="text-sm text-gray-500">
                            {getTimeAgo(activity.date)}
                          </div>
                          <div>
                            <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-medium rounded-full bg-green-50 text-green-700">
                              +{activity.points} Points
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-gray-500 border rounded-lg">
                      No activities yet
                    </div>
                  )}

                  {/* Empty state indicator for mobile if needed */}
                  {emptyActivityRows.length > 0 &&
                    currentActivities.length === 0 && (
                      <div className="text-center text-gray-500 text-sm py-4">
                        No more activities to display
                      </div>
                    )}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row items-center justify-between px-1 sm:px-0">
            <span className="text-sm text-gray-500 mb-3 sm:mb-0">
              <span className="font-normal">Showing</span>{" "}
              <span className="font-bold">
                {activities.length > 0 ? indexOfFirstActivity + 1 : 0}-
                {Math.min(indexOfLastActivity, activities.length)}
              </span>{" "}
              <span className="font-normal">of</span>{" "}
              <span className="font-bold">{activities.length}</span>
            </span>
            <div className="flex-grow flex justify-center">
              <Pagination
                currentPage={activitiesPage}
                totalPages={totalActivityPages > 0 ? totalActivityPages : 1}
                onPageChange={onActivitiesPageChange}
                showIcons={true}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeaderboardComponent;
