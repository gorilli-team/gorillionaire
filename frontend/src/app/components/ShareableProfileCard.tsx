"use client";

import React, { useRef, useState } from "react";
import Image from "next/image";
import html2canvas from "html2canvas";

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
}

const CARD_WIDTH = 1200;
const CARD_HEIGHT = 630;

const ShareableProfileCard: React.FC<ShareableProfileCardProps> = ({
  userProfile,
  referralStats,
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
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
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
        width: `${CARD_WIDTH}px`,
        height: `${CARD_HEIGHT}px`,
        background: "linear-gradient(135deg, #a78bfa 0%, #6366f1 100%)",
        borderRadius: 32,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 48,
        boxSizing: "border-box",
        color: "#222",
        fontFamily: "Inter, sans-serif",
        position: "absolute",
        left: "-9999px",
        top: 0,
        zIndex: -1,
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            background: "linear-gradient(135deg, #6366f1 0%, #a78bfa 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span style={{ color: "#fff", fontWeight: 700, fontSize: 32 }}>
            G
          </span>
        </div>
        <span
          style={{
            fontWeight: 700,
            fontSize: 40,
            marginLeft: 24,
            color: "#222",
          }}
        >
          Gorillionaire
        </span>
      </div>
      {/* Avatar, Name, Address, Referral */}
      <div style={{ textAlign: "center", marginTop: 24 }}>
        <div style={{ position: "relative", display: "inline-block" }}>
          <Image
            src={
              userProfile.nadAvatar ||
              `/avatar_${parseInt(userProfile.rank) % 6}.png`
            }
            alt="Profile"
            width={160}
            height={160}
            style={{
              borderRadius: "50%",
              border: "6px solid #fff",
              boxShadow: "0 4px 24px #0002",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: 0,
              right: 0,
              width: 48,
              height: 48,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #6366f1 0%, #a78bfa 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "3px solid #fff",
            }}
          >
            <svg width="28" height="28" fill="white" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </div>
        <h2
          style={{
            fontSize: 48,
            fontWeight: 700,
            margin: "24px 0 8px 0",
            color: "#222",
          }}
        >
          {userProfile.nadName || formatAddress(userProfile.address)}
        </h2>
        {userProfile.nadName && (
          <p style={{ fontSize: 24, color: "#666", margin: 0 }}>
            {formatAddress(userProfile.address)}
          </p>
        )}
        {referralStats?.referralCode && (
          <div
            style={{
              marginTop: 24,
              background: "rgba(99,102,241,0.95)",
              color: "#fff",
              borderRadius: 16,
              padding: "12px 36px",
              fontWeight: 700,
              fontSize: 32,
              display: "inline-block",
              letterSpacing: 1,
              boxShadow: "0 2px 12px #6366f155",
            }}
          >
            Referral Code: {referralStats.referralCode}
          </div>
        )}
      </div>
      {/* Stats */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 96,
          marginTop: 32,
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 48, fontWeight: 700, color: "#222" }}>
            {userProfile.rank}
            <span style={{ fontSize: 28 }}>
              {getOrdinalSuffix(userProfile.rank)}
            </span>
          </div>
          <div style={{ fontSize: 24, color: "#666", fontWeight: 500 }}>
            Global Rank
          </div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 48, fontWeight: 700, color: "#222" }}>
            {userProfile.points.toLocaleString()}
          </div>
          <div style={{ fontSize: 24, color: "#666", fontWeight: 500 }}>
            Points
          </div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 48, fontWeight: 700, color: "#222" }}>
            ${formatNumber(userProfile.dollarValue)}
          </div>
          <div style={{ fontSize: 24, color: "#666", fontWeight: 500 }}>
            Volume
          </div>
        </div>
      </div>
      {/* Bottom Bar */}
      <div
        style={{
          width: "100%",
          background: "linear-gradient(90deg, #a78bfa 0%, #6366f1 100%)",
          color: "#fff",
          borderRadius: "0 0 32px 32px",
          padding: "32px 48px",
          display: "flex",
          justifyContent: "space-between",
          fontSize: 32,
          fontWeight: 700,
          marginTop: 48,
        }}
      >
        <span>Join the Gorillionaire community!</span>
        <span>gorillionaire.com</span>
      </div>
    </div>
  );

  // --- Responsive Preview (visible) ---
  return (
    <div className="space-y-4">
      {/* Hidden export card for image generation */}
      {ExportCard}
      {/* Visible preview (optional: keep simple, or match export) */}
      <div className="bg-white rounded-lg shadow-lg p-4">
        <h3 className="text-lg font-semibold mb-4">Share Your Profile</h3>
        <div className="mb-4 flex justify-center">
          <div className="w-full max-w-xl aspect-[1.91/1] bg-gradient-to-br from-violet-50 via-indigo-50 to-purple-50 rounded-xl shadow-lg overflow-hidden flex flex-col justify-between">
            {/* You can add a simple preview here, or match the export card for consistency */}
            <div className="flex flex-col items-center justify-center flex-1 py-8">
              <Image
                src={
                  userProfile.nadAvatar ||
                  `/avatar_${parseInt(userProfile.rank) % 6}.png`
                }
                alt="Profile"
                width={96}
                height={96}
                className="rounded-full border-4 border-white shadow-lg"
              />
              <h2 className="text-2xl font-bold text-gray-900 mt-4">
                {userProfile.nadName || formatAddress(userProfile.address)}
              </h2>
              {userProfile.nadName && (
                <p className="text-gray-600 text-sm font-mono">
                  {formatAddress(userProfile.address)}
                </p>
              )}
              {referralStats?.referralCode && (
                <div className="mt-2 px-4 py-1 bg-violet-500 text-white rounded-lg font-semibold">
                  Referral Code: {referralStats.referralCode}
                </div>
              )}
            </div>
            <div className="flex justify-center gap-8 pb-6">
              <div className="text-center">
                <div className="text-xl font-bold text-gray-900">
                  {userProfile.rank}
                  <span className="text-base">
                    {getOrdinalSuffix(userProfile.rank)}
                  </span>
                </div>
                <div className="text-xs text-gray-600">Global Rank</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-gray-900">
                  {userProfile.points.toLocaleString()}
                </div>
                <div className="text-xs text-gray-600">Points</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-gray-900">
                  ${formatNumber(userProfile.dollarValue)}
                </div>
                <div className="text-xs text-gray-600">Volume</div>
              </div>
            </div>
            <div className="w-full bg-gradient-to-r from-violet-500 to-indigo-600 text-white py-2 px-4 flex justify-between rounded-b-xl text-xs font-semibold">
              <span>Join the Gorillionaire community!</span>
              <span>gorillionaire.com</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={shareOnX}
            disabled={isSharing || isGenerating}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-violet-600 text-white rounded-lg font-medium hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
        <p className="text-xs text-gray-500 mt-3 text-center">
          Share your achievements with the Gorillionaire community! 🦍
        </p>
      </div>
    </div>
  );
};

export default ShareableProfileCard;
