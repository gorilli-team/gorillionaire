"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { nnsClient } from "@/app/providers";
import { getLevelInfo } from "@/app/utils/xp";
import { Pagination } from "flowbite-react";
import { HexString } from "@/app/types";

interface ArchivedLeaderboard {
  _id: string;
  weekStart: string;
  weekEnd: string;
  weekNumber: number;
  year: number;
  totalWeeklyPoints: number;
  totalParticipants: number;
  isCompleted: boolean;
  completedAt: string;
  leaderboard: Array<{
    rank: number;
    address: string;
    weeklyPoints: number;
    weeklyActivities: number;
    totalReferred: number;
    totalReferralPoints: number;
    createdAt: string;
    discordUsername: string;
    nadName: string | null;
    nadAvatar: string | null;
    winningChances: number;
  }>;
  raffleWinners: Array<{
    address: string;
    rank: number;
    weeklyPoints: number;
    prizeAmount: number;
    nadName: string | null;
  }>;
  metadata: {
    cacheHits: number;
    cacheMisses: number;
    totalRequests: number;
    averageResponseTime: number;
  };
}

interface PaginationData {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const ArchivedLeaderboard = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [archivedLeaderboards, setArchivedLeaderboards] = useState<
    ArchivedLeaderboard[]
  >([]);
  const [pagination, setPagination] = useState<PaginationData>({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState<ArchivedLeaderboard | null>(
    null
  );
  const [selectedWeekLoading, setSelectedWeekLoading] = useState(false);
  const [selectedWeekWithNNS, setSelectedWeekWithNNS] =
    useState<ArchivedLeaderboard | null>(null);

  // Leaderboard pagination state
  const [leaderboardPage, setLeaderboardPage] = useState(1);
  const [leaderboardLimit] = useState(20);

  // Get week and year from URL params
  const weekFromUrl = searchParams.get("week");
  const yearFromUrl = searchParams.get("year");

  const fetchArchivedLeaderboards = async (page: number = 1) => {
    try {
      setLoading(true);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/activity/track/leaderboard/archived?page=${page}&limit=20`
      );
      const data = await response.json();

      setArchivedLeaderboards(data.leaderboards || []);
      setPagination(
        data.pagination || {
          total: 0,
          page: 1,
          limit: 20,
          totalPages: 0,
        }
      );
    } catch (error) {
      console.error("Error fetching archived leaderboards:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSpecificWeek = async (weekNumber: number, year: number) => {
    try {
      setSelectedWeekLoading(true);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/activity/track/leaderboard/archived/${weekNumber}/${year}`
      );
      const data = await response.json();
      setSelectedWeek(data);

      // Fetch NNS profiles for all users in the leaderboard
      if (data && data.leaderboard && data.leaderboard.length > 0) {
        try {
          const userAddresses = data.leaderboard.map(
            (user: { address: string }) => user.address as HexString
          );
          const nadProfiles = await nnsClient.getProfiles(userAddresses);

          // Update leaderboard with NNS data
          const updatedLeaderboard = data.leaderboard.map(
            (
              user: { address: string; [key: string]: unknown },
              index: number
            ) => ({
              ...user,
              nadName: nadProfiles[index]?.primaryName || null,
              nadAvatar: nadProfiles[index]?.avatar || null,
            })
          );

          // Update raffle winners with NNS data
          const winnerAddresses = data.raffleWinners.map(
            (winner: { address: string }) => winner.address as HexString
          );
          const winnerProfiles = await nnsClient.getProfiles(winnerAddresses);

          const updatedRaffleWinners = data.raffleWinners.map(
            (
              winner: { address: string; [key: string]: unknown },
              index: number
            ) => ({
              ...winner,
              nadName: winnerProfiles[index]?.primaryName || null,
            })
          );

          const updatedData = {
            ...data,
            leaderboard: updatedLeaderboard,
            raffleWinners: updatedRaffleWinners,
          };

          setSelectedWeekWithNNS(updatedData);
        } catch (nnsError) {
          console.error("Error fetching NNS profiles:", nnsError);
          // Fallback: use data without NNS profiles
          setSelectedWeekWithNNS(data);
        }
      } else {
        setSelectedWeekWithNNS(data);
      }
    } catch (error) {
      console.error("Error fetching specific week:", error);
    } finally {
      setSelectedWeekLoading(false);
    }
  };

  const handleWeekClick = (weekNumber: number, year: number) => {
    // Update URL with week and year parameters
    const params = new URLSearchParams();
    params.set("week", weekNumber.toString());
    params.set("year", year.toString());
    router.push(`/leaderboard?${params.toString()}`);

    fetchSpecificWeek(weekNumber, year);
    setLeaderboardPage(1); // Reset leaderboard pagination when selecting a new week
  };

  const handleCloseWeek = () => {
    setSelectedWeek(null);
    setSelectedWeekWithNNS(null);
    setLeaderboardPage(1); // Reset leaderboard pagination
    // Remove week and year from URL
    router.push("/leaderboard");
  };

  useEffect(() => {
    fetchArchivedLeaderboards();
  }, []);

  // Load specific week from URL params on component mount
  useEffect(() => {
    if (weekFromUrl && yearFromUrl) {
      const weekNumber = parseInt(weekFromUrl);
      const year = parseInt(yearFromUrl);
      if (!isNaN(weekNumber) && !isNaN(year)) {
        fetchSpecificWeek(weekNumber, year);
      }
    }
  }, [weekFromUrl, yearFromUrl]);

  const onPageChange = (page: number) => {
    fetchArchivedLeaderboards(page);
  };

  const onLeaderboardPageChange = (page: number) => {
    setLeaderboardPage(page);
  };

  const formatWeekRange = (weekStart: string, weekEnd: string) => {
    const start = new Date(weekStart).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    const end = new Date(weekEnd).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    return `${start} - ${end}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const displayAddress = (address: string, nadName?: string | null) => {
    if (nadName) return nadName;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  // Calculate paginated leaderboard data
  const getPaginatedLeaderboard = () => {
    const leaderboard =
      selectedWeekWithNNS?.leaderboard || selectedWeek?.leaderboard || [];
    const startIndex = (leaderboardPage - 1) * leaderboardLimit;
    const endIndex = startIndex + leaderboardLimit;
    return leaderboard.slice(startIndex, endIndex);
  };

  const getLeaderboardPagination = () => {
    const leaderboard =
      selectedWeekWithNNS?.leaderboard || selectedWeek?.leaderboard || [];
    const totalPages = Math.ceil(leaderboard.length / leaderboardLimit);
    return {
      total: leaderboard.length,
      page: leaderboardPage,
      limit: leaderboardLimit,
      totalPages: totalPages,
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading archived leaderboards...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Archived Weekly Leaderboards
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Historical weekly competition results and past winners.
        </p>
      </div>

      {/* Archived Weeks List */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Past Weeks</h2>

        {archivedLeaderboards.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📅</div>
            <h3 className="text-xl font-semibold text-gray-600 mb-2">
              No archived weeks yet
            </h3>
            <p className="text-gray-500">
              Weekly leaderboards will be archived here when weeks are
              completed.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {archivedLeaderboards.map((week) => (
              <div
                key={week._id}
                className="border border-gray-200 rounded-lg p-4 hover:border-violet-300 transition-colors cursor-pointer"
                onClick={() => handleWeekClick(week.weekNumber, week.year)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="bg-violet-100 rounded-lg p-3">
                      <div className="text-violet-600 font-bold text-lg">
                        W{week.weekNumber}
                      </div>
                      <div className="text-violet-500 text-sm">{week.year}</div>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {formatWeekRange(week.weekStart, week.weekEnd)}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {week.totalParticipants} participants •{" "}
                        {week.totalWeeklyPoints.toLocaleString()} total points
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500">
                      Completed {formatDate(week.completedAt)}
                    </div>
                    {week.raffleWinners.length > 0 && (
                      <div className="text-sm text-amber-600 font-medium">
                        🎉 {week.raffleWinners.length} winners
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="mt-6 flex justify-center">
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={onPageChange}
              showIcons
            />
          </div>
        )}
      </div>

      {/* Selected Week Details */}
      {selectedWeek && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Week {selectedWeek.weekNumber} ({selectedWeek.year}) -{" "}
              {formatWeekRange(selectedWeek.weekStart, selectedWeek.weekEnd)}
            </h2>
            <button
              onClick={handleCloseWeek}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          {selectedWeekLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading week details...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Week Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-violet-50 rounded-lg p-4">
                  <div className="text-violet-600 font-semibold">
                    Total Points
                  </div>
                  <div className="text-2xl font-bold text-violet-800">
                    {selectedWeek.totalWeeklyPoints.toLocaleString()}
                  </div>
                </div>
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="text-blue-600 font-semibold">
                    Participants
                  </div>
                  <div className="text-2xl font-bold text-blue-800">
                    {selectedWeek.totalParticipants}
                  </div>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="text-green-600 font-semibold">Winners</div>
                  <div className="text-2xl font-bold text-green-800">
                    {selectedWeek.raffleWinners.length}
                  </div>
                </div>
                <div className="bg-amber-50 rounded-lg p-4">
                  <div className="text-amber-600 font-semibold">Prize Pool</div>
                  <div className="text-2xl font-bold text-amber-800">
                    {selectedWeek.raffleWinners.length * 50} MON
                  </div>
                </div>
              </div>

              {/* Raffle Winners */}
              {selectedWeek.raffleWinners.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Raffle Winners
                  </h3>
                  <div className="grid gap-3">
                    {(
                      selectedWeekWithNNS?.raffleWinners ||
                      selectedWeek.raffleWinners
                    ).map((winner) => (
                      <Link
                        key={winner.address}
                        href={`/users/${winner.address}`}
                        className="flex items-center gap-4 p-3 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors cursor-pointer"
                      >
                        <div className="text-amber-600 font-bold">
                          #{winner.rank}
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                            <span className="text-amber-700 font-bold text-sm">
                              {winner.address.slice(2, 4).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">
                              {displayAddress(winner.address, winner.nadName)}
                            </div>
                            <div className="text-sm text-gray-600">
                              {winner.weeklyPoints} points •{" "}
                              {winner.prizeAmount} MON
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Leaderboard */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Leaderboard
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-sm text-gray-600 border-b border-gray-200">
                        <th className="pb-3 font-medium">RANK</th>
                        <th className="pb-3 font-medium">TRADER</th>
                        <th className="pb-3 font-medium text-center">
                          ACTIVITIES
                        </th>
                        <th className="pb-3 font-medium">POINTS</th>
                        <th className="pb-3 font-medium">WINNING CHANCES</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getPaginatedLeaderboard().map((user) => (
                        <tr
                          key={user.address}
                          className="border-b border-gray-100"
                        >
                          <td className="py-3 text-gray-700">
                            <div className="flex items-center">
                              {user.rank <= 3 ? (
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full mr-2 bg-amber-100 text-amber-800 font-bold">
                                  {user.rank}
                                </span>
                              ) : (
                                <span className="font-bold">{user.rank}</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3">
                            <Link
                              href={`/users/${user.address}`}
                              className="flex items-center hover:opacity-80 transition-opacity"
                            >
                              <div className="w-8 h-8 rounded-full flex items-center justify-center mr-2 overflow-hidden border-2 border-gray-200">
                                {user.nadAvatar &&
                                isValidUrl(user.nadAvatar) ? (
                                  <Image
                                    src={user.nadAvatar}
                                    alt="User Avatar"
                                    width={32}
                                    height={32}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <Image
                                    src={`/avatar_${user.rank % 6}.png`}
                                    alt="User Avatar"
                                    width={32}
                                    height={32}
                                    className="w-full h-full object-cover"
                                  />
                                )}
                              </div>
                              <span className="text-gray-800 font-medium truncate max-w-[150px]">
                                {displayAddress(user.address, user.nadName)}
                              </span>
                            </Link>
                          </td>
                          <td className="py-3 text-center text-gray-700">
                            <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-medium rounded-full bg-blue-50 text-blue-700">
                              {user.weeklyActivities}
                            </span>
                          </td>
                          <td className="py-3 text-gray-700 font-bold">
                            <div className="flex items-center gap-1.5">
                              <span className="text-lg">
                                {user.weeklyPoints}
                              </span>
                              <span className="inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-medium rounded-full bg-violet-50 border border-violet-200 text-violet-700">
                                Level {getLevelInfo(user.weeklyPoints).level}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 text-gray-700">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {user.winningChances}%
                              </span>
                              <div className="flex-1 bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-violet-600 h-2 rounded-full"
                                  style={{ width: `${user.winningChances}%` }}
                                ></div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Leaderboard Pagination */}
                {(() => {
                  const leaderboardPagination = getLeaderboardPagination();
                  return leaderboardPagination.totalPages > 1 ? (
                    <div className="mt-6 flex justify-center">
                      <Pagination
                        currentPage={leaderboardPagination.page}
                        totalPages={leaderboardPagination.totalPages}
                        onPageChange={onLeaderboardPageChange}
                        showIcons
                      />
                    </div>
                  ) : null;
                })()}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ArchivedLeaderboard;
