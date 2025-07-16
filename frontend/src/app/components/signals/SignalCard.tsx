"use client";

import React, { useMemo, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { getTokenImage } from "@/app/utils/tokens";
import { getTimeAgo } from "@/app/utils/time";

interface SignalCardProps {
  signal: {
    _id: string;
    signal_text: string;
    events: string[];
    confidenceScore: string;
    created_at: string;
    userSignal?: {
      choice: "Yes" | "No";
    };
  };
  selectedOptions: Record<string, string>;
  onOptionSelect: (signalId: string, option: "Yes" | "No") => void;
  isOnTargetChain: boolean;
  isChainSwitching: boolean;
  onSwitchChain: () => void;
  chainId?: number;
  MONAD_CHAIN_ID: number;
}

const mapConfidenceScoreToRisk = (confidenceScore: string) => {
  if (Number(confidenceScore) >= 9) {
    return "Conservative";
  } else if (Number(confidenceScore) >= 8.5) {
    return "Moderate";
  } else {
    return "Aggressive";
  }
};

const fetchImageFromSignalText = (signalText: string) => {
  const symbol = signalText.match(/CHOG|DAK|YAKI|MON/)?.[0];
  return getTokenImage(symbol || "");
};

const SignalCard = React.memo<SignalCardProps>(
  ({
    signal,
    selectedOptions,
    onOptionSelect,
    isOnTargetChain,
    isChainSwitching,
    onSwitchChain,
    chainId,
    MONAD_CHAIN_ID,
  }) => {
    const signalImage = useMemo(
      () => fetchImageFromSignalText(signal.signal_text),
      [signal.signal_text]
    );

    const confidenceRisk = useMemo(
      () => mapConfidenceScoreToRisk(signal.confidenceScore),
      [signal.confidenceScore]
    );

    const timeAgo = useMemo(
      () => getTimeAgo(signal.created_at),
      [signal.created_at]
    );

    const handleOptionSelect = useCallback(
      (option: "Yes" | "No") => {
        onOptionSelect(signal._id, option);
      },
      [signal._id, onOptionSelect]
    );

    const handleSwitchChain = useCallback(() => {
      onSwitchChain();
    }, [onSwitchChain]);

    return (
      <div className="border-b pb-4 last:border-b-0 last:pb-0">
        <Link href={`/signals/${signal._id}`}>
          <div className="flex justify-between items-center mb-3 cursor-pointer hover:bg-gray-50 p-3 rounded-lg transition-all duration-200 border border-gray-100 hover:border-violet-200 hover:shadow-sm group">
            <div className="flex items-center">
              <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 relative mr-2">
                <Image
                  src={
                    signalImage && signalImage.length > 0
                      ? signalImage
                      : "/fav.png"
                  }
                  alt={signal.signal_text || "signal image"}
                  width={24}
                  height={24}
                  className="object-cover rounded-full"
                  loading="lazy"
                  placeholder="blur"
                  blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
                />
              </div>
              <span className="font-medium text-gray-900 group-hover:text-violet-700 transition-colors">
                {signal.signal_text}
              </span>
              <svg
                className="w-4 h-4 ml-2 text-gray-400 group-hover:text-violet-500 transition-colors"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
            <div className="flex items-center gap-2">
              {signal.userSignal?.choice && (
                <span
                  className={`text-xs px-2 py-1 rounded ${
                    signal.userSignal.choice === "Yes"
                      ? "bg-green-200 text-green-700"
                      : "bg-red-200 text-red-700"
                  }`}
                >
                  {signal.userSignal.choice === "Yes" ? "Accepted" : "Rejected"}
                </span>
              )}
              <span
                className={`text-xs px-2 py-1 rounded ${
                  confidenceRisk === "Moderate"
                    ? "bg-yellow-100 text-yellow-800"
                    : confidenceRisk === "Conservative"
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {confidenceRisk}
              </span>
            </div>
          </div>
        </Link>

        {!signal.userSignal && chainId === MONAD_CHAIN_ID && (
          <div className="flex items-center mb-3">
            <div className="inline-flex rounded-full border border-gray-300 overflow-hidden">
              <button
                className={`px-3 py-1 text-sm flex items-center justify-center w-16 ${
                  selectedOptions[signal._id] === "No"
                    ? "bg-gray-200 text-gray-700"
                    : "bg-white text-gray-500"
                }`}
                onClick={() => handleOptionSelect("No")}
              >
                <span>Refuse</span>
                {selectedOptions[signal._id] === "No" && (
                  <span className="ml-1">•</span>
                )}
              </button>
              <button
                className={`px-3 py-1 text-sm flex items-center justify-center w-16 ${
                  selectedOptions[signal._id] === "Yes" ||
                  !selectedOptions[signal._id]
                    ? "bg-violet-700 text-white"
                    : "bg-white text-gray-500"
                }`}
                onClick={() => handleOptionSelect("Yes")}
              >
                <span>Trade</span>
                {selectedOptions[signal._id] === "Yes" && (
                  <span className="ml-1">•</span>
                )}
              </button>
            </div>
          </div>
        )}

        {!signal.userSignal && !isOnTargetChain && (
          <button
            className="px-3 py-1 mb-3 text-sm flex items-center justify-center bg-violet-700 text-white rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleSwitchChain}
            disabled={isChainSwitching}
          >
            {isChainSwitching ? "Switching..." : "Switch to Monad"}
          </button>
        )}

        {signal.events.length > 0 && signal.events[0].length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {signal.events.slice(0, 2).map((event, idx) => (
              <div
                key={idx}
                className="text-xs bg-gray-100 px-2 py-1 rounded-full whitespace-normal break-words"
              >
                {event}
              </div>
            ))}
          </div>
        )}

        <div className="text-xs text-gray-400 mt-2">{timeAgo}</div>
      </div>
    );
  }
);

SignalCard.displayName = "SignalCard";

export default SignalCard;
