"use client";

import React, { useState, useEffect } from "react";
import { Pagination } from "flowbite-react";
import { useAccount } from "wagmi";
import Image from "next/image";
import { getTimeAgo } from "@/app/utils/time";
import { nnsClient } from "@/app/providers";
import Link from "next/link";
import MobilePagination from "@/app/components/ui/MobilePagination";
import { getLevelInfo } from "@/app/utils/xp";

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

const shortenAddress = (address: string): string => {
  if (!address) return "";
  return `${address.substring(0, 6)}...${address.substring(
    address.length - 4
  )}`;
};

const LeaderboardComponent = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredInvestors, setFilteredInvestors] = useState<Investor[]>([]);
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [investorCount, setInvestorCount] = useState(0);
  const [myData, setMyData] = useState<Investor | null>(null);

  const { address } = useAccount();

  const onPageChange = (page: number) => {
    setCurrentPage(page);
    fetchLeaderboard(page);
  };

  const fetchLeaderboard = async (currentPage: number) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/activity/track/leaderboard?page=${currentPage}`
      );
      const data = await response.json();

      const nadProfiles = await nnsClient.getProfiles(
        data.users?.map((u: Investor) => u.address)
      );

      const processedInvestors =
        data.users.map((u: Investor, i: number) => ({
          ...u,
          nadName: nadProfiles[i]?.primaryName,
          nadAvatar: nadProfiles[i]?.avatar || `/avatar_${i % 6}.png`,
        })) || [];

      setInvestors(processedInvestors);
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

      // Get NNS profile for the current user
      const nadProfile = await nnsClient.getProfiles([address]);

      // Create investor object from /me response
      const myInvestorData: Investor = {
        rank: data.userActivity?.rank || 0, // Access rank from userActivity object
        address: address,
        nadName: nadProfile[0]?.primaryName,
        nadAvatar:
          nadProfile[0]?.avatar || `/avatar_${data.userActivity?.rank % 6}.png`,
        points: data.userActivity?.points || 0,
        activitiesList: data.userActivity?.activitiesList || [],
      };

      setMyData(myInvestorData);
    } catch (error) {
      console.error("Error fetching user activity:", error);
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

  // Use myData instead of finding in investors list
  const myInvestor = myData;
  const pageInvestors = currentInvestors;

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
                    {myInvestor && (
                      <>
                        <tr className="bg-violet-100">
                          <td className="py-4 h-16 text-gray-700 pr-2 pl-4">
                            <div className="flex items-center">
                              {myInvestor.rank <= 3 ? (
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full mr-2 bg-amber-100 text-amber-800 font-bold">
                                  {myInvestor.rank}
                                </span>
                              ) : (
                                <span>{myInvestor.rank}</span>
                              )}
                            </div>
                          </td>
                          <td className="py-4 h-16 pr-2">
                            <Link
                              href={`/users/${myInvestor.address}`}
                              className="flex items-center hover:opacity-80 transition-opacity"
                            >
                              <div className="w-8 h-8 rounded-full flex items-center justify-center mr-2 overflow-hidden">
                                {myInvestor.nadAvatar &&
                                myInvestor.nadAvatar !== "" &&
                                isValidUrl(myInvestor.nadAvatar) ? (
                                  <Image
                                    src={myInvestor.nadAvatar}
                                    alt="User Avatar"
                                    width={32}
                                    height={32}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <Image
                                    src={`/avatar_${myInvestor.rank % 6}.png`}
                                    alt="User Avatar"
                                    width={32}
                                    height={32}
                                    className="w-full h-full object-cover"
                                  />
                                )}
                              </div>
                              <span className="text-gray-700 font-bold truncate max-w-[200px] md:max-w-full">
                                {myInvestor?.nadName || myInvestor.address}
                              </span>
                            </Link>
                          </td>
                          <td className="py-4 h-16 text-center text-gray-700 pr-2">
                            <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-medium rounded-full bg-blue-50 text-blue-700">
                              {myInvestor.activitiesList.length}
                            </span>
                          </td>
                          <td className="py-4 h-16 text-gray-700 pr-2 font-bold">
                            {myInvestor.points}
                          </td>
                          <td className="py-4 h-16 text-gray-700">
                            {myInvestor.activitiesList &&
                              myInvestor.activitiesList.length > 0 && (
                                <div className="flex flex-col">
                                  <span className="text-sm font-medium">
                                    {
                                      myInvestor.activitiesList[
                                        myInvestor.activitiesList.length - 1
                                      ].name
                                    }
                                    <span className="ml-2 text-xs font-normal text-blue-600">
                                      +
                                      {
                                        myInvestor.activitiesList[
                                          myInvestor.activitiesList.length - 1
                                        ].points
                                      }
                                      pts
                                    </span>
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {getTimeAgo(
                                      myInvestor.activitiesList[
                                        myInvestor.activitiesList.length - 1
                                      ].date
                                    )}
                                  </span>
                                </div>
                              )}
                          </td>
                        </tr>
                        <tr>
                          <td colSpan={5} style={{ height: 16 }}></td>
                        </tr>
                      </>
                    )}
                    {pageInvestors.map((investor) => (
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
                            <span className="text-gray-700 font-bold truncate max-w-[10px] md:max-w-full">
                              {investor?.nadName ||
                                shortenAddress(investor.address)}
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
                  {myInvestor && (
                    <>
                      <div
                        className="border rounded-lg px-3 py-2 bg-violet-100 border-violet-300"
                        style={{ marginBottom: 8 }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            {myInvestor.rank <= 3 ? (
                              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 text-amber-800 font-bold text-xs">
                                {myInvestor.rank}
                              </span>
                            ) : (
                              <span className="text-gray-700 font-medium text-xs">
                                {myInvestor.rank}
                              </span>
                            )}
                            <div className="w-6 h-6 rounded-full flex items-center justify-center overflow-hidden">
                              {myInvestor.nadAvatar &&
                              myInvestor.nadAvatar !== "" &&
                              isValidUrl(myInvestor.nadAvatar) ? (
                                <Image
                                  src={myInvestor.nadAvatar}
                                  alt="User Avatar"
                                  width={24}
                                  height={24}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Image
                                  src={`/avatar_${myInvestor.rank % 6}.png`}
                                  alt="User Avatar"
                                  width={24}
                                  height={24}
                                  className="w-full h-full object-cover"
                                />
                              )}
                            </div>
                            <Link
                              href={`/users/${myInvestor.address}`}
                              className="text-gray-800 font-semibold text-xs hover:underline"
                            >
                              {myInvestor?.nadName ||
                                shortenAddress(myInvestor.address)}
                            </Link>
                          </div>
                          <div className="flex flex-col items-end min-w-[40px]">
                            <span className="text-violet-700 font-bold text-sm leading-tight">
                              Level {getLevelInfo(myInvestor.points).level}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-1">
                          <span className="text-[10px] text-gray-400">
                            {myInvestor.activitiesList.length} activities
                          </span>
                          {myInvestor.activitiesList &&
                            myInvestor.activitiesList.length > 0 && (
                              <span className="text-[10px] text-gray-500 text-right">
                                <span className="font-medium text-gray-700">
                                  {
                                    myInvestor.activitiesList[
                                      myInvestor.activitiesList.length - 1
                                    ].name
                                  }
                                </span>
                                <span className="ml-1 text-blue-600 font-medium">
                                  +
                                  {
                                    myInvestor.activitiesList[
                                      myInvestor.activitiesList.length - 1
                                    ].points
                                  }
                                </span>
                                <span className="ml-1">
                                  {getTimeAgo(
                                    myInvestor.activitiesList[
                                      myInvestor.activitiesList.length - 1
                                    ].date
                                  )}
                                </span>
                              </span>
                            )}
                        </div>
                      </div>
                      <div style={{ height: 8 }}></div>
                    </>
                  )}
                  {pageInvestors.map((investor) => (
                    <div
                      key={investor.address}
                      className={`border rounded-lg px-4 py-3 bg-white hover:border-gray-300 transition-colors ${
                        isCurrentUserAddress(investor.address)
                          ? "bg-violet-100 border-violet-300"
                          : ""
                      }`}
                      style={{ marginBottom: 8 }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {investor.rank <= 3 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-800 font-bold text-sm">
                              {investor.rank}
                            </span>
                          ) : (
                            <span className="text-gray-700 font-medium text-sm">
                              {investor.rank}
                            </span>
                          )}
                          <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden border border-gray-100">
                            {investor.nadAvatar &&
                            investor.nadAvatar !== "" &&
                            isValidUrl(investor.nadAvatar) ? (
                              <Image
                                src={investor.nadAvatar}
                                alt="User Avatar"
                                width={32}
                                height={32}
                                className="w-full h-full object-cover"
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
                          <div className="flex flex-col">
                            <Link
                              href={`/users/${investor.address}`}
                              className="text-gray-800 font-semibold text-sm hover:underline"
                            >
                              {investor?.nadName ||
                                shortenAddress(investor.address)}
                            </Link>
                            <span className="text-[10px] text-gray-500">
                              {investor.activitiesList.length} activities
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end">
                          <div className="flex items-center gap-1.5">
                            <span className="text-violet-700 font-bold text-sm">
                              Level {getLevelInfo(investor.points).level}
                            </span>
                            <span className="text-[10px] text-gray-500">
                              ({investor.points} pts)
                            </span>
                          </div>
                          {investor.activitiesList &&
                            investor.activitiesList.length > 0 && (
                              <span className="text-[10px] text-gray-500 text-right mt-0.5">
                                <span className="font-medium text-gray-700">
                                  {
                                    investor.activitiesList[
                                      investor.activitiesList.length - 1
                                    ].name
                                  }
                                </span>
                                <span className="ml-1 text-blue-600 font-medium">
                                  +
                                  {
                                    investor.activitiesList[
                                      investor.activitiesList.length - 1
                                    ].points
                                  }
                                </span>
                                <span className="ml-1">
                                  {getTimeAgo(
                                    investor.activitiesList[
                                      investor.activitiesList.length - 1
                                    ].date
                                  )}
                                </span>
                              </span>
                            )}
                        </div>
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

          <div className="mt-2 flex flex-col items-center w-full gap-1">
            <span className="text-xs text-gray-500 text-center w-full">
              Showing{" "}
              {investors.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}-
              {Math.min(currentPage * itemsPerPage, investorCount)} of{" "}
              {investorCount}
            </span>
            <div className="w-full overflow-x-auto">
              <div className="flex justify-center min-w-[320px]">
                <div className="w-full sm:hidden">
                  <MobilePagination
                    currentPage={currentPage}
                    totalPages={totalInvestorPages > 0 ? totalInvestorPages : 1}
                    onPageChange={onPageChange}
                  />
                </div>
                <div className="hidden sm:block">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalInvestorPages > 0 ? totalInvestorPages : 1}
                    onPageChange={onPageChange}
                    showIcons={true}
                  />
                </div>
              </div>
            </div>
            <hr className="w-full border-t border-gray-200 mt-2" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeaderboardComponent;
