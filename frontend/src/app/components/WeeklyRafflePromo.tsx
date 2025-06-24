"use client";

import React from "react";
import Link from "next/link";

export default function WeeklyRafflePromo() {
  return (
    <div className="bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-50 border border-violet-200 rounded-xl p-6 mb-6">
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-3 mb-3">
          <span className="text-4xl">🏆</span>
          <h2 className="text-2xl font-bold text-violet-800">
            Weekly Raffle Competition
          </h2>
          <span className="text-4xl">🎉</span>
        </div>
        <p className="text-violet-700 text-lg font-medium">
          Compete weekly for a chance to win{" "}
          <span className="font-bold text-violet-800">50 MON tokens</span>
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-6">
        {/* Prize Pool */}
        <div className="bg-white rounded-lg p-4 border border-violet-200 text-center">
          <div className="text-3xl mb-2">💰</div>
          <h3 className="font-bold text-violet-800 mb-2">Prize Pool</h3>
          <p className="text-sm text-gray-600">
            <span className="font-bold text-violet-600">50 MON</span>{" "}
            distributed to{" "}
            <span className="font-bold text-violet-600">5 winners</span>
          </p>
        </div>

        {/* How to Win */}
        <div className="bg-white rounded-lg p-4 border border-violet-200 text-center">
          <div className="text-3xl mb-2">🎯</div>
          <h3 className="font-bold text-violet-800 mb-2">How to Win</h3>
          <p className="text-sm text-gray-600">
            Higher weekly points ={" "}
            <span className="font-bold text-violet-600">Better chances</span> to
            win
          </p>
        </div>

        {/* Weekly Reset */}
        <div className="bg-white rounded-lg p-4 border border-violet-200 text-center">
          <div className="text-3xl mb-2">🔄</div>
          <h3 className="font-bold text-violet-800 mb-2">Weekly Reset</h3>
          <p className="text-sm text-gray-600">
            Competition resets every{" "}
            <span className="font-bold text-violet-600">Monday</span>
          </p>
        </div>
      </div>

      {/* How It Works */}
      <div className="bg-white rounded-lg p-4 border border-violet-200 mb-6">
        <h3 className="font-bold text-violet-800 mb-3 text-center">
          How It Works
        </h3>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <span className="bg-violet-100 text-violet-700 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">
                1
              </span>
              <span>Complete activities to earn weekly points</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="bg-violet-100 text-violet-700 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">
                2
              </span>
              <span>Refer friends for bonus points and referral rewards</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <span className="bg-violet-100 text-violet-700 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">
                3
              </span>
              <span>Higher points = higher percentage chance to win</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="bg-violet-100 text-violet-700 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">
                4
              </span>
              <span>
                5 winners selected randomly based on point percentages
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Activities that earn points */}
      <div className="bg-white rounded-lg p-4 border border-violet-200 mb-6">
        <h3 className="font-bold text-violet-800 mb-3 text-center">
          Earn Points Through
        </h3>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              <span>Trading tokens</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              <span>Referring new users</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              <span>Daily check-ins</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              <span>Completing quests</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              <span>Earning referral bonuses</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              <span>Participating in events</span>
            </div>
          </div>
        </div>
      </div>

      {/* Call to Action */}
      <div className="text-center">
        <Link
          href="/leaderboard"
          className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white px-8 py-3 rounded-lg font-bold text-lg hover:from-violet-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
        >
          <span>🏆</span>
          <span>View Weekly Leaderboard</span>
          <span>→</span>
        </Link>
        <p className="text-sm text-violet-600 mt-2">
          Check your current ranking and winning chances
        </p>
      </div>
    </div>
  );
}
