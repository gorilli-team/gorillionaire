"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Image from "next/image";
import {
  useWriteContract,
  useConfig,
  useSignTypedData,
  useSendTransaction,
  useSwitchChain,
  useAccount,
} from "wagmi";
import { waitForTransactionReceipt } from "wagmi/actions";
import { concat, erc20Abi, numberToHex, parseUnits, size } from "viem";
import { getTimeAgo } from "@/app/utils/time";
import { LoadingOverlay } from "../ui/LoadingSpinner";
import {
  MON_ADDRESS,
  MONAD_CHAIN_ID,
  PERMIT2_ADDRESS,
  WMONAD_ADDRESS,
} from "@/app/utils/constants";
import { usePrivy } from "@privy-io/react-auth";
import { ToastContainer, toast, Bounce } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Cookies from "js-cookie";
import { nnsClient } from "@/app/providers";
import { HexString } from "@/app/types";
import { getTokenImage } from "@/app/utils/tokens";
import Link from "next/link";
import dynamic from "next/dynamic";
const DexModal = dynamic(() => import("../ui/DexModal"), { ssr: false });

type Token = {
  symbol: string;
  name: string;
  imageUrl: string | undefined;
  totalHolding: number;
  decimals: number;
  address: `0x${string}`;
  price: number;
};

type ApiTokenHolder = {
  balance: string;
  contractAddress: string;
  decimal: number;
  imageURL: string;
  name: string;
  price: string;
  symbol: string;
  verified: boolean;
};

type TradeEvent = {
  user: string;
  userAddress: string;
  action: string;
  amount: number;
  token: string;
  timeAgo: string;
  userImageUrl: string;
};

type ApiTrade = {
  userAddress: string;
  action: string;
  tokenAmount: number;
  tokenSymbol: string;
  timestamp: string;
  userImageUrl?: string;
};

type TradeSignal = {
  _id: string;
  type: "Buy" | "Sell";
  token: string;
  amount: string;
  signal_text: string;
  events: string[];
  risk: "Moderate" | "Aggressive" | "Conservative";
  confidenceScore: string;
  created_at: string;
  userSignal?: {
    choice: "Yes" | "No";
  };
};

//const MAX_SIGNALS = 5;
//const SIGNAL_EXPIRATION_TIME = 1 * 1 * 60 * 60 * 1000;

const parseSignalText = (signalText: string) => {
  const symbol = signalText.match(/CHOG|DAK|YAKI|MON/)?.[0];
  const amountMatch = signalText.match(/\d+\.\d+/)?.[0];
  const amount = amountMatch ? Number(amountMatch) : 0;

  return { symbol, amount };
};

const fetchImageFromSignalText = (signalText: string) => {
  const { symbol } = parseSignalText(signalText);
  return getTokenImage(symbol || "");
};

const formatNumber = (num: number): string => {
  if (isNaN(num)) return "0";
  if (num >= 1_000_000) {
    return (
      (num / 1_000_000).toLocaleString("en-US", { maximumFractionDigits: 1 }) +
      "M"
    );
  } else if (num >= 100_000) {
    // For very large thousands, use K notation
    return (
      (num / 1_000).toLocaleString("en-US", { maximumFractionDigits: 1 }) + "K"
    );
  } else if (num >= 1_000) {
    // For smaller thousands, always show the full number
    return num.toLocaleString("en-US", { maximumFractionDigits: 0 });
  } else {
    return num.toLocaleString("en-US", { maximumFractionDigits: 1 });
  }
};

const mapConfidenceScoreToRisk = (confidenceScore: string) => {
  if (Number(confidenceScore) >= 9) {
    return "Conservative";
  } else if (Number(confidenceScore) >= 8.5) {
    return "Moderate";
  } else {
    return "Aggressive";
  }
};

const Signals = () => {
  const { user } = usePrivy();
  const { writeContractAsync } = useWriteContract();
  const { signTypedDataAsync } = useSignTypedData();
  const { sendTransactionAsync } = useSendTransaction();
  const { switchChain } = useSwitchChain();
  const wagmiConfig = useConfig();
  const { chainId } = useAccount();

  const [moyakiBalance, setMoyakiBalance] = useState<number>(0);
  const [chogBalance, setChogBalance] = useState<number>(0);
  const [dakBalance, setDakBalance] = useState<number>(0);
  const [monBalance, setMonBalance] = useState<number>(0);
  const [completedTrades, setCompletedTrades] = useState<TradeEvent[]>([]);
  const [chogPrice, setChogPrice] = useState<number>(0);
  const [dakPrice, setDakPrice] = useState<number>(0);
  const [moyakiPrice, setMoyakiPrice] = useState<number>(0);
  const [monPrice, setMonPrice] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [buyTotalPages, setBuyTotalPages] = useState(1);
  const [sellTotalPages, setSellTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [buySignals, setBuySignals] = useState<TradeSignal[]>([]);
  const [sellSignals, setSellSignals] = useState<TradeSignal[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentDexToken, setCurrentDexToken] = useState<Token | null>(null);
  const [currentDexAmount, setCurrentDexAmount] = useState(0);
  const [currentDexType, setCurrentDexType] = useState<"Buy" | "Sell">("Buy");
  const [currentSignalId, setCurrentSignalId] = useState<string>("");

  const fetchHolderData = useCallback(async () => {
    try {
      if (!user?.wallet?.address) {
        console.log("No wallet address available");
        return;
      }

      // Fetch token holders data for specific user
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/token/holders/user/${user.wallet.address}`
      );
      const data = await response.json();

      if (
        data.code === 0 &&
        data.result &&
        data.result.data &&
        Array.isArray(data.result.data)
      ) {
        data.result.data.forEach((token: ApiTokenHolder) => {
          // Convert balance string to number considering decimals
          const balance = parseFloat(token.balance);

          if (token.symbol === "MON") {
            setMonBalance(balance);
          } else if (token.symbol === "CHOG") {
            setChogBalance(balance);
          } else if (token.symbol === "DAK") {
            setDakBalance(balance);
          } else if (token.symbol === "YAKI") {
            setMoyakiBalance(balance);
          }
        });
      }
    } catch (error) {
      console.error("Error fetching token holders data:", error);
    }
  }, [user?.wallet?.address]);

  // Add a refresh interval for token balances
  useEffect(() => {
    if (user?.wallet?.address) {
      fetchHolderData();
      // Refresh balances every 30 seconds
      const interval = setInterval(fetchHolderData, 30000);
      return () => clearInterval(interval);
    }
  }, [user?.wallet?.address, fetchHolderData]);

  const fetchPriceData = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/events/prices/latest`
      );
      const data = await response.json();

      data.data.forEach(
        (item: {
          symbol: string;
          price: {
            price: number;
          };
        }) => {
          if (item.symbol === "CHOG") {
            setChogPrice(item.price?.price);
          } else if (item.symbol === "DAK") {
            setDakPrice(item.price?.price);
          } else if (item.symbol === "YAKI") {
            setMoyakiPrice(item.price?.price);
          } else if (item.symbol === "WMON") {
            setMonPrice(item.price?.price);
          }
        }
      );
    } catch (error) {
      console.error("Error fetching price data:", error);
    }
  };

  useEffect(() => {
    fetchPriceData();
  }, []);

  const tokens: Token[] = useMemo(
    () => [
      {
        symbol: "MON",
        name: "Monad",
        totalHolding: monBalance,
        imageUrl: fetchImageFromSignalText("MON"),
        decimals: 18,
        address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
        price: monPrice,
      },
      {
        symbol: "DAK",
        name: "Molandak",
        totalHolding: dakBalance,
        imageUrl: fetchImageFromSignalText("DAK"),
        decimals: 18,
        address: "0x0F0BDEbF0F83cD1EE3974779Bcb7315f9808c714",
        price: dakPrice,
      },
      {
        symbol: "YAKI",
        name: "Moyaki",
        totalHolding: moyakiBalance,
        imageUrl: fetchImageFromSignalText("YAKI"),
        decimals: 18,
        address: "0xfe140e1dCe99Be9F4F15d657CD9b7BF622270C50",
        price: moyakiPrice,
      },
      {
        symbol: "CHOG",
        name: "Chog",
        totalHolding: chogBalance,
        imageUrl: fetchImageFromSignalText("CHOG"),
        decimals: 18,
        address: "0xE0590015A873bF326bd645c3E1266d4db41C4E6B",
        price: chogPrice,
      },
    ],
    [
      monBalance,
      dakBalance,
      moyakiBalance,
      chogBalance,
      chogPrice,
      dakPrice,
      moyakiPrice,
      monPrice,
    ]
  );

  const fetchCompletedTrades = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/trade/completed`
      );
      const data: ApiTrade[] = await response.json();

      const profiles = await nnsClient.getProfiles(
        data.map((t: ApiTrade) => t.userAddress as HexString)
      );

      const formattedTrades = data.map((trade: ApiTrade, i) => ({
        user: profiles[i]?.primaryName || trade.userAddress,
        userAddress: trade.userAddress,
        action: trade.action,
        amount: trade.tokenAmount,
        token: trade.tokenSymbol,
        timeAgo: getTimeAgo(trade.timestamp),
        userImageUrl:
          profiles[i]?.avatar || trade.userImageUrl || "/avatar_0.png",
      }));

      setCompletedTrades(formattedTrades);
    } catch (error) {
      console.error("Error fetching completed trades:", error);
    }
  };

  useEffect(() => {
    fetchCompletedTrades();
  }, []);

  useEffect(() => {
    const fetchSignals = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/signals/generated-signals?userAddress=${user?.wallet?.address}&page=${currentPage}&limit=5`
        );
        const data = await response.json();
        if (data && data.buySignals && data.sellSignals) {
          // Set all signals without filtering out user actions
          setBuySignals(data.buySignals);
          setSellSignals(data.sellSignals);

          // Set pagination info
          setBuyTotalPages(data.pagination.buy.pages);
          setSellTotalPages(data.pagination.sell.pages);
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Error fetching signals:", error);
        setIsLoading(false);
      }
    };

    fetchSignals();
  }, [user?.wallet?.address, currentPage]);

  // State for Yes/No buttons
  const [selectedOptions, setSelectedOptions] = useState<
    Record<string, string>
  >({});

  const onNo = useCallback((signalId: string) => {
    // Update the signal's userSignal property without removing it
    setBuySignals((prev) =>
      prev.map((signal) =>
        signal._id === signalId
          ? { ...signal, userSignal: { choice: "No" } }
          : signal
      )
    );
    setSellSignals((prev) =>
      prev.map((signal) =>
        signal._id === signalId
          ? { ...signal, userSignal: { choice: "No" } }
          : signal
      )
    );
  }, []);

  const onYes = useCallback(
    async (token: Token, amount: number, type: "Buy" | "Sell") => {
      if (!user?.wallet?.address) return;

      // Check if we're on Monad network
      if (chainId !== MONAD_CHAIN_ID) {
        toast.error("Please switch to Monad network to continue", {
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          draggable: true,
          progress: undefined,
          theme: "light",
        });
        return;
      }

      // Open DEX modal instead of executing trade directly
      setCurrentDexToken(token);
      setCurrentDexAmount(amount);
      setCurrentDexType(type);
      setIsModalOpen(true);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user?.wallet?.address]
  );

  // New function to execute trade after DEX modal confirmation
  const executeTrade = useCallback(
    async (inputAmount: string) => {
      console.log("🚀 executeTrade called with inputAmount:", inputAmount);
      console.log("🚀 currentDexToken:", currentDexToken);
      console.log("🚀 currentSignalId:", currentSignalId);
      console.log("🚀 user?.wallet?.address:", user?.wallet?.address);

      if (!currentDexToken || !user?.wallet?.address) {
        console.log("❌ Missing currentDexToken or user wallet address");
        return;
      }

      console.log("✅ All required data present, proceeding with trade");

      const token = currentDexToken;
      const type = currentDexType;

      console.log("📋 Trade parameters:", {
        token: token.symbol,
        amount: inputAmount,
        type,
        userAddress: user?.wallet?.address,
      });

      const params = new URLSearchParams({
        token: token.symbol,
        amount: inputAmount,
        type: type.toLowerCase(),
        userAddress: user?.wallet?.address,
      });

      console.log("📋 URL params:", params.toString());

      console.log(
        "📡 About to fetch quote from:",
        `${process.env.NEXT_PUBLIC_API_URL}/trade/0x-quote?${params.toString()}`
      );
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/trade/0x-quote?${params.toString()}`
      );
      console.log("📡 Quote response status:", res.status);
      const quoteData = await res.json();
      console.log("📡 Quote data received:", quoteData ? "Yes" : "No");

      if (!quoteData) {
        console.log("❌ No quote data received");
        return;
      }

      console.log("✅ Quote data received successfully");

      // Extract amount from quote data
      const amount =
        type === "Buy"
          ? parseFloat(quoteData.buyAmount || "0") /
            Math.pow(10, token.decimals)
          : parseFloat(quoteData.sellAmount || "0") /
            Math.pow(10, token.decimals);

      if (quoteData.issues?.balance) {
        console.log("❌ Insufficient balance error");
        return toast.error("Insufficient balance");
      }

      console.log("✅ No balance issues");

      const isNativeSell =
        quoteData.sellToken?.toLowerCase() === MON_ADDRESS.toLowerCase();
      console.log("🔍 isNativeSell:", isNativeSell);
      console.log("🔍 quoteData.transaction exists:", !!quoteData.transaction);

      if (isNativeSell && !quoteData.transaction) {
        console.log("❌ Native sell but no transaction object");
        toast.error("Trade quote did not return a transaction object.");
        return;
      }

      if (!isNativeSell && !quoteData.transaction) {
        console.log("❌ Non-native sell but no transaction object");
        toast.error("Trade quote did not return a transaction object.");
        return;
      }

      console.log("✅ Transaction object present");

      // Show notification when trade request is being sent to the blockchain (only if transaction exists)
      toast(
        <div>
          <div>Trade request in progress...</div>
        </div>,
        {
          position: "bottom-right",
          autoClose: 10000,
          hideProgressBar: false,
          closeOnClick: true,
          draggable: true,
          progress: undefined,
          theme: "light",
          transition: Bounce,
        }
      );

      // Native token flow (SELL MON)
      if (isNativeSell) {
        console.log("🔄 Executing native sell transaction");
        try {
          console.log("📤 About to send native transaction");
          const txHash = await sendTransactionAsync({
            account: user?.wallet?.address as `0x${string}`,
            gas: quoteData.transaction.gas
              ? BigInt(quoteData.transaction.gas)
              : undefined,
            to: quoteData.transaction.to,
            data: quoteData.transaction.data,
            value: BigInt(quoteData.transaction.value),
            gasPrice: quoteData.transaction.gasPrice
              ? BigInt(quoteData.transaction.gasPrice)
              : undefined,
            chainId: MONAD_CHAIN_ID,
          });
          console.log("📤 Native transaction sent, hash:", txHash);

          console.log("⏳ Waiting for native transaction receipt...");
          await waitForTransactionReceipt(wagmiConfig, {
            hash: txHash,
            confirmations: 1,
          });

          console.log(
            "✅ Native transaction confirmed successfully, hash:",
            txHash
          );

          // Trade successful - dispatch custom event to refresh points and quests
          window.dispatchEvent(
            new CustomEvent("tradeCompleted", {
              detail: {
                userAddress: user?.wallet?.address,
                token: token.symbol,
                amount: amount,
                type: type,
              },
            })
          );

          console.log("📊 About to call trade-points API for native sell");
          const tradePointsResponse = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/activity/track/trade-points`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${Cookies.get("privy-token")}`,
              },
              body: JSON.stringify({
                address: user?.wallet?.address,
                txHash,
                intentId: quoteData.intentId,
                signalId: currentSignalId,
              }),
            }
          );
          console.log(
            "📊 Trade-points API response status:",
            tradePointsResponse.status
          );

          console.log(
            "🔍 About to check currentSignalId for native sell:",
            currentSignalId
          );

          // Update the signals state to add the user's choice
          if (currentSignalId) {
            console.log(
              "✅ currentSignalId is set for native sell, updating UI and storing user signal"
            );
            setBuySignals((prevSignals) =>
              prevSignals.map((signal) =>
                signal._id === currentSignalId
                  ? { ...signal, userSignal: { choice: "Yes" } }
                  : signal
              )
            );
            setSellSignals((prevSignals) =>
              prevSignals.map((signal) =>
                signal._id === currentSignalId
                  ? { ...signal, userSignal: { choice: "Yes" } }
                  : signal
              )
            );

            // Store user signal after successful trade
            console.log(
              "🔄 Storing user signal after successful native sell trade:",
              {
                userAddress: user?.wallet?.address,
                signalId: currentSignalId,
                choice: "Yes",
              }
            );

            try {
              const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/signals/generated-signals/user-signal`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${Cookies.get("privy-token")}`,
                  },
                  body: JSON.stringify({
                    userAddress: user?.wallet?.address,
                    signalId: currentSignalId,
                    choice: "Yes",
                  }),
                }
              );

              if (response.ok) {
                console.log(
                  "✅ User signal stored successfully after native sell trade"
                );
              } else if (response.status === 400) {
                const errorData = await response.json();
                if (errorData.error === "User signal already exists") {
                  console.log(
                    "ℹ️ User signal already exists, skipping storage"
                  );
                } else {
                  console.error(
                    "❌ Failed to store user signal after native sell trade:",
                    errorData
                  );
                }
              } else {
                const errorData = await response.json();
                console.error(
                  "❌ Failed to store user signal after native sell trade:",
                  errorData
                );
              }
            } catch (error) {
              console.error(
                "❌ Error storing user signal after native sell trade:",
                error
              );
            }
          } else {
            console.log(
              "❌ currentSignalId is empty for native sell, cannot store user signal"
            );
          }

          setIsModalOpen(false);
          return;
        } catch (error) {
          console.error("Trade execution error:", error);
          toast.error("Trade failed");
          setIsModalOpen(false);
          return;
        }
      } else if (
        quoteData.sellToken?.toLowerCase() === MON_ADDRESS.toLowerCase()
      ) {
        toast.error("Trade quote did not return a transaction object.");
        return;
      }

      // ERC20 token flow (BUY tokens)
      if (quoteData.issues && quoteData.issues.allowance !== null) {
        try {
          const hash = await writeContractAsync({
            abi: erc20Abi,
            address: type === "Sell" ? token.address : WMONAD_ADDRESS,
            functionName: "approve",
            args: [
              PERMIT2_ADDRESS,
              parseUnits(amount.toString(), token.decimals),
            ],
          });

          await waitForTransactionReceipt(wagmiConfig, {
            hash,
            confirmations: 1,
          });
        } catch (error) {
          console.error("Error approving Permit2:", error);
        }
      }

      const transaction = quoteData?.transaction;
      if (!transaction) {
        toast.error("Trade quote did not return a transaction object.");
        return;
      }

      let signature;
      let signatureLengthInHex;
      if (quoteData?.permit2?.eip712) {
        signature = await signTypedDataAsync(quoteData.permit2.eip712);
        signatureLengthInHex = numberToHex(size(signature), {
          signed: false,
          size: 32,
        });
        transaction.data = concat([
          transaction.data,
          signatureLengthInHex,
          signature,
        ]);
      }

      try {
        console.log("📤 About to send ERC20 transaction");
        const hash = await sendTransactionAsync({
          account: user?.wallet?.address as `0x${string}`,
          gas: transaction.gas ? BigInt(transaction.gas) : undefined,
          to: transaction.to,
          data: transaction.data,
          chainId: MONAD_CHAIN_ID,
        });
        console.log("📤 ERC20 transaction sent, hash:", hash);

        console.log("⏳ Waiting for ERC20 transaction receipt...");
        await waitForTransactionReceipt(wagmiConfig, {
          hash,
          confirmations: 1,
        });
        console.log("✅ ERC20 transaction confirmed successfully, hash:", hash);

        // Trade successful - dispatch custom event to refresh points and quests
        window.dispatchEvent(
          new CustomEvent("tradeCompleted", {
            detail: {
              userAddress: user?.wallet?.address,
              token: token.symbol,
              amount: amount,
              type: type,
            },
          })
        );

        const privyToken = Cookies.get("privy-token");
        console.log("📊 About to call trade-points API for ERC20");
        const tradePointsResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/activity/track/trade-points`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${privyToken}`,
            },
            body: JSON.stringify({
              address: user?.wallet?.address,
              txHash: hash,
              intentId: quoteData.intentId,
              signalId: currentSignalId,
            }),
          }
        );
        console.log(
          "📊 Trade-points API response status:",
          tradePointsResponse.status
        );

        console.log(
          "🔍 About to check currentSignalId for ERC20:",
          currentSignalId
        );

        if (currentSignalId) {
          console.log(
            "✅ currentSignalId is set for ERC20, updating UI and storing user signal"
          );
          setBuySignals((prevSignals) =>
            prevSignals.map((signal) =>
              signal._id === currentSignalId
                ? { ...signal, userSignal: { choice: "Yes" } }
                : signal
            )
          );
          setSellSignals((prevSignals) =>
            prevSignals.map((signal) =>
              signal._id === currentSignalId
                ? { ...signal, userSignal: { choice: "Yes" } }
                : signal
            )
          );

          // Store user signal after successful trade
          console.log("🔄 Storing user signal after successful ERC20 trade:", {
            userAddress: user?.wallet?.address,
            signalId: currentSignalId,
            choice: "Yes",
          });

          try {
            const response = await fetch(
              `${process.env.NEXT_PUBLIC_API_URL}/signals/generated-signals/user-signal`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${privyToken}`,
                },
                body: JSON.stringify({
                  userAddress: user?.wallet?.address,
                  signalId: currentSignalId,
                  choice: "Yes",
                }),
              }
            );

            if (response.ok) {
              console.log(
                "✅ User signal stored successfully after ERC20 trade"
              );
            } else if (response.status === 400) {
              const errorData = await response.json();
              if (errorData.error === "User signal already exists") {
                console.log("ℹ️ User signal already exists, skipping storage");
              } else {
                console.error(
                  "❌ Failed to store user signal after ERC20 trade:",
                  errorData
                );
              }
            } else {
              const errorData = await response.json();
              console.error(
                "❌ Failed to store user signal after ERC20 trade:",
                errorData
              );
            }
          } catch (error) {
            console.error(
              "❌ Error storing user signal after ERC20 trade:",
              error
            );
          }
        } else {
          console.log(
            "❌ currentSignalId is empty for ERC20, cannot store user signal"
          );
        }
      } catch (error) {
        console.error("Trade execution error:", error);
        toast.error("Trade failed");
      }

      setIsModalOpen(false);
    },
    [
      currentDexToken,
      currentDexType,
      user?.wallet?.address,
      sendTransactionAsync,
      signTypedDataAsync,
      wagmiConfig,
      writeContractAsync,
      currentSignalId,
    ]
  );

  const handleOptionSelect = useCallback(
    async (signalId: string, option: "Yes" | "No") => {
      setSelectedOptions({
        ...selectedOptions,
        [signalId]: option,
      });

      if (option === "Yes") {
        const signal =
          buySignals.find((s) => s._id === signalId) ||
          sellSignals.find((s) => s._id === signalId);
        if (!signal) return;

        const { symbol, amount } = parseSignalText(signal.signal_text);
        const token = tokens.find((t) => symbol === t.symbol);
        if (!token) return;

        // Set current signal ID for later updates
        setCurrentSignalId(signalId);
        await onYes(token, amount, signal.type);
      } else {
        console.log("🔄 Storing user signal for 'No' choice:", {
          userAddress: user?.wallet?.address,
          signalId,
          choice: option,
        });

        const privyToken = Cookies.get("privy-token");
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/signals/generated-signals/user-signal`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${privyToken}`,
            },
            body: JSON.stringify({
              userAddress: user?.wallet?.address,
              signalId,
              choice: option,
            }),
          }
        );

        if (response.ok) {
          console.log("✅ User signal stored successfully for 'No' choice");
        } else if (response.status === 400) {
          const errorData = await response.json();
          console.error(
            "❌ Failed to store user signal for 'No' choice:",
            errorData
          );
          toast.error("You have already 5 No signals in the last 24 hours");
          return;
        } else {
          const errorData = await response.json();
          console.error(
            "❌ Failed to store user signal for 'No' choice:",
            errorData
          );
        }

        onNo(signalId);
      }
    },
    [
      selectedOptions,
      buySignals,
      sellSignals,
      tokens,
      onYes,
      onNo,
      user?.wallet?.address,
    ]
  );

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  if (isLoading) {
    return <LoadingOverlay />;
  }

  return (
    <div className="w-full min-h-screen bg-gray-50 pt-2 lg:pt-0">
      <ToastContainer
        position="bottom-right"
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

      <div className="px-2 sm:px-4 py-4 sm:py-6">
        {/* Token Stats */}
        {user?.wallet?.address && (
          <div className="mb-6 w-full">
            <div className="w-full grid grid-cols-2 md:grid-cols-4 gap-4">
              {tokens.map((token) => (
                <div
                  key={token.symbol}
                  className="bg-white rounded-xl shadow p-4 flex items-center gap-3 min-w-0"
                >
                  <div className="w-12 h-12 md:w-16 md:h-16 rounded-full overflow-hidden flex-shrink-0 relative border border-gray-100">
                    <Image
                      src={
                        token.imageUrl && token.imageUrl.length > 0
                          ? token.imageUrl
                          : "/fav.png"
                      }
                      alt={token.name || "token image"}
                      width={48}
                      height={48}
                      className="object-cover rounded-full md:w-16 md:h-16"
                    />
                  </div>
                  <div className="flex flex-col flex-grow min-w-0">
                    <span className="text-xs md:text-sm text-gray-600 font-medium truncate">
                      {token.name}
                    </span>
                    <span className="text-lg md:text-2xl font-bold text-gray-900 truncate">
                      {formatNumber(token.totalHolding)}{" "}
                      <span className="text-base md:text-xl font-semibold text-violet-600">
                        {token.symbol}
                      </span>
                    </span>
                    {token.price && token.price > 0 ? (
                      <span className="text-xs md:text-sm text-gray-500 mt-1">
                        Price: ${token?.price?.toFixed(4)}
                      </span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* IMPROVED RECENT TRADES TICKER */}
        <div className="mb-6 overflow-hidden relative bg-white rounded-lg shadow">
          <div className="py-2 px-3">
            <div className="ticker-wrapper">
              <div className="ticker-track">
                {[...completedTrades, ...completedTrades].map(
                  (trade, index) => (
                    <div key={index} className="ticker-item">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 relative border border-gray-200">
                          {trade.userImageUrl && (
                            <Image
                              src={
                                trade.userImageUrl &&
                                trade.userImageUrl.length > 0
                                  ? trade.userImageUrl
                                  : "/fav.png"
                              }
                              alt={`${trade.user} avatar`}
                              width={32}
                              height={32}
                              className="object-cover"
                            />
                          )}
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center">
                            <span className="text-sm font-bold">
                              <a
                                href={`/users/${trade.userAddress}`}
                                className="hover:text-violet-600 transition-colors duration-200"
                              >
                                {trade.user}
                              </a>
                            </span>
                          </div>
                          <div className="flex items-center">
                            <span className="mr-1">
                              {trade.action === "buy" ? "💰" : "💸"}
                            </span>
                            <span className="text-sm mr-1">{trade.action}</span>
                            <span
                              className={`text-sm font-bold ${
                                trade.action === "buy"
                                  ? "text-green-500"
                                  : "text-red-500"
                              }`}
                            >
                              {trade.amount} {trade.token}
                            </span>
                            <span className="text-xs text-gray-500 ml-2">
                              {trade.timeAgo}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main Signals Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-yellow-500 text-2xl mr-2">💰</span>
                <span className="font-bold text-2xl">Buy Signals</span>
              </div>
              <span className="text-sm text-gray-500">
                Page {currentPage} of {buyTotalPages}
              </span>
            </div>

            <div className="space-y-6">
              {buySignals.map((signal, index) => (
                <div
                  key={index}
                  className="border-b pb-4 last:border-b-0 last:pb-0"
                >
                  <Link href={`/signals/${signal._id}`}>
                    <div className="flex justify-between items-center mb-3 cursor-pointer hover:bg-gray-50 p-3 rounded-lg transition-all duration-200 border border-gray-100 hover:border-violet-200 hover:shadow-sm group">
                      <div className="flex items-center">
                        <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 relative mr-2">
                          <Image
                            src={
                              fetchImageFromSignalText(signal.signal_text) &&
                              fetchImageFromSignalText(signal.signal_text)
                                .length > 0
                                ? fetchImageFromSignalText(signal.signal_text)
                                : "/fav.png"
                            }
                            alt={signal.signal_text || "signal image"}
                            width={24}
                            height={24}
                            className="object-cover rounded-full"
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
                            {signal.userSignal.choice === "Yes"
                              ? "Accepted"
                              : "Rejected"}
                          </span>
                        )}
                        <span
                          className={`text-xs px-2 py-1 rounded ${
                            mapConfidenceScoreToRisk(signal.confidenceScore) ===
                            "Moderate"
                              ? "bg-yellow-100 text-yellow-800"
                              : mapConfidenceScoreToRisk(
                                  signal.confidenceScore
                                ) === "Conservative"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {mapConfidenceScoreToRisk(signal.confidenceScore)}
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
                          onClick={() => handleOptionSelect(signal._id, "No")}
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
                          onClick={() => handleOptionSelect(signal._id, "Yes")}
                        >
                          <span>Trade</span>
                          {selectedOptions[signal._id] === "Yes" && (
                            <span className="ml-1">•</span>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {!signal.userSignal && chainId !== MONAD_CHAIN_ID && (
                    <button
                      className={`px-3 py-1 mb-3 text-sm flex items-center justify-center bg-violet-700 text-white rounded-full`}
                      onClick={() => switchChain({ chainId: MONAD_CHAIN_ID })}
                    >
                      Switch to Monad
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

                  <div className="text-xs text-gray-400 mt-2">
                    {getTimeAgo(signal.created_at)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-gray-500 text-2xl mr-2">💸</span>
                <span className="font-bold text-2xl">Sell Signals</span>
              </div>
              <span className="text-sm text-gray-500">
                Page {currentPage} of {sellTotalPages}
              </span>
            </div>

            <div className="space-y-6">
              {sellSignals.map((signal, index) => (
                <div
                  key={index}
                  className="border-b pb-4 last:border-b-0 last:pb-0"
                >
                  <Link href={`/signals/${signal._id}`}>
                    <div className="flex justify-between items-center mb-3 cursor-pointer hover:bg-gray-50 p-3 rounded-lg transition-all duration-200 border border-gray-100 hover:border-violet-200 hover:shadow-sm group">
                      <div className="flex items-center">
                        <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 relative mr-2">
                          <Image
                            src={
                              fetchImageFromSignalText(signal.signal_text) &&
                              fetchImageFromSignalText(signal.signal_text)
                                .length > 0
                                ? fetchImageFromSignalText(signal.signal_text)
                                : "/fav.png"
                            }
                            alt={signal.signal_text || "signal image"}
                            width={24}
                            height={24}
                            className="object-cover rounded-full"
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
                            {signal.userSignal.choice === "Yes"
                              ? "Accepted"
                              : "Rejected"}
                          </span>
                        )}
                        <span
                          className={`text-xs px-2 py-1 rounded ${
                            mapConfidenceScoreToRisk(signal.confidenceScore) ===
                            "Moderate"
                              ? "bg-yellow-100 text-yellow-800"
                              : mapConfidenceScoreToRisk(
                                  signal.confidenceScore
                                ) === "Conservative"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {mapConfidenceScoreToRisk(signal.confidenceScore)}
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
                          onClick={() => handleOptionSelect(signal._id, "No")}
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
                          onClick={() => handleOptionSelect(signal._id, "Yes")}
                        >
                          <span>Trade</span>
                          {selectedOptions[signal._id] === "Yes" && (
                            <span className="ml-1">•</span>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {!signal.userSignal && chainId !== MONAD_CHAIN_ID && (
                    <button
                      className={`px-3 py-1 mb-3 text-sm flex items-center justify-center bg-violet-700 text-white rounded-full`}
                      onClick={() => switchChain({ chainId: MONAD_CHAIN_ID })}
                    >
                      Switch to Monad
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

                  <div className="text-xs text-gray-400 mt-2">
                    {getTimeAgo(signal.created_at)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Pagination Controls */}
        <div className="flex justify-center items-center space-x-2 mt-4 mb-6">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className={`px-3 py-1 rounded ${
              currentPage === 1
                ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                : "bg-violet-700 text-white hover:bg-violet-800"
            }`}
          >
            Previous
          </button>
          <span className="text-gray-600">
            Page {currentPage} of {Math.max(buyTotalPages, sellTotalPages)}
          </span>
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= Math.max(buyTotalPages, sellTotalPages)}
            className={`px-3 py-1 rounded ${
              currentPage >= Math.max(buyTotalPages, sellTotalPages)
                ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                : "bg-violet-700 text-white hover:bg-violet-800"
            }`}
          >
            Next
          </button>
        </div>
      </div>

      {/* CSS for ticker animation */}
      <style jsx>{`
        .ticker-wrapper {
          position: relative;
          overflow: hidden;
          height: 70px; /* Increased height for better vertical spacing */
          width: 100%;
          display: flex;
          align-items: center; /* Center content vertically */
        }

        .ticker-track {
          display: flex;
          position: absolute;
          white-space: nowrap;
          will-change: transform;
          animation: ticker 80s linear infinite;
          align-items: center; /* Center items vertically */
          width: auto; /* Allow content to determine width */
        }

        .ticker-item {
          flex-shrink: 0;
          padding: 0 24px;
          display: flex;
          align-items: center;
          height: 100%; /* Take full height of container */
          border-right: 1px solid #e5e7eb; /* Add gray border between items */
        }

        .ticker-item:last-child {
          border-right: 1px solid #e5e7eb; /* Add border to last item too */
        }

        @keyframes ticker {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
      `}</style>

      {/* Add DEX Modal */}
      {currentDexToken && user?.wallet?.address && (
        <DexModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onConfirm={executeTrade}
          token={currentDexToken}
          amount={currentDexAmount}
          type={currentDexType}
          monBalance={monBalance}
          monPrice={monPrice}
          signalText={
            buySignals.find((s) => s._id === currentSignalId)?.signal_text ||
            sellSignals.find((s) => s._id === currentSignalId)?.signal_text
          }
          confidenceScore={
            buySignals.find((s) => s._id === currentSignalId)
              ?.confidenceScore ||
            sellSignals.find((s) => s._id === currentSignalId)?.confidenceScore
          }
          userAddress={user.wallet.address!}
        />
      )}
    </div>
  );
};

export default Signals;
