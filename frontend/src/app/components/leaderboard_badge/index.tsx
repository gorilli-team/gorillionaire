"use client";
import React, { useState, useEffect } from "react";
import Image from "next/image";
import { usePrivy } from "@privy-io/react-auth";
import { nnsClient } from "@/app/providers";
import { HexString } from "@/app/types";

const LeaderboardBadge: React.FC = () => {
  const { authenticated, user } = usePrivy();
  const address = user?.wallet?.address;

  const [positionUser, setPositionUser] = useState<{
    points: number;
    address: string;
    avatarSrc: string;
    rank: string;
    streak: number;
    todayTransactionCount?: number;
    dailyTransactionTarget?: number;
  } | null>(null);

  const [nadName, setNadName] = useState<string | null>(null);
  const [nadAvatar, setNadAvatar] = useState<string | null>(null);

  useEffect(() => {
    if (!authenticated || !address) return;

    const fetchPositionUser = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/activity/track/me?address=${address}`
        );
        const data = await response.json();

        // Fetch NNS profile
        let nnsProfile = null;
        try {
          nnsProfile = await nnsClient.getProfile(address as HexString);
        } catch (e: unknown) {
          console.log("❌ Error fetching NNS profile:", e);
          nnsProfile = null;
        }
        setNadName(nnsProfile?.primaryName || null);
        setNadAvatar(nnsProfile?.avatar || null);

        setPositionUser({
          points: data.userActivity?.points || 0,
          address: data.userActivity?.address || address,
          avatarSrc: "/avatar_1.png",
          rank: data.userActivity?.rank,
          streak: data.userActivity?.streak || 0,
          todayTransactionCount: data.userActivity?.todayTransactionCount || 0,
          dailyTransactionTarget:
            data.userActivity?.dailyTransactionTarget || 3,
        });
      } catch (error) {
        console.error("❌ Error fetching user activity:", error);
      }
    };

    fetchPositionUser();
  }, [authenticated, address]);

  if (!authenticated || !positionUser) return null;

  return (
    <div className="flex flex-wrap items-center bg-white border border-gray-300 rounded-2xl px-4 py-2 shadow-sm gap-2 md:gap-4 max-w-full">
      {/* Avatar + Address */}
      <div className="flex items-center gap-2 min-w-0 flex-shrink">
        <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0">
          <Image
            src={nadAvatar ? nadAvatar : positionUser.avatarSrc}
            alt="avatar"
            width={28}
            height={28}
            className="object-cover"
          />
        </div>
        <span className="text-sm font-semibold text-gray-900 truncate max-w-[120px] md:max-w-[200px]">
          {nadName ? nadName : positionUser.address}
        </span>
      </div>

      {/* Rank */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <Image src="/first-place.svg" alt="rank" width={16} height={16} />
        <span className="text-sm font-medium text-gray-800">
          {positionUser.rank}
          {positionUser.rank === "1"
            ? "st"
            : positionUser.rank === "2"
            ? "nd"
            : positionUser.rank === "3"
            ? "rd"
            : "th"}
        </span>
      </div>

      {/* Points */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <Image src="/star.svg" alt="points" width={16} height={16} />
        <span className="text-sm font-medium text-gray-800">
          {positionUser.points} pts
        </span>
      </div>

      {/* Streak */}
      {positionUser.streak > 0 && (
        <div className="flex items-center gap-1 flex-shrink-0">
          <span className="text-orange-500 text-sm">🔥</span>
          <span className="text-sm font-medium text-orange-700">
            {positionUser.streak} day{positionUser.streak !== 1 ? "s" : ""}{" "}
            streak!
          </span>
        </div>
      )}

      {/* Daily Transaction Target */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <span className="text-blue-500 text-sm">📊</span>
        <span className="text-sm font-medium text-blue-700">
          {positionUser.todayTransactionCount}/
          {positionUser.dailyTransactionTarget} txs
        </span>
      </div>
    </div>
  );
};

export default LeaderboardBadge;
