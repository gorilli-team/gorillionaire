"use client";

import { useState, useEffect } from "react";

interface ReferralCountdownProps {
  joinedAt: string;
}

export default function ReferralCountdown({
  joinedAt,
}: ReferralCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const joinDate = new Date(joinedAt);
      const bonusEndDate = new Date(
        joinDate.getTime() + 7 * 24 * 60 * 60 * 1000
      ); // 7 days
      const now = new Date();
      const difference = bonusEndDate.getTime() - now.getTime();

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((difference / 1000 / 60) % 60);
        const seconds = Math.floor((difference / 1000) % 60);

        setTimeLeft({ days, hours, minutes, seconds });
      } else {
        setTimeLeft(null);
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [joinedAt]);

  if (!timeLeft) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 text-md">
      <span className="text-yellow-300">⚡</span>
      <span className="font-medium">
        You were referred. Get 2x XP before time runs out!
      </span>
      <div className="flex items-center gap-1">
        {timeLeft.days > 0 && (
          <span className="bg-white/20 px-1.5 py-0.5 rounded text-xs font-mono">
            {timeLeft.days}d
          </span>
        )}
        <span className="bg-white/20 px-1.5 py-0.5 rounded text-xs font-mono">
          {timeLeft.hours.toString().padStart(2, "0")}h
        </span>
        <span className="bg-white/20 px-1.5 py-0.5 rounded text-xs font-mono">
          {timeLeft.minutes.toString().padStart(2, "0")}m
        </span>
        <span className="bg-white/20 px-1.5 py-0.5 rounded text-xs font-mono">
          {timeLeft.seconds.toString().padStart(2, "0")}s
        </span>
      </div>
    </div>
  );
}
