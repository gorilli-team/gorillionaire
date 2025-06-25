"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Pagination } from "flowbite-react";
import { useAccount } from "wagmi";
import Image from "next/image";
import { getTimeAgo } from "@/app/utils/time";
import { nnsClient } from "@/app/providers";
import Link from "next/link";
import MobilePagination from "@/app/components/ui/MobilePagination";
import { getLevelInfo } from "@/app/utils/xp";

interface Trader {
  rank: number;
  address: string;
  nadName?: string;
  nadAvatar?: string;
  points: number;
  activitiesList: Activity[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  totalReferred?: number;
  totalReferralPoints?: number;
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

// New function for more compact address display
const displayAddress = (address: string, nadName?: string): string => {
  if (nadName) return nadName;
  if (!address) return "";
  // For addresses without NNS names, use a more compact format
  return `${address.substring(0, 4)}...${address.substring(
    address.length - 3
  )}`;
};

const LeaderboardComponent = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [traders, setTraders] = useState<Trader[]>([]);
  const [traderCount, setTraderCount] = useState(0);
  const [myData, setMyData] = useState<Trader | null>(null);

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

      // Validate that we have users data
      if (
        !data.users ||
        !Array.isArray(data.users) ||
        data.users.length === 0
      ) {
        setTraders([]);
        setTraderCount(0);
        return;
      }

      // Filter out any users without valid addresses
      const validUsers = data.users.filter(
        (user: Trader) =>
          user &&
          user.address &&
          typeof user.address === "string" &&
          user.address.trim() !== ""
      );

      if (validUsers.length === 0) {
        setTraders([]);
        setTraderCount(0);
        return;
      }

      const userAddresses = validUsers.map((u: Trader) => u.address);

      try {
        const nadProfiles = await nnsClient.getProfiles(userAddresses);

        const processedTraders =
          validUsers.map((u: Trader, i: number) => ({
            ...u,
            nadName: nadProfiles[i]?.primaryName,
            nadAvatar: nadProfiles[i]?.avatar || `/avatar_${i % 6}.png`,
          })) || [];

        setTraders(processedTraders);
        setTraderCount(data.pagination.total);
      } catch (nnsError) {
        console.error("Error fetching NNS profiles:", nnsError);
        // Fallback: use traders without NNS profiles
        const processedTraders = validUsers.map((u: Trader) => ({
          ...u,
          nadName: undefined,
          nadAvatar: `/avatar_${u.rank % 6}.png`,
        }));

        setTraders(processedTraders);
        setTraderCount(data.pagination.total);
      }
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      setTraders([]);
      setTraderCount(0);
    }
  };

  const fetchMe = useCallback(async () => {
    try {
      if (!address) return;

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/activity/track/me?address=${address}`
      );
      const data = await response.json();

      // Validate address before calling NNS
      if (!address || typeof address !== "string" || address.trim() === "") {
        console.error("Invalid address for NNS lookup:", address);
        return;
      }

      try {
        // Get NNS profile for the current user
        const nadProfile = await nnsClient.getProfiles([address]);

        // Create trader object from /me response
        const myTraderData: Trader = {
          rank: data.userActivity?.rank || 0, // Access rank from userActivity object
          address: address,
          nadName: nadProfile[0]?.primaryName,
          nadAvatar:
            nadProfile[0]?.avatar ||
            `/avatar_${data.userActivity?.rank % 6}.png`,
          points: data.userActivity?.points || 0,
          activitiesList: data.userActivity?.activitiesList || [],
          pagination: data.userActivity?.pagination || {
            total: 0,
            page: 1,
            limit: 10,
            totalPages: 1,
          },
          totalReferred: data.userActivity?.totalReferred || 0,
          totalReferralPoints: data.userActivity?.totalReferralPoints || 0,
        };

        setMyData(myTraderData);
      } catch (nnsError) {
        console.error("Error fetching NNS profile for user:", nnsError);

        // Fallback: create trader data without NNS profile
        const myTraderData: Trader = {
          rank: data.userActivity?.rank || 0,
          address: address,
          nadName: undefined,
          nadAvatar: `/avatar_${data.userActivity?.rank % 6}.png`,
          points: data.userActivity?.points || 0,
          activitiesList: data.userActivity?.activitiesList || [],
          pagination: data.userActivity?.pagination || {
            total: 0,
            page: 1,
            limit: 10,
            totalPages: 1,
          },
          totalReferred: data.userActivity?.totalReferred || 0,
          totalReferralPoints: data.userActivity?.totalReferralPoints || 0,
        };

        setMyData(myTraderData);
      }
    } catch (error) {
      console.error("Error fetching user activity:", error);
    }
  }, [address]);

  useEffect(() => {
    fetchLeaderboard(currentPage);
    fetchMe();

    const interval = setInterval(() => {
      fetchLeaderboard(currentPage);
      fetchMe();
    }, 30000);

    // Cleanup interval on component unmount
    return () => clearInterval(interval);
  }, [address, currentPage, fetchMe]);

  // Pagination logic for traders - no slicing since the server already returns paginated data
  const itemsPerPage = 10;
  const totalTraderPages = Math.ceil(traderCount / itemsPerPage);
  const currentTraders = traders; // Use directly, no filtering

  // Use myData instead of finding in traders list
  const myTrader = myData;
  const pageTraders = currentTraders;

  // Function to check if the current wallet address matches a trader
  const isCurrentUserAddress = (traderAddress: string): boolean => {
    if (!address) return false;
    return address.toLowerCase() === traderAddress.toLowerCase();
  };

  return (
    <div className="w-full">
      <div className="w-full mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-1 sm:p-3 md:p-6 flex flex-col">
          {/* Table with reduced padding on mobile */}
          <div className="overflow-x-auto -mx-1 sm:-mx-3 md:-mx-6">
            <div className="px-1 sm:px-3 md:px-6">
              <div className="mb-6">
                {/* Desktop/Tablet View */}
                <table className="w-full border-collapse hidden sm:table">
                  <thead className="sticky top-0 bg-white z-10">
                    <tr className="text-left text-sm text-gray-500 border-b">
                      <th className="pb-2 pr-2 font-medium">RANK</th>
                      <th className="pb-2 pr-2 font-medium">TRADER</th>
                      <th className="pb-2 pr-2 font-medium text-center">
                        ACTIVITIES
                      </th>
                      <th className="pb-2 pr-2 font-medium">POINTS</th>
                      <th className="pb-2 pr-2 font-medium text-center">
                        REFERRALS
                      </th>
                      <th className="pb-2 font-medium">LATEST ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myTrader && (
                      <>
                        <tr className="bg-violet-100">
                          <td className="py-4 h-16 text-gray-700 pr-2 pl-4">
                            <div className="flex items-center">
                              {myTrader.rank <= 3 ? (
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full mr-2 bg-amber-100 text-amber-800 font-bold">
                                  {myTrader.rank}
                                </span>
                              ) : (
                                <span>{myTrader.rank}</span>
                              )}
                            </div>
                          </td>
                          <td className="py-4 h-16 pr-2">
                            <Link
                              href={`/users/${myTrader.address}`}
                              className="flex items-center hover:opacity-80 transition-opacity"
                            >
                              <div className="w-8 h-8 rounded-full flex items-center justify-center mr-2 overflow-hidden">
                                {myTrader.nadAvatar &&
                                myTrader.nadAvatar !== "" &&
                                isValidUrl(myTrader.nadAvatar) ? (
                                  <Image
                                    src={myTrader.nadAvatar}
                                    alt="User Avatar"
                                    width={32}
                                    height={32}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <Image
                                    src={`/avatar_${myTrader.rank % 6}.png`}
                                    alt="User Avatar"
                                    width={32}
                                    height={32}
                                    className="w-full h-full object-cover"
                                  />
                                )}
                              </div>
                              <span className="text-gray-700 font-bold truncate max-w-[120px] md:max-w-[150px]">
                                {displayAddress(
                                  myTrader.address,
                                  myTrader.nadName
                                )}
                              </span>
                            </Link>
                          </td>
                          <td className="py-4 h-16 text-center text-gray-700 pr-2">
                            <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-medium rounded-full bg-blue-50 text-blue-700">
                              {myTrader.pagination.total}
                            </span>
                          </td>
                          <td className="py-4 h-16 text-gray-700 pr-2 font-bold">
                            <div className="flex items-center gap-1.5">
                              <span>{myTrader.points}</span>
                              <span className="inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-medium rounded-full bg-white border border-violet-200 text-violet-700">
                                Level {getLevelInfo(myTrader.points).level}
                              </span>
                            </div>
                          </td>
                          <td className="py-4 h-16 text-center text-gray-700 pr-2">
                            {(myTrader.totalReferred &&
                              myTrader.totalReferred > 0) ||
                            (myTrader.totalReferralPoints &&
                              myTrader.totalReferralPoints > 0) ? (
                              <div className="flex items-center gap-2 mt-1">
                                {myTrader.totalReferred &&
                                  myTrader.totalReferred > 0 && (
                                    <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-green-50 text-green-700">
                                      {myTrader.totalReferred} referrals
                                    </span>
                                  )}
                                {myTrader.totalReferralPoints &&
                                  myTrader.totalReferralPoints > 0 && (
                                    <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-orange-50 text-orange-700">
                                      {myTrader.totalReferralPoints} ref pts
                                    </span>
                                  )}
                              </div>
                            ) : (
                              <span className="text-gray-300">-</span>
                            )}
                          </td>

                          <td className="py-4 h-16 text-gray-700">
                            {myTrader.pagination &&
                              myTrader.pagination.total > 0 && (
                                <div className="flex flex-col">
                                  <span className="text-sm font-medium">
                                    {myTrader.activitiesList[0].name}
                                    <span className="ml-2 text-xs font-normal text-blue-600">
                                      +{myTrader.activitiesList[0].points}
                                      pts
                                    </span>
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {getTimeAgo(
                                      myTrader.activitiesList[0].date
                                    )}
                                  </span>
                                </div>
                              )}
                          </td>
                        </tr>
                        <tr>
                          <td colSpan={7} style={{ height: 16 }}></td>
                        </tr>
                      </>
                    )}
                    {pageTraders.map((trader) => (
                      //log trader
                      <tr
                        key={trader.address}
                        className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                          isCurrentUserAddress(trader.address)
                            ? "bg-violet-200"
                            : ""
                        }`}
                      >
                        <td className="py-4 h-16 text-gray-700 pr-2 pl-4">
                          <div className="flex items-center">
                            {trader.rank <= 3 ? (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full mr-2 bg-amber-100 text-amber-800 font-bold">
                                {trader.rank}
                              </span>
                            ) : (
                              <span>{trader.rank}</span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 h-16 pr-2">
                          <Link
                            href={`/users/${trader.address}`}
                            className="flex items-center hover:opacity-80 transition-opacity"
                          >
                            <div className="w-8 h-8 rounded-full flex items-center justify-center mr-2 overflow-hidden">
                              {trader.nadAvatar &&
                              trader.nadAvatar !== "" &&
                              isValidUrl(trader.nadAvatar) ? (
                                <Image
                                  src={trader.nadAvatar}
                                  alt="User Avatar"
                                  width={32}
                                  height={32}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.style.display = "none";
                                    e.currentTarget.parentElement!.innerHTML = `
                                      <Image
                                        src="/avatar_${trader.rank % 6}.png"
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
                                  src={`/avatar_${trader.rank % 6}.png`}
                                  alt="User Avatar"
                                  width={32}
                                  height={32}
                                  className="w-full h-full object-cover"
                                />
                              )}
                            </div>
                            <span className="text-gray-700 font-bold truncate max-w-[120px] md:max-w-[150px]">
                              {displayAddress(trader.address, trader.nadName)}
                            </span>
                          </Link>
                        </td>
                        <td className="py-4 h-16 text-center text-gray-700 pr-2">
                          <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-medium rounded-full bg-blue-50 text-blue-700">
                            {trader.activitiesList.length}
                          </span>
                        </td>
                        <td className="py-4 h-16 text-gray-700 pr-2 font-bold">
                          <div className="flex items-center gap-1.5">
                            <span>{trader.points}</span>
                            <span className="inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-medium rounded-full bg-white border border-violet-200 text-violet-700">
                              Level {getLevelInfo(trader.points).level}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 h-16 text-center text-gray-700 pr-2">
                          {(trader.totalReferred && trader.totalReferred > 0) ||
                          (trader.totalReferralPoints &&
                            trader.totalReferralPoints > 0) ? (
                            <div className="flex items-center gap-2 mt-1">
                              {trader.totalReferred &&
                                trader.totalReferred > 0 && (
                                  <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-green-50 text-green-700">
                                    {trader.totalReferred} referrals
                                  </span>
                                )}
                              {trader.totalReferralPoints &&
                                trader.totalReferralPoints > 0 && (
                                  <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-orange-50 text-orange-700">
                                    {trader.totalReferralPoints} ref pts
                                  </span>
                                )}
                            </div>
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </td>
                        <td className="py-4 h-16 text-gray-700">
                          {trader.activitiesList &&
                            trader.activitiesList.length > 0 && (
                              <div className="flex flex-col">
                                <span className="text-sm font-medium">
                                  {
                                    trader.activitiesList[
                                      trader.activitiesList.length - 1
                                    ].name
                                  }
                                  <span className="ml-2 text-xs font-normal text-blue-600">
                                    +
                                    {
                                      trader.activitiesList[
                                        trader.activitiesList.length - 1
                                      ].points
                                    }
                                    pts
                                  </span>
                                </span>
                                <span className="text-xs text-gray-500">
                                  {getTimeAgo(
                                    trader.activitiesList[
                                      trader.activitiesList.length - 1
                                    ].date
                                  )}
                                </span>
                              </div>
                            )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Mobile View */}
                <div className="sm:hidden space-y-3">
                  {myTrader && (
                    <>
                      <div
                        className={`border rounded-lg px-4 py-3 bg-white hover:border-gray-300 transition-colors ${
                          isCurrentUserAddress(myTrader.address)
                            ? "bg-violet-100 border-violet-300"
                            : ""
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {myTrader.rank <= 3 ? (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-800 font-bold text-sm">
                                {myTrader.rank}
                              </span>
                            ) : (
                              <span className="text-gray-700 font-medium text-sm">
                                {myTrader.rank}
                              </span>
                            )}
                            <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden border border-gray-100">
                              {myTrader.nadAvatar &&
                              myTrader.nadAvatar !== "" &&
                              isValidUrl(myTrader.nadAvatar) ? (
                                <Image
                                  src={myTrader.nadAvatar}
                                  alt="User Avatar"
                                  width={32}
                                  height={32}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Image
                                  src={`/avatar_${myTrader.rank % 6}.png`}
                                  alt="User Avatar"
                                  width={32}
                                  height={32}
                                  className="w-full h-full object-cover"
                                />
                              )}
                            </div>
                            <div className="flex flex-col">
                              <Link
                                href={`/users/${myTrader.address}`}
                                className="text-gray-800 font-semibold text-sm hover:underline"
                              >
                                {displayAddress(
                                  myTrader.address,
                                  myTrader.nadName
                                )}
                              </Link>
                              <span className="text-[10px] text-gray-500">
                                {myTrader.pagination.total} activities
                              </span>
                              {(myTrader.totalReferred &&
                                myTrader.totalReferred > 0) ||
                              (myTrader.totalReferralPoints &&
                                myTrader.totalReferralPoints > 0) ? (
                                <div className="flex items-center gap-2 mt-1">
                                  {myTrader.totalReferred &&
                                    myTrader.totalReferred > 0 && (
                                      <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-green-50 text-green-700">
                                        {myTrader.totalReferred} referrals
                                      </span>
                                    )}
                                  {myTrader.totalReferralPoints &&
                                    myTrader.totalReferralPoints > 0 && (
                                      <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-orange-50 text-orange-700">
                                        {myTrader.totalReferralPoints} ref pts
                                      </span>
                                    )}
                                </div>
                              ) : (
                                <span className="text-gray-300">-</span>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-end">
                            <div className="flex items-center gap-1.5">
                              <span className="text-violet-700 font-bold text-sm">
                                {myTrader.points} pts
                              </span>
                              <span className="inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-medium rounded-full bg-white border border-violet-200 text-violet-700">
                                Level {getLevelInfo(myTrader.points).level}
                              </span>
                            </div>
                            {myTrader.activitiesList &&
                              myTrader.activitiesList.length > 0 && (
                                <span className="text-[10px] text-gray-500 text-right mt-0.5">
                                  <span className="font-medium text-gray-700">
                                    {myTrader.activitiesList[0].name}
                                  </span>
                                  <span className="ml-1 text-blue-600 font-medium">
                                    +{myTrader.activitiesList[0].points}
                                  </span>
                                  <span className="ml-1">
                                    {getTimeAgo(
                                      myTrader.activitiesList[0].date
                                    )}
                                  </span>
                                </span>
                              )}
                          </div>
                        </div>
                      </div>
                      <div style={{ height: 8 }}></div>
                    </>
                  )}
                  {pageTraders.map((trader) => (
                    <div
                      key={trader.address}
                      className={`border rounded-lg px-4 py-3 bg-white hover:border-gray-300 transition-colors ${
                        isCurrentUserAddress(trader.address)
                          ? "bg-violet-100 border-violet-300"
                          : ""
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {trader.rank <= 3 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-800 font-bold text-sm">
                              {trader.rank}
                            </span>
                          ) : (
                            <span className="text-gray-700 font-medium text-sm">
                              {trader.rank}
                            </span>
                          )}
                          <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden border border-gray-100">
                            {trader.nadAvatar &&
                            trader.nadAvatar !== "" &&
                            isValidUrl(trader.nadAvatar) ? (
                              <Image
                                src={trader.nadAvatar}
                                alt="User Avatar"
                                width={32}
                                height={32}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Image
                                src={`/avatar_${trader.rank % 6}.png`}
                                alt="User Avatar"
                                width={32}
                                height={32}
                                className="w-full h-full object-cover"
                              />
                            )}
                          </div>
                          <div className="flex flex-col">
                            <Link
                              href={`/users/${trader.address}`}
                              className="text-gray-800 font-semibold text-sm hover:underline"
                            >
                              {displayAddress(trader.address, trader.nadName)}
                            </Link>
                            <span className="text-[10px] text-gray-500">
                              {trader.activitiesList.length} activities
                            </span>
                            {(trader.totalReferred &&
                              trader.totalReferred > 0) ||
                            (trader.totalReferralPoints &&
                              trader.totalReferralPoints > 0) ? (
                              <div className="flex items-center gap-2 mt-1">
                                {trader.totalReferred &&
                                  trader.totalReferred > 0 && (
                                    <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-green-50 text-green-700">
                                      {trader.totalReferred} referrals
                                    </span>
                                  )}
                                {trader.totalReferralPoints &&
                                  trader.totalReferralPoints > 0 && (
                                    <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-orange-50 text-orange-700">
                                      {trader.totalReferralPoints} ref pts
                                    </span>
                                  )}
                              </div>
                            ) : (
                              <span className="text-gray-300">-</span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end">
                          <div className="flex items-center gap-1.5">
                            <span className="text-violet-700 font-bold text-sm">
                              {trader.points} pts
                            </span>
                            <span className="inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-medium rounded-full bg-white border border-violet-200 text-violet-700">
                              Level {getLevelInfo(trader.points).level}
                            </span>
                          </div>
                          {trader.activitiesList &&
                            trader.activitiesList.length > 0 && (
                              <span className="text-[10px] text-gray-500 text-right mt-0.5">
                                <span className="font-medium text-gray-700">
                                  {
                                    trader.activitiesList[
                                      trader.activitiesList.length - 1
                                    ].name
                                  }
                                </span>
                                <span className="ml-1 text-blue-600 font-medium">
                                  +
                                  {
                                    trader.activitiesList[
                                      trader.activitiesList.length - 1
                                    ].points
                                  }
                                </span>
                                <span className="ml-1">
                                  {getTimeAgo(
                                    trader.activitiesList[
                                      trader.activitiesList.length - 1
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
                  {currentTraders.length === 0 && (
                    <div className="text-center text-gray-500 text-sm py-8">
                      No traders to display
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-2 flex flex-col items-center w-full gap-1 flex-1">
            <span className="text-xs text-gray-500 text-center w-full">
              Showing{" "}
              {traders.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}-
              {Math.min(currentPage * itemsPerPage, traderCount)} of{" "}
              {traderCount}
            </span>
            <div className="w-full overflow-x-auto">
              <div className="flex justify-center min-w-[320px]">
                <div className="hidden sm:block">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalTraderPages > 0 ? totalTraderPages : 1}
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
      {/* Mobile pagination fixed at bottom */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-40">
        <div className="w-full">
          <MobilePagination
            currentPage={currentPage}
            totalPages={totalTraderPages > 0 ? totalTraderPages : 1}
            onPageChange={onPageChange}
          />
        </div>
      </div>
    </div>
  );
};

export default LeaderboardComponent;
