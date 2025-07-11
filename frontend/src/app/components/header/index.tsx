"use client";
import { useLogin, usePrivy } from "@privy-io/react-auth";
import { useState, useEffect, useCallback, useRef } from "react";
import { ToastContainer, toast, Bounce } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import LeaderboardBadge from "../leaderboard_badge";
import DailyQuestHeader from "../DailyQuestHeader";
import Cookies from "js-cookie";
import { useGetProfile } from "@nadnameservice/nns-wagmi-hooks";
import { HexString } from "@/app/types";
import { useDisconnect } from "wagmi";

interface Notification {
  type: string;
  data: {
    data?: {
      action?: string;
      tokenAmount?: number;
      tokenPrice?: number;
      tokenSymbol?: string;
      userAddress?: string;
    };
  };
  message?: string;
  title?: string;
}

export default function Header() {
  const { ready, authenticated, user, logout } = usePrivy();
  const { disconnect } = useDisconnect();

  // Always use the correct address, never '0x' or empty
  const userAddress = user?.wallet?.address || null;
  const [address, setAddress] = useState<string | null>(userAddress);

  // Only call useGetProfile if address is valid
  const { profile: nadProfile } = useGetProfile(
    address && address !== "0x"
      ? (address as HexString)
      : "0x0000000000000000000000000000000000000000"
  );

  // Update address when user changes
  useEffect(() => {
    if (!authenticated) {
      setAddress(null);
    } else {
      setAddress(userAddress);
    }
  }, [userAddress, authenticated]);

  const handleLogout = async () => {
    setAddress(null);
    disconnect();
    await logout();
  };

  const { login } = useLogin({
    onComplete: async ({ user }) => {
      const privyToken = Cookies.get("privy-token");
      if (!privyToken || !user.wallet?.address) return;

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/privy`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ address: user.wallet.address, privyToken }),
        }
      );
      await response.json();
    },
  });
  const [monPriceFormatted, setMonPriceFormatted] = useState<string>("0.00");
  const [isFlashing, setIsFlashing] = useState(false); //eslint-disable-line
  const [streak, setStreak] = useState<number>(0);

  // WebSocket notification state
  const wsRef = useRef<WebSocket | null>(null);

  // Function to show notification
  const showCustomNotification = (
    message: string,
    title: string = "Notification"
  ) => {
    toast(
      <div>
        <div className="font-bold">{title}</div>
        <div>{message}</div>
      </div>,
      {
        position: "bottom-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        draggable: true,
        progress: undefined,
        theme: "light",
        transition: Bounce,
      }
    );
  };

  // Handle wallet connection/disconnection and address updates
  useEffect(() => {
    if (!ready) return; // Wait for Privy to be ready

    const trackUser = async () => {
      if (authenticated && user?.wallet) {
        //make a call to the backend to track the user
        const privyToken = Cookies.get("privy-token");

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/activity/track/signin`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${privyToken}`,
            },
            body: JSON.stringify({ address: user.wallet.address }),
          }
        );
        await response.json();

        // Fetch streak data after tracking user
        await fetchStreak();
      }
    };

    trackUser();
  }, [ready, authenticated, user]);

  // WebSocket for notifications
  useEffect(() => {
    // Only connect when authenticated and we have an address
    if (!authenticated || !address) {
      return;
    }

    // Close any existing WebSocket connection
    if (wsRef.current) {
      wsRef.current.close();
    }

    const wsUrl = `${process.env.NEXT_PUBLIC_API_URL}/events/notifications`;
    wsRef.current = new WebSocket(wsUrl);

    wsRef.current.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as Notification;

        // Debug logging to see the address comparison
        const notificationAddress = message.data?.data?.userAddress;

        if (
          message.type === "NOTIFICATION" &&
          notificationAddress &&
          address &&
          notificationAddress.toLowerCase() === address.toLowerCase()
        ) {
          // Extract relevant data
          const { action, tokenAmount, tokenPrice, tokenSymbol } =
            message.data.data || {};

          // Choose emoji based on action
          const actionEmoji = action === "buy" ? "💰" : "💸";

          // Format the message for notification - using const instead of let
          const notificationMessage = `${actionEmoji} ${action?.toUpperCase()} ${tokenAmount} ${tokenSymbol} @ $${
            tokenPrice ? tokenPrice.toFixed(2) : "N/A"
          }`;

          // Show toast notification with formatted message
          showCustomNotification(notificationMessage, "Trade Signal");
        }
      } catch (error) {
        console.error("Error processing WebSocket message:", error);
      }
    };

    return () => {
      if (wsRef.current) {
        console.log("Closing WebSocket connection");
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [authenticated, address]);

  // Fetch user streak data
  const fetchStreak = useCallback(async () => {
    if (!authenticated || !address) return;

    console.log("🔍 Fetching streak data for address:", address);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/activity/track/me?address=${address}`
      );
      const data = await response.json();

      console.log("📊 Streak API response:", data);

      if (data.userActivity?.streak) {
        console.log("🔥 Setting streak to:", data.userActivity.streak);
        setStreak(data.userActivity.streak);
      } else {
        console.log("❌ No streak data found in response");
      }
    } catch (error) {
      console.error("Error fetching streak data:", error);
    }
  }, [authenticated, address]);

  // Memoize fetchPrice to prevent unnecessary recreations
  const fetchPrice = useCallback(async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/events/prices/latest`
      );
      const data = await response.json();

      // Add null checks to prevent errors
      if (data && data.data && Array.isArray(data.data)) {
        data.data.forEach(
          (item: {
            symbol: string;
            price: {
              price: number;
            };
          }) => {
            if (item.symbol === "WMON") {
              const newPrice = item.price?.price;
              const formattedPrice = new Intl.NumberFormat("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }).format(newPrice || 0);

              if (formattedPrice !== monPriceFormatted) {
                setMonPriceFormatted(formattedPrice);
                setIsFlashing(true);
                setTimeout(() => setIsFlashing(false), 5000);
              }
            }
          }
        );
      }
    } catch (error) {
      console.error("Error fetching price data:", error);
    }
  }, [monPriceFormatted]);

  // Set up price fetching interval
  useEffect(() => {
    fetchPrice(); // Initial fetch
    const interval = setInterval(fetchPrice, 60000);
    return () => clearInterval(interval);
  }, [fetchPrice]);

  // Fetch streak when user changes
  useEffect(() => {
    if (authenticated && address) {
      fetchStreak();
    } else {
      setStreak(0);
    }
  }, [authenticated, address, fetchStreak]);

  // Show streak extension notification
  useEffect(() => {
    console.log("🎯 Streak check triggered - current streak value:", streak);

    if (streak > 0) {
      // Show a subtle notification when streak is active
      const streakMessage =
        streak === 1 ? "🔥 1 day streak!" : `🔥 ${streak} day streak!`;

      console.log("📢 Streak message:", streakMessage);

      if (streak >= 3) {
        console.log("🎉 Showing streak notification for streak >= 3");
        showCustomNotification(streakMessage, "Streak Active!");
      } else {
        console.log("📝 Streak < 3, no notification shown");
      }
    } else if (streak === 0) {
      console.log(
        "💤 No active streak (streak = 0) - user didn't trade yesterday"
      );
    } else {
      console.log("❓ Unexpected streak value:", streak);
    }
  }, [streak]);

  return (
    <>
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick={true}
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
        transition={Bounce}
      />

      <header className="h-16 px-4 sm:px-6 flex items-center justify-between border-b border-gray-300 bg-gray-100 sticky top-0 z-20">
        {/* Left space for mobile hamburger menu */}
        <div className="w-8 h-8 lg:hidden"></div>

        <div className="flex flex-wrap items-center justify-end space-x-4 flex-1 my-3 ml-auto">
          <div className="hidden md:block">
            <LeaderboardBadge />
          </div>

          <DailyQuestHeader />

          {/* {monPriceFormatted !== "0.00" && (
            <div
              className={`flex items-center gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg transition-colors duration-500 ml-auto sm:ml-0 ${
                isFlashing ? "bg-violet-300" : "bg-violet-100"
              }`}
            >
              <div className="items-end space-x-1 sm:space-x-2 sm:items-start">
                <span className="text-xs sm:text-md font-medium text-violet-900">
                  MON PRICE
                </span>
                <span
                  className={`text-xs sm:text-md font-bold text-violet-900 transition-transform duration-500 ${
                    isFlashing ? "scale-110" : "scale-100"
                  }`}
                >
                  ${monPriceFormatted}
                </span>
              </div>
            </div>
          )} */}

          {ready && authenticated ? (
            <div className="flex items-center gap-2 sm:gap-4">
              {nadProfile?.primaryName ? (
                <div className="text-xs sm:text-sm text-gray-600 truncate max-w-[80px] sm:max-w-none">
                  {nadProfile.primaryName}
                </div>
              ) : (
                address && (
                  <div className="text-xs sm:text-sm text-gray-600 truncate max-w-[80px] sm:max-w-none">
                    {address.slice(0, 6)}...
                    {address.slice(-4)}
                  </div>
                )
              )}
              <button
                onClick={handleLogout}
                className="px-2 sm:px-4 py-1 sm:py-2 text-xs sm:text-sm font-medium text-white bg-violet-600 rounded-md hover:bg-violet-400"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <div>
              <button
                onClick={login}
                disabled={!ready}
                className="px-2 sm:px-4 py-1 sm:py-2 text-xs sm:text-sm font-medium text-white bg-violet-900 rounded-md hover:bg-violet-700 disabled:opacity-50"
              >
                Connect Wallet
              </button>
            </div>
          )}
        </div>
      </header>
    </>
  );
}
