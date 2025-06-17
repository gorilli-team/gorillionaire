"use client";

import { useState, useEffect } from "react";

interface CountdownTimerProps {
  targetDate: string;
}

export const CountdownTimer = ({ targetDate }: CountdownTimerProps) => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = new Date(targetDate).getTime() - new Date().getTime();

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  return (
    <span className="inline-flex items-center gap-1">
      <span className="bg-purple-800 text-white px-2 py-0.5 rounded">
        {timeLeft.days}d {timeLeft.hours}h {timeLeft.minutes}m{" "}
        {timeLeft.seconds}s
      </span>
    </span>
  );
};
