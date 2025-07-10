"use client";

import { useState } from "react";
import { useAccount } from "wagmi";

interface ReferralCodeInputProps {
  onSuccess: () => void;
  onEligibilityChange: () => void;
}

export default function ReferralCodeInput({
  onSuccess,
  onEligibilityChange,
}: ReferralCodeInputProps) {
  const { address } = useAccount();
  const [referralCode, setReferralCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitReferralCode = async () => {
    if (!address || !referralCode.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/referral/process`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            referralCode: referralCode.trim().toUpperCase(),
            newUserAddress: address,
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        setReferralCode("");
        onSuccess();
        onEligibilityChange();
      } else {
        setError(data.error || "Failed to apply referral code");
      }
    } catch (error) {
      console.error("Error submitting referral code:", error);
      setError("An error occurred while applying the referral code");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex items-center gap-3 flex-wrap justify-center">
      <div className="flex items-center gap-2">
        <span className="text-2xl">🎁</span>
        <span className="font-medium">
          Enter a referral code to get 2x XP for 7 days!
        </span>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={referralCode}
          onChange={(e) => setReferralCode(e.target.value)}
          placeholder="Enter code"
          className="bg-white/90 text-gray-900 px-3 py-1.5 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-white/50 max-w-32"
          maxLength={8}
        />
        <button
          onClick={submitReferralCode}
          disabled={!referralCode.trim() || isSubmitting}
          className="bg-white text-violet-600 px-4 py-1.5 rounded-md font-bold text-sm hover:bg-gray-100 transition-colors duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isSubmitting ? (
            <>
              <div className="w-4 h-4 border-2 border-violet-600 border-t-transparent rounded-full animate-spin"></div>
              <span>Applying...</span>
            </>
          ) : (
            <>
              <span>⚡</span>
              <span>Apply</span>
            </>
          )}
        </button>
      </div>
      {error && (
        <div className="text-red-200 text-xs mt-1 w-full text-center">
          {error}
        </div>
      )}
    </div>
  );
}
