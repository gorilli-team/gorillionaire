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
  } else if (num >= 1_000) {
    return (
      (num / 1_000).toLocaleString("en-US", { maximumFractionDigits: 1 }) + "K"
    );
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

  const fetchHolderData = async () => {
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
          if (token.symbol === "MON") {
            setMonBalance(parseFloat(token.balance));
          } else if (token.symbol === "CHOG") {
            setChogBalance(parseFloat(token.balance));
          } else if (token.symbol === "DAK") {
            setDakBalance(parseFloat(token.balance));
          } else if (token.symbol === "YAKI") {
            setMoyakiBalance(parseFloat(token.balance));
          }
        });
      }
    } catch (error) {
      console.error("Error fetching token holders data:", error);
    }
  };

  useEffect(() => {
    if (user?.wallet?.address) {
      fetchHolderData();
    }
  }, [user?.wallet?.address]);

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
        userImageUrl: trade.userImageUrl || "/avatar_0.png",
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

      // for sells we need to convert percentage to amount, for buys change gets handled backend/side
      const sellAmount =
        type === "Sell" ? (token.totalHolding * amount) / 100 : amount;

      const params = new URLSearchParams({
        token: token.symbol,
        amount: sellAmount.toString(),
        type: type.toLowerCase(),
        userAddress: user?.wallet?.address,
      });

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/trade/0x-quote?${params.toString()}`
      );
      const quote = await res.json();

      if (!quote) return;

      if (quote.issues?.balance) {
        return toast.error("Insufficient balance");
      }

      // Show notification when trade request is being sent to the blockchain
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

      // Different flow if sell token is native token
      if (quote.sellToken?.toLowerCase() === MON_ADDRESS.toLowerCase()) {
        const txHash = await sendTransactionAsync({
          account: user?.wallet?.address as `0x${string}`,
          gas: quote?.transaction.gas
            ? BigInt(quote.transaction.gas)
            : undefined,
          to: quote?.transaction.to,
          data: quote.transaction.data,
          value: BigInt(quote.transaction.value),
          gasPrice: quote?.transaction.gasPrice
            ? BigInt(quote.transaction.gasPrice)
            : undefined,
          chainId: MONAD_CHAIN_ID,
        });

        await waitForTransactionReceipt(wagmiConfig, {
          hash: txHash,
          confirmations: 1,
        });
        const privyToken = Cookies.get("privy-token");
        await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/activity/track/trade-points`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${privyToken}`,
            },
            body: JSON.stringify({
              address: user?.wallet?.address,
              txHash,
              intentId: quote.intentId,
            }),
          }
        );
        return;
      }

      if (quote.issues && quote.issues.allowance !== null) {
        try {
          const hash = await writeContractAsync({
            abi: erc20Abi,
            address: type === "Sell" ? token.address : WMONAD_ADDRESS,
            functionName: "approve",
            args: [
              PERMIT2_ADDRESS,
              parseUnits(sellAmount.toString(), token.decimals),
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

      const transaction = quote?.transaction;
      const signature = await signTypedDataAsync(quote?.permit2.eip712);
      const signatureLengthInHex = numberToHex(size(signature), {
        signed: false,
        size: 32,
      });
      transaction.data = concat([
        transaction.data,
        signatureLengthInHex,
        signature,
      ]);

      const hash = await sendTransactionAsync({
        account: user?.wallet?.address as `0x${string}`,
        gas: !!quote.transaction.gas
          ? BigInt(quote.transaction.gas)
          : undefined,
        to: quote.transaction.to,
        data: quote.transaction.data,
        chainId: MONAD_CHAIN_ID,
      });

      await waitForTransactionReceipt(wagmiConfig, {
        hash,
        confirmations: 1,
      });

      const privyToken = Cookies.get("privy-token");
      await fetch(
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
            intentId: quote.intentId,
          }),
        }
      );
    },
    [
      user?.wallet?.address,
      sendTransactionAsync,
      signTypedDataAsync,
      wagmiConfig,
      writeContractAsync,
      chainId,
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

        await onYes(token, amount, signal.type);
      } else {
        onNo(signalId);
      }

      const privyToken = Cookies.get("privy-token");
      await fetch(
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
    },
    [
      buySignals,
      sellSignals,
      selectedOptions,
      onYes,
      onNo,
      tokens,
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {tokens.map((token) => (
              <div
                key={token.symbol}
                className="bg-white rounded-lg shadow p-4 flex items-center"
              >
                <div className="flex items-center space-x-3 w-full">
                  <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0 relative">
                    <Image
                      src={token.imageUrl || ""}
                      alt={token.name || "token image"}
                      width={128}
                      height={128}
                      className="object-cover rounded-full"
                    />
                  </div>
                  <div className="flex flex-col flex-grow space-y-1">
                    <span className="text-sm text-gray-600 font-medium">
                      {token.name}
                    </span>
                    <div className="flex flex-col">
                      <span className="text-2xl font-bold text-gray-900">
                        {formatNumber(token.totalHolding)}{" "}
                        <span className="text-xl font-semibold text-violet-600">
                          {token.symbol}
                        </span>
                      </span>
                      {token.price && token.price > 0 ? (
                        <span className="text-sm text-gray-500 mt-1">
                          Price: ${token?.price?.toFixed(4)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex flex-col items-end"></div>
                </div>
              </div>
            ))}
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
                              src={trade.userImageUrl}
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
                              fetchImageFromSignalText(signal.signal_text) || ""
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
                              fetchImageFromSignalText(signal.signal_text) || ""
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
    </div>
  );
};

export default Signals;
