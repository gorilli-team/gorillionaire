"use client";

import { useAccount } from "wagmi";

export default function ReferralBanner() {
  const { isConnected } = useAccount();

  //For debugging, let's show the banner always for now
  if (!isConnected) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-violet-600 to-purple-600 text-white py-3 text-center font-medium relative overflow-hidden">
      <div className="absolute inset-0 bg-black opacity-10"></div>
      <div className="relative z-10 flex items-center justify-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🎉</span>
          <span>
            <span className="font-bold">Weekly Raffle Competition!</span>
          </span>
        </div>
        <a
          href="/competition"
          rel="noopener noreferrer"
          className="bg-white text-violet-600 px-4 py-1.5 rounded-md font-bold text-sm hover:bg-gray-100 transition-colors duration-200 shadow-lg flex items-center gap-2"
        >
          <span>🏆</span>
          <span>Join the competition!</span>
        </a>
      </div>
    </div>
  );
}
