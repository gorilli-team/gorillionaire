"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Pagination } from "flowbite-react";

interface Investor {
  rank: number;
  username: string;
  avatar: string;
  signals: number;
  value: number;
  performance: number;
}

interface Activity {
  action: string;
  amount: string;
  token: string;
  date: string;
}

const Leaderboard = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [activitiesPage, setActivitiesPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredInvestors, setFilteredInvestors] = useState<Investor[]>([]);

  const onPageChange = (page: number) => setCurrentPage(page);
  const onActivitiesPageChange = (page: number) => setActivitiesPage(page);

  const investors = useMemo<Investor[]>(
    () => [
      {
        rank: 1,
        username: "unitswamp90.nad",
        avatar: "👤",
        signals: 85,
        value: 7532.78,
        performance: 11,
      },
      {
        rank: 2,
        username: "stephen.xp.nad",
        avatar: "👤",
        signals: 85,
        value: 4319.31,
        performance: 9,
      },
      {
        rank: 3,
        username: "0+3a5b...651e",
        avatar: "👤",
        signals: 82,
        value: 3392.18,
        performance: 8,
      },
      {
        rank: 4,
        username: "arthur457.nad",
        avatar: "👤",
        signals: 84,
        value: 3873.19,
        performance: 7,
      },
      {
        rank: 5,
        username: "rfthomas.nad",
        avatar: "👤",
        signals: 75,
        value: 3752.73,
        performance: 7,
      },
      {
        rank: 6,
        username: "imfrancis.nad",
        avatar: "👤",
        signals: 79,
        value: 3300.45,
        performance: 7,
      },
      {
        rank: 7,
        username: "0+1d3c...158a",
        avatar: "👤",
        signals: 69,
        value: 3291.78,
        performance: 7,
      },
      {
        rank: 8,
        username: "0+4b6c...862f",
        avatar: "👤",
        signals: 67,
        value: 2900.38,
        performance: 6,
      },
      {
        rank: 9,
        username: "fester76.nad",
        avatar: "👤",
        signals: 59,
        value: 2401.1,
        performance: 3,
      },
      {
        rank: 10,
        username: "karen93.nad",
        avatar: "👤",
        signals: 60,
        value: 2263.91,
        performance: 3,
      },
      {
        rank: 11,
        username: "karen93.nad",
        avatar: "👤",
        signals: 60,
        value: 2263.91,
        performance: 3,
      },
      {
        rank: 12,
        username: "unitswamp90.nad",
        avatar: "👤",
        signals: 85,
        value: 7532.78,
        performance: 11,
      },
      {
        rank: 13,
        username: "stephen.xp.nad",
        avatar: "👤",
        signals: 85,
        value: 4319.31,
        performance: 9,
      },
      {
        rank: 14,
        username: "0+3a5b...651e",
        avatar: "👤",
        signals: 82,
        value: 3392.18,
        performance: 8,
      },
      {
        rank: 15,
        username: "arthur457.nad",
        avatar: "👤",
        signals: 84,
        value: 3873.19,
        performance: 7,
      },
      {
        rank: 16,
        username: "rfthomas.nad",
        avatar: "👤",
        signals: 75,
        value: 3752.73,
        performance: 7,
      },
      {
        rank: 17,
        username: "imfrancis.nad",
        avatar: "👤",
        signals: 79,
        value: 3300.45,
        performance: 7,
      },
      {
        rank: 18,
        username: "0+1d3c...158a",
        avatar: "👤",
        signals: 69,
        value: 3291.78,
        performance: 7,
      },
      {
        rank: 19,
        username: "0+4b6c...862f",
        avatar: "👤",
        signals: 67,
        value: 2900.38,
        performance: 6,
      },
      {
        rank: 20,
        username: "fester76.nad",
        avatar: "👤",
        signals: 59,
        value: 2401.1,
        performance: 3,
      },
      {
        rank: 21,
        username: "karen93.nad",
        avatar: "👤",
        signals: 60,
        value: 2263.91,
        performance: 3,
      },
      {
        rank: 22,
        username: "karen93.nad",
        avatar: "👤",
        signals: 60,
        value: 2263.91,
        performance: 3,
      },
    ],
    []
  );

  useEffect(() => {
    setFilteredInvestors(investors);
  }, [investors]);

  // Filter investors based on search term
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredInvestors(investors);
    } else {
      const filtered = investors.filter((investor) =>
        investor.username.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredInvestors(filtered);
    }
    setCurrentPage(1); // Reset to first page when search changes
  }, [searchTerm, investors]);

  const activities = useMemo<Activity[]>(
    () => [
      { action: "Bought", amount: "20k", token: "DAK", date: "13/04/2024" },
      { action: "Bought", amount: "7k", token: "CHOG", date: "11/04/2024" },
      { action: "Sold", amount: "10k", token: "YAKI", date: "10/04/2024" },
      { action: "Sold", amount: "2k", token: "DAK", date: "09/04/2024" },
      { action: "Bought", amount: "12k", token: "YAKI", date: "01/04/2024" },
      { action: "Sold", amount: "5k", token: "DAK", date: "22/03/2024" },
      { action: "Bought", amount: "20k", token: "CHOG", date: "21/03/2024" },
      { action: "Bought", amount: "9k", token: "YAKI", date: "21/03/2024" },
      { action: "Sold", amount: "5k", token: "DAK", date: "17/03/2024" },
      { action: "Bought", amount: "20k", token: "DAK", date: "13/03/2024" },
      { action: "Sold", amount: "15k", token: "YAKI", date: "10/03/2024" },
      { action: "Bought", amount: "20k", token: "CHOG", date: "21/03/2024" },
      { action: "Bought", amount: "9k", token: "YAKI", date: "21/03/2024" },
      { action: "Sold", amount: "5k", token: "DAK", date: "17/03/2024" },
      { action: "Bought", amount: "20k", token: "DAK", date: "13/03/2024" },
      { action: "Sold", amount: "15k", token: "YAKI", date: "10/03/2024" },
    ],
    []
  );

  // Pagination logic for investors
  const itemsPerPage = 10;
  const totalInvestorPages = Math.ceil(filteredInvestors.length / itemsPerPage);

  // Get current investors for table based on page
  const indexOfLastInvestor = currentPage * itemsPerPage;
  const indexOfFirstInvestor = indexOfLastInvestor - itemsPerPage;
  const currentInvestors = filteredInvestors.slice(
    indexOfFirstInvestor,
    indexOfLastInvestor
  );

  // Pagination logic for activities
  const totalActivityPages = Math.ceil(activities.length / itemsPerPage);

  // Get current activities for table based on page
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

  return (
    <div className="bg-gray-100">
      <div className="max-w-8xl mx-auto p-8 pt-4">
        <div className="bg-white rounded-lg shadow-sm p-6 mt-4">
          {/* Search */}
          <div className="mb-6">
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

          {/* Table with fixed height container */}
          <div className="overflow-x-auto">
            <div className="h-[680px] overflow-hidden">
              <table className="w-full border-collapse">
                <thead className="sticky top-0 bg-white z-10">
                  <tr className="text-left text-sm text-gray-500 border-b">
                    <th className="pb-2 font-medium">RANK</th>
                    <th className="pb-2 font-medium">INVESTOR</th>
                    <th className="pb-2 font-medium text-center">
                      ACCEPTED SIGNALS
                    </th>
                    <th className="pb-2 font-medium">TOTAL VALUE</th>
                    <th className="pb-2 font-medium">OVERALL PERFORMANCE</th>
                  </tr>
                </thead>
                <tbody>
                  {currentInvestors.map((investor) => (
                    <tr
                      key={investor.rank}
                      className="border-b border-gray-100"
                    >
                      <td className="py-4 h-16 text-gray-700">
                        {investor.rank}
                      </td>
                      <td className="py-4 h-16">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center mr-2">
                            {investor.avatar}
                          </div>
                          <span className="text-gray-700 font-bold">
                            {investor.username}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 h-16 text-center text-gray-700">
                        {investor.signals}
                      </td>
                      <td className="py-4 h-16 text-gray-700">
                        ${" "}
                        {investor.value.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="py-4 h-16">
                        <span
                          className={`text-green-${
                            investor.performance >= 10 ? "500" : "400"
                          }`}
                        >
                          + {investor.performance}%
                        </span>
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
            </div>
          </div>

          <div className="mt-4 flex flex-col sm:flex-row items-center justify-between">
            <span className="text-sm text-gray-500 mb-4 sm:mb-0 font-bold">
              <span className="font-normal">Showing</span>{" "}
              {filteredInvestors.length > 0 ? indexOfFirstInvestor + 1 : 0}-
              {Math.min(indexOfLastInvestor, filteredInvestors.length)}{" "}
              <span className="font-normal">of</span> {filteredInvestors.length}
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
        <div className="bg-white rounded-lg shadow-sm p-6 mt-6">
          <h2 className="text-xl font-medium mb-4">My activities</h2>

          {/* Activities table with fixed height */}
          <div className="overflow-x-auto">
            <div className="h-[680px] overflow-hidden">
              <table className="w-full border-collapse">
                <thead className="sticky top-0 bg-white z-10">
                  <tr className="text-left text-sm text-gray-500 border-b">
                    <th className="pb-2 font-medium">ACTIVITY</th>
                    <th className="pb-2 font-medium text-right">DATE</th>
                  </tr>
                </thead>
                <tbody>
                  {currentActivities.map((activity, index) => (
                    <tr key={index} className="border-b border-gray-100">
                      <td className="py-4 h-16">
                        <div className="flex items-center">
                          <span className="text-yellow-500 mr-2">
                            {activity.action === "Bought" ? "💰" : "💸"}
                          </span>
                          <span>
                            {activity.action} {activity.amount} {activity.token}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 h-16 text-right text-gray-500">
                        {activity.date}
                      </td>
                    </tr>
                  ))}
                  {/* Empty rows to maintain fixed height when fewer items */}
                  {emptyActivityRows.map((_, index) => (
                    <tr
                      key={`empty-activity-${index}`}
                      className="border-b border-gray-100"
                    >
                      <td className="h-16"></td>
                      <td className="h-16"></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Activities Pagination centered */}
          <div className="mt-2 flex flex-col sm:flex-row items-center justify-between">
            <span className="text-sm text-gray-500 mb-4 sm:mb-0 font-bold">
              <span className="font-normal">Showing</span>{" "}
              {indexOfFirstActivity + 1}-
              {Math.min(indexOfLastActivity, activities.length)}{" "}
              <span className="font-normal">of</span> {activities.length}
            </span>
            <div className="flex-grow flex justify-center">
              <Pagination
                currentPage={activitiesPage}
                totalPages={totalActivityPages}
                onPageChange={onActivitiesPageChange}
                showIcons={true}
              />
            </div>
            <div className="hidden sm:block sm:w-32"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
