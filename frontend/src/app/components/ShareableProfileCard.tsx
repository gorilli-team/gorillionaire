"use client";

import React, { useRef, useState, useEffect } from "react";
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
  isOwnProfile?: boolean;
  backgroundImage?: string; // new optional prop
}

const CARD_SIZE = 800; // 1:1 aspect ratio

const ShareableProfileCard: React.FC<ShareableProfileCardProps> = ({
  userProfile,
  referralStats,
  totalTransactions,
  isOwnProfile,
  backgroundImage, // new prop
}) => {
  const exportRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [bgInput, setBgInput] = useState("");
  const [bgError, setBgError] = useState<string | null>(null);
  const [bgLoading, setBgLoading] = useState(false);
  const [proxiedBg, setProxiedBg] = useState<string | undefined>(
    backgroundImage
  );
  const [showBgModal, setShowBgModal] = useState(false);

  useEffect(() => {
    if (backgroundImage) {
      // If the background image is a full URL, proxy it
      if (/^https?:\/\//.test(backgroundImage)) {
        const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(
          backgroundImage
        )}`;
        setProxiedBg(proxyUrl);
      } else {
        setProxiedBg(backgroundImage);
      }
    } else {
      setProxiedBg(undefined);
    }
  }, [backgroundImage]);

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

  const isValidImageUrl = (url: string) =>
    /^https:\/\/.+\.(jpg|jpeg|png|webp|gif)$/i.test(url);

  const handleBgSave = async () => {
    setBgError(null);
    if (!isValidImageUrl(bgInput)) {
      setBgError(
        "Please enter a valid https image URL (.jpg, .jpeg, .png, .webp, .gif)"
      );
      return;
    }
    setBgLoading(true);
    try {
      const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(bgInput)}`;
      // Try to fetch the image via proxy to check validity
      const res = await fetch(proxyUrl);
      if (!res.ok) {
        setBgError("Could not load image from URL.");
        setBgLoading(false);
        return;
      }
      // Save to backend
      const saveRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/activity/track/profile-bg`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            address: userProfile.address,
            profileBgImage: bgInput,
          }),
        }
      );
      if (!saveRes.ok) {
        setBgError("Failed to save background. Try again.");
        setBgLoading(false);
        return;
      }
      setProxiedBg(proxyUrl);
      setBgInput("");
      setShowBgModal(false);
    } catch {
      setBgError("Unexpected error. Try again.");
    } finally {
      setBgLoading(false);
    }
  };

  const handleRemoveBg = async () => {
    setBgLoading(true);
    try {
      // Save null to backend to remove background
      const saveRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/activity/track/profile-bg`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            address: userProfile.address,
            profileBgImage: null,
          }),
        }
      );
      if (!saveRes.ok) {
        setBgError("Failed to remove background. Try again.");
        setBgLoading(false);
        return;
      }
      setProxiedBg(undefined);
      setBgInput("");
      setShowBgModal(false);
    } catch {
      setBgError("Unexpected error. Try again.");
    } finally {
      setBgLoading(false);
    }
  };

  // Export logic uses the hidden exportRef
  const generateCardImage = async () => {
    if (!exportRef.current) return;
    setIsGenerating(true);
    try {
      const canvas = await html2canvas(exportRef.current, {
        backgroundColor: "#f5f7ff",
        scale: 2,
        useCORS: true,
        allowTaint: true,
        width: CARD_SIZE,
        height: CARD_SIZE,
        scrollX: 0,
        scrollY: 0,
        windowWidth: CARD_SIZE,
        windowHeight: CARD_SIZE,
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
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "48px 32px 32px 32px",
        boxSizing: "border-box",
        color: "#222",
        fontFamily: "Inter, sans-serif",
        position: "absolute",
        left: "-9999px",
        top: 0,
        zIndex: -1,
        overflow: "hidden",
        transform: "translateZ(0)",
        background: proxiedBg
          ? `url(${proxiedBg}) center/cover no-repeat`
          : "#f5f7ff",
      }}
    >
      {/* Top Section - Avatar and Name */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          flex: 1,
        }}
      >
        {/* Avatar */}
        <div
          style={{
            width: 160,
            height: 160,
            borderRadius: "50%",
            background: "#f7f8fa",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 32px auto",
            border: "10px solid #fff",
            boxShadow: "0 2px 12px #0001",
          }}
        >
          <Image
            src={(() => {
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
              return avatarSrc;
            })()}
            alt="Profile"
            width={140}
            height={140}
            style={{
              width: 140,
              height: 140,
              borderRadius: "50%",
              objectFit: "cover",
              display: "block",
              background: "#f7f8fa",
            }}
          />
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
              textShadow:
                "3px 3px 6px rgba(255,255,255,0.8), -3px -3px 6px rgba(255,255,255,0.8), 3px -3px 6px rgba(255,255,255,0.8), -3px 3px 6px rgba(255,255,255,0.8)",
            }}
          >
            {userProfile.nadName || formatAddress(userProfile.address)}
          </div>
          <div
            style={{
              fontSize: 22,
              color: "#222",
              fontFamily: "monospace",
              textShadow:
                "3px 3px 6px rgba(255,255,255,0.8), -3px -3px 6px rgba(255,255,255,0.8), 3px -3px 6px rgba(255,255,255,0.8), -3px 3px 6px rgba(255,255,255,0.8)",
            }}
          >
            {formatAddress(userProfile.address)}
          </div>
        </div>

        {/* Referral Code and Level Badge */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
            width: "100%",
          }}
        >
          {referralStats?.referralCode && (
            <div
              style={{
                background: "#8b5cf6",
                color: "#fff",
                borderRadius: 14,
                padding: "10px 24px",
                fontWeight: 700,
                fontSize: 20,
                letterSpacing: 1,
                boxShadow: "0 2px 12px #8b5cf655",
                maxWidth: "90%",
                textAlign: "center",
                overflowWrap: "break-word",
                marginBottom: 12,
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
              textShadow:
                "3px 3px 6px rgba(255,255,255,0.8), -3px -3px 6px rgba(255,255,255,0.8), 3px -3px 6px rgba(255,255,255,0.8), -3px 3px 6px rgba(255,255,255,0.8)",
            }}
          >
            Level {getLevelInfo(userProfile.points).level}
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 56,
          width: "100%",
          marginBottom: 32,
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
              textShadow:
                "3px 3px 6px rgba(255,255,255,0.8), -3px -3px 6px rgba(255,255,255,0.8), 3px -3px 6px rgba(255,255,255,0.8), -3px 3px 6px rgba(255,255,255,0.8)",
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
              color: "#222",
              fontWeight: 500,
              textShadow:
                "3px 3px 6px rgba(255,255,255,0.8), -3px -3px 6px rgba(255,255,255,0.8), 3px -3px 6px rgba(255,255,255,0.8), -3px 3px 6px rgba(255,255,255,0.8)",
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
              textShadow:
                "3px 3px 6px rgba(255,255,255,0.8), -3px -3px 6px rgba(255,255,255,0.8), 3px -3px 6px rgba(255,255,255,0.8), -3px 3px 6px rgba(255,255,255,0.8)",
            }}
          >
            {userProfile.points.toLocaleString()}
          </div>
          <div
            style={{
              fontSize: 18,
              color: "#222",
              fontWeight: 500,
              textShadow:
                "3px 3px 6px rgba(255,255,255,0.8), -3px -3px 6px rgba(255,255,255,0.8), 3px -3px 6px rgba(255,255,255,0.8), -3px 3px 6px rgba(255,255,255,0.8)",
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
              textShadow:
                "3px 3px 6px rgba(255,255,255,0.8), -3px -3px 6px rgba(255,255,255,0.8), 3px -3px 6px rgba(255,255,255,0.8), -3px 3px 6px rgba(255,255,255,0.8)",
            }}
          >
            ${formatNumber(userProfile.dollarValue)}
          </div>
          <div
            style={{
              fontSize: 18,
              color: "#222",
              fontWeight: 500,
              textShadow:
                "3px 3px 6px rgba(255,255,255,0.8), -3px -3px 6px rgba(255,255,255,0.8), 3px -3px 6px rgba(255,255,255,0.8), -3px 3px 6px rgba(255,255,255,0.8)",
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
                textShadow:
                  "3px 3px 6px rgba(255,255,255,0.8), -3px -3px 6px rgba(255,255,255,0.8), 3px -3px 6px rgba(255,255,255,0.8), -3px 3px 6px rgba(255,255,255,0.8)",
              }}
            >
              {totalTransactions.toLocaleString()}
            </div>
            <div
              style={{
                fontSize: 18,
                color: "#222",
                fontWeight: 500,
                textShadow:
                  "3px 3px 6px rgba(255,255,255,0.8), -3px -3px 6px rgba(255,255,255,0.8), 3px -3px 6px rgba(255,255,255,0.8), -3px 3px 6px rgba(255,255,255,0.8)",
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
          width: "100%",
          background: "linear-gradient(90deg, #8b5cf6 0%, #6366f1 100%)",
          color: "#fff",
          borderRadius: 24,
          padding: "20px 32px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 20,
          fontWeight: 700,
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

      {/* Background Modal */}
      {showBgModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold mb-4">Set Background Image</h3>
            <input
              type="text"
              placeholder="Paste image URL (https, jpg/png/webp/gif)"
              value={bgInput}
              onChange={(e) => setBgInput(e.target.value)}
              style={{
                padding: 12,
                borderRadius: 8,
                border: "1px solid #ccc",
                width: "100%",
                fontSize: 16,
                marginBottom: 16,
              }}
              disabled={bgLoading}
            />
            {bgError && (
              <div style={{ color: "#b91c1c", marginBottom: 16 }}>
                {bgError}
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleBgSave}
                disabled={bgLoading}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  background: "#8b5cf6",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 16,
                  border: "none",
                  cursor: "pointer",
                  opacity: bgLoading ? 0.6 : 1,
                  flex: 1,
                }}
              >
                {bgLoading ? "Saving..." : "Save Background"}
              </button>
              <button
                onClick={handleRemoveBg}
                disabled={bgLoading}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  background: "#dc2626",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 16,
                  border: "none",
                  cursor: "pointer",
                  opacity: bgLoading ? 0.6 : 1,
                }}
              >
                {bgLoading ? "Removing..." : "Remove Background"}
              </button>
              <button
                onClick={() => {
                  setShowBgModal(false);
                  setBgInput("");
                  setBgError(null);
                }}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  background: "#6b7280",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 16,
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Visible preview */}
      <div className="bg-white rounded-lg shadow-lg">
        <div className="flex justify-center">
          <div
            className="w-full max-w-xl rounded-xl shadow-lg flex flex-col justify-between py-6 px-4 min-h-[320px]"
            style={{
              background: proxiedBg
                ? `url(${proxiedBg}) center/cover no-repeat`
                : "linear-gradient(to bottom right, #f5f7ff, #e0e7ff, #c7d2fe)",
            }}
          >
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
        {isOwnProfile && (
          <>
            <div className="flex flex-wrap gap-1 p-2 mt-2">
              <button
                onClick={shareOnX}
                disabled={isSharing || isGenerating}
                className="flex-1 min-w-[100px] flex items-center justify-center gap-1 px-2 py-1.5 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs"
              >
                {isSharing ? (
                  <>
                    <div className="w-2.5 h-2.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Sharing...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-3 h-3"
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
                className="flex-1 min-w-[100px] flex items-center justify-center gap-1 px-2 py-1.5 bg-violet-600 text-white rounded-lg font-medium hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs"
              >
                {isGenerating ? (
                  <>
                    <div className="w-2.5 h-2.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-3 h-3"
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
              <button
                onClick={() => setShowBgModal(true)}
                className="flex-1 min-w-[100px] flex items-center justify-center gap-1 px-2 py-1.5 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors text-xs"
              >
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                Set Background
              </button>
            </div>
            <p className="text-xs text-gray-500 text-center p-2">
              Share your achievements with the Gorillionaire community! 🦍
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default ShareableProfileCard;
