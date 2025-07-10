"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import ReferralCodeInput from "./ReferralCodeInput";
import ReferralCountdown from "./ReferralCountdown";

interface ReferralStatus {
  hasReferrer: boolean;
  referrerAddress: string | null;
  joinedAt: string | null;
  referredBy: string | null;
  referredAt: string | null;
}

interface ReferralEligibility {
  hasReferrer: boolean;
  activitiesCount: number;
  isEligible: boolean;
}

export default function ReferralBanner() {
  const { isConnected, address } = useAccount();
  const [referralStatus, setReferralStatus] = useState<ReferralStatus | null>(
    null
  );
  const [referralEligibility, setReferralEligibility] =
    useState<ReferralEligibility | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchReferralStatus = async () => {
    if (!address) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/referral/check-referrer/${address}`
      );
      const data = await response.json();

      if (response.ok) {
        setReferralStatus(data);
      } else {
        console.error("Error fetching referral status:", data.error);
      }
    } catch (error) {
      console.error("Error fetching referral status:", error);
    }
  };

  const fetchReferralEligibility = async () => {
    if (!address) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/referral/check-eligibility/${address}`
      );
      const data = await response.json();

      if (response.ok) {
        setReferralEligibility(data);
      } else {
        console.error("Error fetching referral eligibility:", data.error);
      }
    } catch (error) {
      console.error("Error fetching referral eligibility:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (address) {
      fetchReferralStatus();
      fetchReferralEligibility();
    } else {
      // If no address (not connected), set loading to false immediately
      setIsLoading(false);
    }
  }, [address]);

  // Don't show banner if still loading
  if (isLoading) {
    return null;
  }

  // If not connected, show only the competition banner
  if (!isConnected) {
    return (
      <div className="bg-gradient-to-r from-violet-600 to-purple-600 text-white py-3 text-center font-medium relative overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-10"></div>
        <div className="relative z-10 flex items-center justify-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎉</span>
            <span>
              <span className="font-bold">Win 500 MON this week!</span>
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

  // Show referral code input if user is eligible (no referrer and less than 3 activities)
  if (referralEligibility && referralEligibility.isEligible) {
    return (
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 text-center font-medium relative overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-10"></div>
        <div className="relative z-10">
          <ReferralCodeInput
            onSuccess={fetchReferralStatus}
            onEligibilityChange={fetchReferralEligibility}
          />
        </div>
      </div>
    );
  }

  // Show 2x XP countdown if user has a referrer and is within 7 days
  if (referralStatus?.hasReferrer && referralStatus.joinedAt) {
    const joinDate = new Date(referralStatus.joinedAt);
    const bonusEndDate = new Date(joinDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    const now = new Date();
    const isWithinBonusPeriod = now < bonusEndDate;

    if (isWithinBonusPeriod) {
      return (
        <div className="bg-gradient-to-r from-yellow-600 to-orange-600 text-white py-3 text-center font-medium relative overflow-hidden">
          <div className="absolute inset-0 bg-black opacity-10"></div>
          <div className="relative z-10 flex items-center justify-center">
            <ReferralCountdown joinedAt={referralStatus.joinedAt} />
          </div>
        </div>
      );
    }
  }

  // Show competition banner as fallback
  return (
    <div className="bg-gradient-to-r from-violet-600 to-purple-600 text-white py-3 text-center font-medium relative overflow-hidden">
      <div className="absolute inset-0 bg-black opacity-10"></div>
      <div className="relative z-10 flex items-center justify-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🎉</span>
          <span>
            <span className="font-bold">Win 500 MON this week!</span>
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
        <div className="text-white font-bold">
          Invite your friends to get more points. Get your code{" "}
          <a href="/profile/me" className="text-white underline">
            here
          </a>
        </div>
      </div>
    </div>
  );
}
