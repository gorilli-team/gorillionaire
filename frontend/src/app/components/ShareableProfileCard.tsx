"use client";

import React, { useRef, useState } from "react";
import Image from "next/image";
import html2canvas from "html2canvas";
import { getLevelInfo } from "../utils/xp";

interface ShareableProfileCardProps {
  userProfile: {
    address: string;
    nadName?: string;
    nadAvatar?: string;
    points: number;
    rank: string;
    dollarValue: number;
  };
  referralStats?: {
    referralCode: string | null;
    totalReferred: number;
    totalPointsEarned: number;
  } | null;
  totalTransactions?: number;
}

const CARD_SIZE = 800; // 1:1 aspect ratio

const ShareableProfileCard: React.FC<ShareableProfileCardProps> = ({
  userProfile,
  referralStats,
  totalTransactions,
}) => {
  const exportRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const formatNumber = (num: number): string => {
    if (num === 0) return "0.00";
    if (num < 0.000001) return num.toExponential(6);
    if (num < 0.01) return num.toFixed(8);
    if (num < 1) return num.toFixed(6);
    if (num < 100) return num.toFixed(4);
    return num.toFixed(2);
  };

  const getOrdinalSuffix = (rank: string) => {
    const num = parseInt(rank);
    if (num === 1) return "st";
    if (num === 2) return "nd";
    if (num === 3) return "rd";
    return "th";
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Export logic uses the hidden exportRef
  const generateCardImage = async () => {
    if (!exportRef.current) return;
    setIsGenerating(true);
    try {
      const canvas = await html2canvas(exportRef.current, {
        backgroundColor: "#fff",
        scale: 2,
        useCORS: true,
        allowTaint: true,
        width: CARD_SIZE,
        height: CARD_SIZE,
      });
      return canvas.toDataURL("image/png");
    } finally {
      setIsGenerating(false);
    }
  };

  const shareOnX = async () => {
    setIsSharing(true);
    try {
      const imageDataUrl = await generateCardImage();
      if (!imageDataUrl) {
        throw new Error("Failed to generate card image");
      }
      let shareText =
        `🚀 Check out my Gorillionaire profile! 📊\n\n` +
        `🏆 Rank: ${userProfile.rank}${getOrdinalSuffix(userProfile.rank)}\n` +
        `💎 Points: ${userProfile.points.toLocaleString()}\n` +
        `💰 Volume: $${formatNumber(userProfile.dollarValue)}`;
      if (referralStats?.referralCode) {
        shareText += `\n🎯 Referral Code: ${referralStats.referralCode}`;
      }
      shareText +=
        `\n\nJoin me on Gorillionaire! 🦍\n` +
        `${window.location.origin}/users/${userProfile.address}`;
      // Download the image for manual sharing
      const link = document.createElement("a");
      link.href = imageDataUrl;
      link.download = "gorillionaire-profile-card.png";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      // Open X share dialog with text
      const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
        shareText
      )}`;
      window.open(shareUrl, "_blank");
    } catch (error) {
      console.error("Error sharing on X:", error);
      alert("Failed to share profile card. Please try again.");
    } finally {
      setIsSharing(false);
    }
  };

  const downloadCard = async () => {
    const imageDataUrl = await generateCardImage();
    if (imageDataUrl) {
      const link = document.createElement("a");
      link.href = imageDataUrl;
      link.download = "gorillionaire-profile-card.png";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // --- Export Card Layout (hidden) ---
  const ExportCard = (
    <div
      ref={exportRef}
      style={{
        width: `${CARD_SIZE}px`,
        height: `${CARD_SIZE}px`,
        background: "#f5f7ff",
        borderRadius: 32,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        padding: 0,
        boxSizing: "border-box",
        color: "#222",
        fontFamily: "Inter, sans-serif",
        position: "absolute",
        left: "-9999px",
        top: 0,
        zIndex: -1,
        overflow: "hidden",
      }}
    >
      {/* Avatar */}
      <div
        style={{
          marginTop: 48,
          marginBottom: 32,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <div
          style={{
            width: 144,
            height: 144,
            borderRadius: "50%",
            border: "8px solid #fff",
            boxShadow: "0 4px 24px #0001",
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#e0e7ef",
          }}
        >
          {(() => {
            let avatarSrc = "";
            if (userProfile.nadAvatar) {
              if (/^https?:\/\//.test(userProfile.nadAvatar)) {
                avatarSrc = `/api/proxy-image?url=${encodeURIComponent(
                  userProfile.nadAvatar
                )}`;
              } else {
                avatarSrc = userProfile.nadAvatar;
              }
            } else {
              avatarSrc = `/avatar_${parseInt(userProfile.rank) % 6}.png`;
            }
            return (
              <img
                src={avatarSrc}
                alt="Profile"
                width={144}
                height={144}
                style={{
                  width: 144,
                  height: 144,
                  objectFit: "cover",
                  display: "block",
                }}
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            );
          })()}
        </div>
      </div>

      {/* Name & Address */}
      <div style={{ textAlign: "center", marginBottom: 24, width: "100%" }}>
        <div
          style={{
            fontSize: 44,
            fontWeight: 800,
            color: "#222",
            lineHeight: 1.1,
            wordBreak: "break-word",
            marginBottom: 8,
          }}
        >
          {userProfile.nadName || formatAddress(userProfile.address)}
        </div>
        <div
          style={{
            fontSize: 22,
            color: "#6b7280",
            fontFamily: "monospace",
          }}
        >
          {formatAddress(userProfile.address)}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
          marginBottom: 40,
          width: "100%",
        }}
      >
        {referralStats?.referralCode && (
          <div
            style={{
              background: "#8b5cf6",
              color: "#fff",
              borderRadius: 20,
              padding: "14px 32px",
              fontWeight: 700,
              fontSize: 28,
              letterSpacing: 1,
              boxShadow: "0 2px 12px #8b5cf655",
              maxWidth: "90%",
              textAlign: "center",
              overflowWrap: "break-word",
            }}
          >
            Referral Code: {referralStats.referralCode}
          </div>
        )}

        {/* User Level Badge */}
        <div
          style={{
            background: "#fff",
            color: "#8b5cf6",
            border: "2px solid #8b5cf6",
            borderRadius: 16,
            fontWeight: 700,
            fontSize: 22,
            padding: "8px 24px",
            textAlign: "center",
          }}
        >
          Level {getLevelInfo(userProfile.points).level}
        </div>
      </div>

      {/* Stats Row - Fixed alignment */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 56,
          width: "100%",
          marginBottom: 48,
        }}
      >
        {/* Rank */}
        <div style={{ textAlign: "center", minWidth: 120 }}>
          <div
            style={{
              fontSize: 40,
              fontWeight: 700,
              color: "#222",
              lineHeight: 1.2,
              marginBottom: 8,
            }}
          >
            {userProfile.rank}
            <span
              style={{ fontSize: 20, verticalAlign: "super", marginLeft: 2 }}
            >
              {getOrdinalSuffix(userProfile.rank)}
            </span>
          </div>
          <div
            style={{
              fontSize: 18,
              color: "#6b7280",
              fontWeight: 500,
            }}
          >
            Global Rank
          </div>
        </div>

        {/* Points */}
        <div style={{ textAlign: "center", minWidth: 120 }}>
          <div
            style={{
              fontSize: 40,
              fontWeight: 700,
              color: "#222",
              lineHeight: 1.2,
              marginBottom: 8,
            }}
          >
            {userProfile.points.toLocaleString()}
          </div>
          <div
            style={{
              fontSize: 18,
              color: "#6b7280",
              fontWeight: 500,
            }}
          >
            Points
          </div>
        </div>

        {/* Volume */}
        <div style={{ textAlign: "center", minWidth: 120 }}>
          <div
            style={{
              fontSize: 40,
              fontWeight: 700,
              color: "#222",
              lineHeight: 1.2,
              marginBottom: 8,
            }}
          >
            ${formatNumber(userProfile.dollarValue)}
          </div>
          <div
            style={{
              fontSize: 18,
              color: "#6b7280",
              fontWeight: 500,
            }}
          >
            Volume
          </div>
        </div>

        {/* Transactions */}
        {typeof totalTransactions === "number" && (
          <div style={{ textAlign: "center", minWidth: 120 }}>
            <div
              style={{
                fontSize: 40,
                fontWeight: 700,
                color: "#222",
                lineHeight: 1.2,
                marginBottom: 8,
              }}
            >
              {totalTransactions.toLocaleString()}
            </div>
            <div
              style={{
                fontSize: 18,
                color: "#6b7280",
                fontWeight: 500,
              }}
            >
              Transactions
            </div>
          </div>
        )}
      </div>

      {/* Footer Bar */}
      <div
        style={{
          width: "92%",
          background: "linear-gradient(90deg, #8b5cf6 0%, #6366f1 100%)",
          color: "#fff",
          borderRadius: 24,
          padding: "20px 32px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 20,
          fontWeight: 700,
          marginTop: "auto",
          marginBottom: 32,
        }}
      >
        <span>Join the Gorillionaire community!</span>
        <span>app.gorillionai.re</span>
      </div>
    </div>
  );

  // --- Responsive Preview (visible) ---
  return (
    <div className="">
      {/* Hidden export card for image generation */}
      {ExportCard}

      {/* Visible preview */}
      <div className="bg-white rounded-lg shadow-lg p-3">
        <div className="mb-2 flex justify-center">
          <div className="w-full max-w-xl bg-gradient-to-br from-violet-50 via-indigo-50 to-purple-50 rounded-xl shadow-lg flex flex-col justify-between py-6 px-4 min-h-[320px]">
            {/* Referral and Level badges side by side */}
            <div className="flex flex-row items-center justify-between w-full mb-3">
              {referralStats?.referralCode && (
                <div className="px-2 py-1 bg-violet-500 text-white rounded text-sm font-medium">
                  Referral Code: {referralStats.referralCode}
                </div>
              )}
              <div className="flex-1" />
              <div className="px-2 py-1 bg-white text-violet-600 border border-violet-600 rounded text-sm font-medium">
                Level {getLevelInfo(userProfile.points).level}
              </div>
            </div>
            {/* Avatar and name section */}
            <div className="flex flex-col items-center justify-center flex-1 mb-2">
              <Image
                src={
                  userProfile.nadAvatar ||
                  `/avatar_${parseInt(userProfile.rank) % 6}.png`
                }
                alt="Profile"
                width={80}
                height={80}
                className="rounded-full border-4 border-white shadow-lg mb-2"
              />
              <h2 className="text-xl font-bold text-gray-900 mt-1 mb-1">
                {userProfile.nadName || formatAddress(userProfile.address)}
              </h2>
              {userProfile.nadName && (
                <p className="text-gray-600 text-xs font-mono mb-1">
                  {formatAddress(userProfile.address)}
                </p>
              )}
            </div>
            {/* Stats row */}
            <div className="flex justify-center gap-6 pb-3 pt-2">
              <div className="text-center">
                <div className="text-lg font-bold text-gray-900 mb-0.5">
                  {userProfile.rank}
                  <span className="text-xs">
                    {getOrdinalSuffix(userProfile.rank)}
                  </span>
                </div>
                <div className="text-xs text-gray-600">Global Rank</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-gray-900 mb-0.5">
                  {userProfile.points.toLocaleString()}
                </div>
                <div className="text-xs text-gray-600">Points</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-gray-900 mb-0.5">
                  ${formatNumber(userProfile.dollarValue)}
                </div>
                <div className="text-xs text-gray-600">Volume</div>
              </div>
              {typeof totalTransactions === "number" && (
                <div className="text-center">
                  <div className="text-lg font-bold text-gray-900 mb-0.5">
                    {totalTransactions.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-600">Transactions</div>
                </div>
              )}
            </div>
            <div className="w-full bg-gradient-to-r from-violet-500 to-indigo-600 text-white py-2 px-4 flex justify-between rounded-b-xl text-xs font-semibold mt-1">
              <span>Join the Gorillionaire community!</span>
              <span>app.gorillionai.re</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={shareOnX}
            disabled={isSharing || isGenerating}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSharing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Sharing...
              </>
            ) : (
              <>
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                Share on X
              </>
            )}
          </button>
          <button
            onClick={downloadCard}
            disabled={isGenerating}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg font-medium hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Generating...
              </>
            ) : (
              <>
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                Download Card
              </>
            )}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2 text-center">
          Share your achievements with the Gorillionaire community! 🦍
        </p>
      </div>
    </div>
  );
};

export default ShareableProfileCard;
