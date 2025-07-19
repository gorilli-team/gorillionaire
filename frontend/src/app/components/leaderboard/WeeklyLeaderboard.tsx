"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Pagination } from "flowbite-react";
import { useAccount } from "wagmi";
import Image from "next/image";
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
  weeklyPoints?: number;
  weeklyActivities?: number;
  streak?: number;
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

interface CountdownTime {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
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

const WeeklyLeaderboardComponent = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [traders, setTraders] = useState<Trader[]>([]);
  const [traderCount, setTraderCount] = useState(0);
  const [myData, setMyData] = useState<Trader | null>(null);
  const [weekInfo, setWeekInfo] = useState<{
    weekStart: Date;
    weekEnd: Date;
  } | null>(null);
  const [hasReferrals, setHasReferrals] = useState(false);
  const [totalWeeklyPoints, setTotalWeeklyPoints] = useState(0);
  const [countdown, setCountdown] = useState<CountdownTime>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  const { address } = useAccount();

  // Calculate time remaining until end of week
  const calculateTimeRemaining = useCallback(() => {
    if (!weekInfo) return;

    const now = new Date().getTime();
    const endOfWeek = weekInfo.weekEnd.getTime();
    const timeDifference = endOfWeek - now;

    if (timeDifference > 0) {
      const days = Math.floor(timeDifference / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (timeDifference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      );
      const minutes = Math.floor(
        (timeDifference % (1000 * 60 * 60)) / (1000 * 60)
      );
      const seconds = Math.floor((timeDifference % (1000 * 60)) / 1000);

      setCountdown({ days, hours, minutes, seconds });
    } else {
      setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
    }
  }, [weekInfo]);

  // Update countdown every second
  useEffect(() => {
    calculateTimeRemaining();
    const timer = setInterval(calculateTimeRemaining, 1000);
    return () => clearInterval(timer);
  }, [calculateTimeRemaining]);

  const onPageChange = (page: number) => {
    setCurrentPage(page);
    fetchWeeklyLeaderboard(page);
  };

  const fetchWeeklyLeaderboard = async (currentPage: number) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/activity/track/leaderboard/weekly?page=${currentPage}`
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
        setWeekInfo({
          weekStart: new Date(data.weekStart),
          weekEnd: new Date(data.weekEnd),
        });

        // Use total weekly points from API response (all users, not just current page)
        setTotalWeeklyPoints(data.totalWeeklyPoints || 0);

        // Check if any users have referrals
        const hasAnyReferrals = processedTraders.some(
          (trader: Trader) =>
            (trader.totalReferred && trader.totalReferred > 0) ||
            (trader.totalReferralPoints && trader.totalReferralPoints > 0)
        );
        setHasReferrals(hasAnyReferrals);
      } catch (nnsError) {
        console.error("Error fetching NNS profiles:", nnsError);
        // Fallback: use traders without NNS profiles
        const processedTraders = validUsers.map((u: Trader, i: number) => ({
          ...u,
          nadName: undefined,
          nadAvatar: `/avatar_${i % 6}.png`,
        }));

        setTraders(processedTraders);
        setTraderCount(data.pagination.total);
        setWeekInfo({
          weekStart: new Date(data.weekStart),
          weekEnd: new Date(data.weekEnd),
        });
      }
    } catch (error) {
      console.error("Error fetching weekly leaderboard:", error);
      setTraders([]);
      setTraderCount(0);
    }
  };

  const fetchMe = useCallback(async () => {
    try {
      if (!address) return;

      // Calculate the start of the current week (Monday)
      const now = new Date();
      const startOfWeek = new Date(now);
      const dayOfWeek = now.getDay();
      const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      startOfWeek.setDate(now.getDate() - daysToSubtract);
      startOfWeek.setHours(0, 0, 0, 0);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/activity/track/me/weekly?address=${address}`
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

        // Create trader object from /me/weekly response
        const myTraderData: Trader = {
          rank: data.rank || 0,
          address: address,
          nadName: nadProfile[0]?.primaryName,
          nadAvatar: nadProfile[0]?.avatar || `/avatar_${data.rank % 6}.png`,
          points: data.weeklyPoints || 0, // Use weekly points from API
          weeklyPoints: data.weeklyPoints || 0,
          weeklyActivities: data.weeklyActivities || 0,
          streak: data.streak || 0,
          activitiesList: [], // Not needed for weekly view
          pagination: {
            total: 0,
            page: 1,
            limit: 10,
            totalPages: 1,
          },
          totalReferred: data.totalReferred || 0,
          totalReferralPoints: data.totalReferralPoints || 0,
        };

        setMyData(myTraderData);
      } catch (nnsError) {
        console.error("Error fetching NNS profile for user:", nnsError);

        // Fallback: create trader data without NNS profile
        const myTraderData: Trader = {
          rank: data.rank || 0,
          address: address,
          nadName: undefined,
          nadAvatar: `/avatar_${data.rank % 6}.png`,
          points: data.weeklyPoints || 0,
          weeklyPoints: data.weeklyPoints || 0,
          weeklyActivities: data.weeklyActivities || 0,
          streak: data.streak || 0,
          activitiesList: [],
          pagination: {
            total: 0,
            page: 1,
            limit: 10,
            totalPages: 1,
          },
          totalReferred: data.totalReferred || 0,
          totalReferralPoints: data.totalReferralPoints || 0,
        };

        setMyData(myTraderData);
      }
    } catch (error) {
      console.error("Error fetching user activity:", error);
    }
  }, [address]);

  useEffect(() => {
    fetchWeeklyLeaderboard(currentPage);
    fetchMe();

    const interval = setInterval(() => {
      fetchWeeklyLeaderboard(currentPage);
      fetchMe();
    }, 30000);

    // Cleanup interval on component unmount
    return () => clearInterval(interval);
  }, [address, currentPage, fetchMe]);

  // Pagination logic for traders
  const currentTraders = traders;

  // Use myData instead of finding in traders list
  const myTrader = myData;
  const pageTraders = currentTraders;

  // Function to check if the current wallet address matches a trader
  const isCurrentUserAddress = (traderAddress: string): boolean => {
    if (!address) return false;
    return address.toLowerCase() === traderAddress.toLowerCase();
  };

  // Format week range
  const formatWeekRange = () => {
    if (!weekInfo) return "";
    const start = weekInfo.weekStart.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    const end = weekInfo.weekEnd.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    return `${start} - ${end}`;
  };

  return (
    <div className="w-full">
      <div className="w-full mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-1 sm:p-3 md:p-6 flex flex-col">
          {/* Weekly Header */}
          <div className="mb-3 px-1 sm:px-0">
            <div className="bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200 rounded-lg p-3 mb-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 bg-violet-100 rounded-full flex items-center justify-center">
                  <svg
                    className="w-3 h-3 text-violet-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"
                    />
                  </svg>
                </div>
                <h2 className="text-lg font-bold text-violet-800">
                  Weekly Leaderboard
                </h2>
                {countdown.days > 0 ||
                countdown.hours > 0 ||
                countdown.minutes > 0 ||
                countdown.seconds > 0 ? (
                  <span className="text-sm text-red-600 font-medium">
                    • {countdown.days}d {countdown.hours}h {countdown.minutes}m{" "}
                    {countdown.seconds}s left
                  </span>
                ) : (
                  <span className="text-sm text-red-600 font-medium">
                    • Time&apos;s up!
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <p className="text-sm text-violet-700">
                    This week:{" "}
                    <span className="font-semibold">{formatWeekRange()}</span>
                  </p>
                  <p className="text-sm text-violet-700">
                    Total points:{" "}
                    <span className="font-semibold text-violet-800">
                      {totalWeeklyPoints.toLocaleString()}
                    </span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                  <span className="text-xs font-semibold text-amber-700">
                    🎉 50 MON RAFFLE
                  </span>
                </div>
              </div>
              <div className="bg-white rounded-md p-2 border border-violet-100 mt-2">
                <p className="text-xs text-gray-700">
                  We will raffle{" "}
                  <span className="font-bold text-violet-600">50 MON each</span>{" "}
                  to{" "}
                  <span className="font-bold text-violet-600">5 winners</span>{" "}
                  this week, based on percentage chance. Plus we reward{" "}
                  <span className="font-bold text-green-600">top 3 users</span>{" "}
                  with guaranteed prizes.
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  💡 Points and referrals shown are for this week only
                </p>
              </div>
            </div>
          </div>

          {/* Table with reduced padding on mobile */}
          <div className="overflow-x-auto -mx-1 sm:-mx-3 md:-mx-6">
            <div className="px-1 sm:px-3 md:px-6">
              {/* This Week Section - Show current user first */}
              {myTrader && myTrader.points > 0 && (
                <div className="mb-4">
                  <div className="bg-gradient-to-r from-violet-100 to-purple-100 border-2 border-violet-300 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-5 h-5 bg-violet-200 rounded-full flex items-center justify-center">
                        <svg
                          className="w-3 h-3 text-violet-700"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                          />
                        </svg>
                      </div>
                      <h3 className="text-lg font-bold text-violet-800">
                        This Week
                      </h3>
                      <span className="text-sm text-violet-600 font-medium">
                        (Your Progress)
                      </span>
                    </div>

                    {/* Desktop/Tablet View for This Week */}
                    <div className="hidden sm:block">
                      <table className="w-full">
                        <thead>
                          <tr className="text-left text-sm text-violet-600 border-b border-violet-200">
                            <th className="pb-2 pr-2 font-medium">RANK</th>
                            <th className="pb-2 pr-2 font-medium">TRADER</th>
                            <th className="pb-2 pr-2 font-medium text-center">
                              WEEKLY ACTIVITIES
                            </th>
                            <th className="pb-2 pr-2 font-medium">
                              WEEKLY POINTS
                            </th>
                            <th className="pb-2 pr-2 font-medium text-center">
                              STREAK
                            </th>
                            {hasReferrals && (
                              <th className="pb-2 pr-2 font-medium text-center">
                                WEEKLY REFERRALS
                              </th>
                            )}
                            <th className="pb-2 font-medium">
                              WINNING CHANCES
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="bg-white rounded-lg">
                            <td className="py-3 h-14 text-violet-700 pr-2 pl-4">
                              <div className="flex items-center">
                                {myTrader.rank <= 3 ? (
                                  <div className="flex items-center gap-2">
                                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full mr-2 bg-amber-100 text-amber-800 font-bold">
                                      {myTrader.rank}
                                    </span>
                                    <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 border border-green-200">
                                      {myTrader.rank === 1
                                        ? "130 MON chance"
                                        : myTrader.rank === 2
                                        ? "75 MON chance"
                                        : "45 MON chance"}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="font-bold">
                                    {myTrader.rank}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 h-14 pr-2">
                              <Link
                                href={`/users/${myTrader.address}`}
                                className="flex items-center hover:opacity-80 transition-opacity"
                              >
                                <div className="w-8 h-8 rounded-full flex items-center justify-center mr-2 overflow-hidden border-2 border-violet-200">
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
                                <span className="text-violet-800 font-bold truncate max-w-[120px] md:max-w-[150px]">
                                  {displayAddress(
                                    myTrader.address,
                                    myTrader.nadName
                                  )}
                                </span>
                              </Link>
                            </td>
                            <td className="py-3 h-14 text-center text-violet-700 pr-2">
                              <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-medium rounded-full bg-blue-50 text-blue-700">
                                {myTrader.weeklyActivities || 0}
                              </span>
                            </td>
                            <td className="py-3 h-14 text-violet-700 pr-2 font-bold">
                              <div className="flex items-center gap-1.5">
                                <span className="text-lg">
                                  {myTrader.points}
                                </span>
                                <span className="inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-medium rounded-full bg-violet-50 border border-violet-200 text-violet-700">
                                  Level {getLevelInfo(myTrader.points).level}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 h-14 text-center text-violet-700 pr-2">
                              {myTrader.streak && myTrader.streak > 0 ? (
                                <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-medium rounded-full bg-orange-50 text-orange-700 border border-orange-200">
                                  🔥 {myTrader.streak}
                                </span>
                              ) : (
                                <span className="text-violet-400 text-xs">
                                  -
                                </span>
                              )}
                            </td>
                            {hasReferrals && (
                              <td className="py-3 h-14 text-center text-violet-700 pr-2">
                                {(myTrader.totalReferred &&
                                  myTrader.totalReferred > 0) ||
                                (myTrader.totalReferralPoints &&
                                  myTrader.totalReferralPoints > 0) ? (
                                  <>
                                    {myTrader.totalReferred &&
                                      myTrader.totalReferred > 0 && (
                                        <div className="flex items-center gap-2 mt-1">
                                          <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-green-50 text-green-700">
                                            {myTrader.totalReferred} referrals
                                          </span>
                                          {myTrader.totalReferralPoints &&
                                            myTrader.totalReferralPoints >
                                              0 && (
                                              <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-orange-50 text-orange-700">
                                                {myTrader.totalReferralPoints}{" "}
                                                ref pts
                                              </span>
                                            )}
                                        </div>
                                      )}
                                    {myTrader.totalReferred === 0 &&
                                      myTrader.totalReferralPoints &&
                                      myTrader.totalReferralPoints > 0 && (
                                        <div className="flex items-center gap-2 mt-1">
                                          <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-orange-50 text-orange-700">
                                            {myTrader.totalReferralPoints} ref
                                            pts
                                          </span>
                                        </div>
                                      )}
                                  </>
                                ) : (
                                  <span className="text-gray-400 text-xs">
                                    -
                                  </span>
                                )}
                              </td>
                            )}
                            <td className="py-3 h-14 text-violet-700">
                              {totalWeeklyPoints > 0 ? (
                                <div className="flex flex-col">
                                  <span className="text-sm font-bold text-violet-800">
                                    {(
                                      (myTrader.points / totalWeeklyPoints) *
                                      100
                                    ).toFixed(1)}
                                    %
                                  </span>
                                  <span className="text-xs text-violet-600">
                                    of total points
                                  </span>
                                </div>
                              ) : (
                                <span className="text-sm text-gray-400">-</span>
                              )}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile View for This Week */}
                    <div className="sm:hidden">
                      <div className="bg-white rounded-lg p-3 border border-violet-200">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {myTrader.rank <= 3 ? (
                              <div className="flex items-center gap-2">
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-800 font-bold text-sm">
                                  {myTrader.rank}
                                </span>
                                <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 border border-green-200">
                                  {myTrader.rank === 1
                                    ? "130 MON chance"
                                    : myTrader.rank === 2
                                    ? "75 MON chance"
                                    : "45 MON chance"}
                                </span>
                              </div>
                            ) : (
                              <span className="text-violet-700 font-bold text-sm">
                                {myTrader.rank}
                              </span>
                            )}
                            <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden border-2 border-violet-200">
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
                                className="text-violet-800 font-semibold text-sm hover:underline truncate max-w-[120px] md:max-w-[150px]"
                              >
                                {displayAddress(
                                  myTrader.address,
                                  myTrader.nadName
                                )}
                              </Link>
                              <span className="text-[10px] text-violet-600">
                                {myTrader.weeklyActivities || 0} weekly
                                activities
                              </span>
                              {myTrader.streak && myTrader.streak > 0 && (
                                <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-orange-50 text-orange-700 border border-orange-200 mt-1">
                                  🔥 {myTrader.streak} day streak
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-end">
                            <div className="flex items-center gap-1.5">
                              <span className="text-violet-700 font-bold text-lg">
                                {myTrader.points} pts
                              </span>
                              <span className="inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-medium rounded-full bg-violet-50 border border-violet-200 text-violet-700">
                                Level {getLevelInfo(myTrader.points).level}
                              </span>
                            </div>
                            {totalWeeklyPoints > 0 && (
                              <span className="text-[10px] text-violet-600 text-right mt-0.5">
                                <span className="font-bold text-violet-800">
                                  {(
                                    (myTrader.points / totalWeeklyPoints) *
                                    100
                                  ).toFixed(1)}
                                  %
                                </span>
                                <span className="ml-1">of total points</span>
                              </span>
                            )}
                          </div>
                        </div>
                        {hasReferrals && (
                          <>
                            {(myTrader.totalReferred &&
                              myTrader.totalReferred > 0) ||
                            (myTrader.totalReferralPoints &&
                              myTrader.totalReferralPoints > 0) ? (
                              <div className="flex items-center gap-2 mt-2">
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
                              <span className="text-gray-400 text-xs">
                                No referrals this week
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="mb-6">
                {/* Desktop/Tablet View */}
                <table className="w-full border-collapse hidden sm:table">
                  <thead className="sticky top-0 bg-white z-10">
                    <tr className="text-left text-sm text-gray-500 border-b">
                      <th className="pb-2 pr-2 font-medium">RANK</th>
                      <th className="pb-2 pr-2 font-medium">TRADER</th>
                      <th className="pb-2 pr-2 font-medium text-center">
                        WEEKLY ACTIVITIES
                      </th>
                      <th className="pb-2 pr-2 font-medium">WEEKLY POINTS</th>
                      <th className="pb-2 pr-2 font-medium text-center">
                        STREAK
                      </th>
                      {hasReferrals && (
                        <th className="pb-2 pr-2 font-medium text-center">
                          WEEKLY REFERRALS
                        </th>
                      )}
                      <th className="pb-2 font-medium">WINNING CHANCES</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageTraders.map((trader) => (
                      <tr
                        key={trader.address}
                        className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                          isCurrentUserAddress(trader.address)
                            ? "bg-violet-100"
                            : ""
                        }`}
                      >
                        <td className="py-4 h-16 text-gray-700 pr-2 pl-4">
                          <div className="flex items-center">
                            {trader.rank <= 3 ? (
                              <div className="flex items-center gap-2">
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full mr-2 bg-amber-100 text-amber-800 font-bold">
                                  {trader.rank}
                                </span>
                                <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 border border-green-200">
                                  {trader.rank === 1
                                    ? "130 MON chance"
                                    : trader.rank === 2
                                    ? "75 MON chance"
                                    : "45 MON chance"}
                                </span>
                              </div>
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
                            {trader.weeklyActivities || 0}
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
                          {trader.streak && trader.streak > 0 ? (
                            <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-medium rounded-full bg-orange-50 text-orange-700 border border-orange-200">
                              🔥 {trader.streak}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">-</span>
                          )}
                        </td>
                        {hasReferrals && (
                          <td className="py-4 h-16 text-center text-gray-700 pr-2">
                            {(trader.totalReferred &&
                              trader.totalReferred > 0) ||
                            (trader.totalReferralPoints &&
                              trader.totalReferralPoints > 0) ? (
                              <>
                                {trader.totalReferred &&
                                  trader.totalReferred > 0 && (
                                    <div className="flex items-center gap-2 mt-1">
                                      <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-green-50 text-green-700">
                                        {trader.totalReferred} referrals
                                      </span>
                                      {trader.totalReferralPoints &&
                                        trader.totalReferralPoints > 0 && (
                                          <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-orange-50 text-orange-700">
                                            {trader.totalReferralPoints} ref pts
                                          </span>
                                        )}
                                    </div>
                                  )}
                                {trader.totalReferred === 0 &&
                                  trader.totalReferralPoints &&
                                  trader.totalReferralPoints > 0 && (
                                    <div className="flex items-center gap-2 mt-1">
                                      <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-orange-50 text-orange-700">
                                        {trader.totalReferralPoints} ref pts
                                      </span>
                                    </div>
                                  )}
                              </>
                            ) : null}
                          </td>
                        )}
                        <td className="py-4 h-16 text-gray-700">
                          {totalWeeklyPoints > 0 ? (
                            <div className="flex flex-col">
                              <span className="text-sm font-medium">
                                {(
                                  (trader.points / totalWeeklyPoints) *
                                  100
                                ).toFixed(1)}
                                %
                              </span>
                              <span className="text-xs text-gray-500">
                                of total points
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Mobile View */}
                <div className="sm:hidden space-y-3">
                  {pageTraders.map((trader) => (
                    <div
                      key={trader.address}
                      className={`
                        border rounded-lg px-4 py-3 bg-white hover:border-gray-300 transition-colors
                        ${
                          isCurrentUserAddress(trader.address)
                            ? "bg-violet-100 border-violet-300"
                            : ""
                        }
                      `}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {trader.rank <= 3 ? (
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-800 font-bold text-sm">
                                {trader.rank}
                              </span>
                              <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 border border-green-200">
                                {trader.rank === 1
                                  ? "130 MON chance"
                                  : trader.rank === 2
                                  ? "75 MON chance"
                                  : "45 MON chance"}
                              </span>
                            </div>
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
                              className="text-gray-800 font-semibold text-sm hover:underline truncate max-w-[120px] md:max-w-[150px]"
                            >
                              {displayAddress(trader.address, trader.nadName)}
                            </Link>
                            <span className="text-[10px] text-gray-500">
                              {trader.weeklyActivities || 0} weekly activities
                            </span>
                            {trader.streak && trader.streak > 0 && (
                              <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-orange-50 text-orange-700 border border-orange-200 mt-1">
                                🔥 {trader.streak} day streak
                              </span>
                            )}
                            {hasReferrals && (
                              <>
                                {(trader.totalReferred &&
                                  trader.totalReferred > 0) ||
                                (trader.totalReferralPoints &&
                                  trader.totalReferralPoints > 0) ? (
                                  <>
                                    {trader.totalReferred &&
                                      trader.totalReferred > 0 && (
                                        <div className="flex items-center gap-2 mt-1">
                                          <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-green-50 text-green-700">
                                            {trader.totalReferred} referrals
                                          </span>
                                          {trader.totalReferralPoints &&
                                            trader.totalReferralPoints > 0 && (
                                              <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-orange-50 text-orange-700">
                                                {trader.totalReferralPoints} ref
                                                pts
                                              </span>
                                            )}
                                        </div>
                                      )}
                                    {trader.totalReferred === 0 &&
                                      trader.totalReferralPoints &&
                                      trader.totalReferralPoints > 0 && (
                                        <div className="flex items-center gap-2 mt-1">
                                          <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-orange-50 text-orange-700">
                                            {trader.totalReferralPoints} ref pts
                                          </span>
                                        </div>
                                      )}
                                  </>
                                ) : null}
                              </>
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
                          {totalWeeklyPoints > 0 && (
                            <span className="text-[10px] text-gray-500 text-right mt-0.5">
                              <span className="font-medium text-gray-700">
                                {(
                                  (trader.points / totalWeeklyPoints) *
                                  100
                                ).toFixed(1)}
                                %
                              </span>
                              <span className="ml-1">of total points</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Pagination */}
          <div className="mt-4 flex justify-center">
            <Pagination
              currentPage={currentPage}
              totalPages={Math.ceil(traderCount / 10)}
              onPageChange={onPageChange}
              showIcons
            />
          </div>

          {/* Mobile Pagination */}
          <div className="sm:hidden mt-4">
            <MobilePagination
              currentPage={currentPage}
              totalPages={Math.ceil(traderCount / 10)}
              onPageChange={onPageChange}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeeklyLeaderboardComponent;
