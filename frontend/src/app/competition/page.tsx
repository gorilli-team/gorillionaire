"use client";

import React from "react";
import Link from "next/link";
import WeeklyRafflePromo from "@/app/components/WeeklyRafflePromo";
import Sidebar from "@/app/components/sidebar";
import Header from "@/app/components/header";

const CompetitionPage = () => {
  const [selectedPage, setSelectedPage] = React.useState("Competition");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  return (
    <div className="flex h-screen bg-gray-100 text-gray-800 overflow-hidden">
      {/* Mobile menu button */}
      <button
        aria-label="hamburger menu"
        className="rounded-full lg:hidden fixed top-4 left-4 z-50 p-2 bg-gray-200"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
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

      {/* Overlay for mobile */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="lg:ml-0 flex-1 flex flex-col w-full overflow-hidden">
        <Header />
        <div className="flex-1 overflow-auto pb-20">
          <div className="max-w-6xl mx-auto px-4 py-8">
            {/* Page Header */}
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                Weekly Competition
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Compete weekly for a chance to win MON tokens! Earn points
                through trading, referrals, and activities to increase your
                winning chances.
              </p>
            </div>

            {/* Main Competition Promo */}
            <WeeklyRafflePromo />

            {/* Detailed Rules Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
                📋 Competition Rules & Details
              </h2>

              <div className="grid md:grid-cols-2 gap-8">
                {/* Prize Distribution */}
                <div>
                  <h3 className="text-xl font-semibold text-violet-800 mb-4 flex items-center gap-2">
                    <span>💰</span>
                    Prize Distribution
                  </h3>
                  <div className="space-y-3">
                    <div className="bg-violet-50 rounded-lg p-4 border border-violet-200">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-violet-800">
                          Total Prize Pool
                        </span>
                        <span className="font-bold text-violet-600">
                          250 MON
                        </span>
                      </div>
                    </div>
                    <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-amber-800">
                          Number of Winners
                        </span>
                        <span className="font-bold text-amber-600">
                          5 Winners
                        </span>
                      </div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-green-800">
                          Prize per Winner
                        </span>
                        <span className="font-bold text-green-600">
                          50 MON each
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Selection Process */}
                <div>
                  <h3 className="text-xl font-semibold text-violet-800 mb-4 flex items-center gap-2">
                    <span>🎲</span>
                    Selection Process
                  </h3>
                  <div className="space-y-3">
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                      <div className="flex items-start gap-3">
                        <span className="text-blue-600 font-bold mt-0.5">
                          1
                        </span>
                        <div>
                          <p className="font-medium text-blue-800">
                            Percentage-Based Chances
                          </p>
                          <p className="text-sm text-blue-600 mt-1">
                            Your winning chance = (Your Points / Total Points) ×
                            100%
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                      <div className="flex items-start gap-3">
                        <span className="text-purple-600 font-bold mt-0.5">
                          2
                        </span>
                        <div>
                          <p className="font-medium text-purple-800">
                            Random Selection
                          </p>
                          <p className="text-sm text-purple-600 mt-1">
                            5 winners are randomly selected based on point
                            percentages
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
                      <div className="flex items-start gap-3">
                        <span className="text-indigo-600 font-bold mt-0.5">
                          3
                        </span>
                        <div>
                          <p className="font-medium text-indigo-800">
                            Weekly Reset
                          </p>
                          <p className="text-sm text-indigo-600 mt-1">
                            Competition resets every Monday at 00:00 UTC
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Important Notes */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200 p-6 mb-8">
              <h3 className="text-xl font-bold text-amber-800 mb-4 flex items-center gap-2">
                <span>⚠️</span>
                Important Notes
              </h3>
              <div className="space-y-3 text-amber-700">
                <div className="flex items-start gap-3">
                  <span className="text-amber-600 font-bold mt-0.5">•</span>
                  <p>
                    Points are reset every Monday at 00:00 UTC for the new
                    competition week
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-amber-600 font-bold mt-0.5">•</span>
                  <p>
                    You must have at least 1 point to be eligible for the raffle
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-amber-600 font-bold mt-0.5">•</span>
                  <p>Winners are announced after the weekly reset</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-amber-600 font-bold mt-0.5">•</span>
                  <p>MON tokens are distributed directly to winners wallets</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-amber-600 font-bold mt-0.5">•</span>
                  <p>All decisions regarding the competition are final</p>
                </div>
              </div>
            </div>

            {/* Call to Action */}
            <div className="text-center">
              <div className="bg-gradient-to-r from-violet-600 to-purple-600 rounded-xl p-8 text-white">
                <h2 className="text-3xl font-bold mb-4">Ready to Compete?</h2>
                <p className="text-xl mb-6 text-violet-100">
                  Check your current ranking and start earning points today!
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    href="/leaderboard"
                    className="bg-white text-violet-600 px-8 py-3 rounded-lg font-bold text-lg hover:bg-gray-100 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                  >
                    <span>🏆</span>
                    <span>View Weekly Leaderboard</span>
                    <span>→</span>
                  </Link>
                  <Link
                    href="/"
                    className="bg-violet-700 text-white px-8 py-3 rounded-lg font-bold text-lg hover:bg-violet-800 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                  >
                    <span>💎</span>
                    <span>Start Trading</span>
                    <span>→</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompetitionPage;
