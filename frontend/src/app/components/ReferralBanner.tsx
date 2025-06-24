"use client";

import { useAccount } from "wagmi";

export default function ReferralBanner() {
  const { isConnected } = useAccount();

  //For debugging, let's show the banner always for now
  if (!isConnected) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 text-center font-medium relative overflow-hidden">
      <div className="absolute inset-0 bg-black opacity-10"></div>
      <div className="relative z-10 flex items-center justify-center gap-3">
        <span>
          <span className="font-bold">Referrals are live!</span>
        </span>
        <a
          href="/profile/me"
          rel="noopener noreferrer"
          className="bg-white text-indigo-600 px-4 py-1.5 rounded-md font-bold text-sm hover:bg-gray-100 transition-colors duration-200 shadow-lg"
        >
          Get extra XPs now!
        </a>
      </div>
    </div>
  );
}
