"use client";

import { useParams } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { LoadingOverlay } from "@/app/components/ui/LoadingSpinner";
import Image from "next/image";
import { getTokenImage } from "@/app/utils/tokens";
import Sidebar from "@/app/components/sidebar";
import Header from "@/app/components/header";
import { useRouter } from "next/navigation";
import {
  useWriteContract,
  useConfig,
  useSignTypedData,
  useSendTransaction,
  useAccount,
  useSwitchChain,
} from "wagmi";
import { waitForTransactionReceipt } from "wagmi/actions";
import { concat, erc20Abi, numberToHex, parseUnits, size } from "viem";
import {
  MON_ADDRESS,
  MONAD_CHAIN_ID,
  PERMIT2_ADDRESS,
  WMONAD_ADDRESS,
} from "@/app/utils/constants";
import { toast } from "react-toastify";
import Cookies from "js-cookie";
import { usePrivy } from "@privy-io/react-auth";

type Signal = {
  _id: string;
  signal_text: string;
  events: string[];
  created_at: string;
  type?: "Buy" | "Sell";
  token?: string;
  amount?: string;
  confidenceScore?: string;
  userSignals?: Array<{
    userAddress: string;
    signalId: string;
    choice: "Yes" | "No";
    created_at: string;
  }>;
  userSignal?: {
    choice: "Yes" | "No";
  };
};

type Token = {
  symbol: string;
  name: string;
  imageUrl: string | undefined;
  totalHolding: number;
  decimals: number;
  address: `0x${string}`;
  price: number;
};

const parseSignalText = (signalText: string) => {
  const symbol = signalText.match(/CHOG|DAK|YAKI|MON/)?.[0];
  const amountMatch = signalText.match(/\d+\.\d+/)?.[0];
  const amount = amountMatch ? Number(amountMatch) : 0;
  return { symbol, amount };
};

export default function SignalDetails() {
  const params = useParams();
  const [signal, setSignal] = useState<Signal | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPage, setSelectedPage] = useState("Signals");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const router = useRouter();
  const { writeContractAsync } = useWriteContract();
  const { signTypedDataAsync } = useSignTypedData();
  const { sendTransactionAsync } = useSendTransaction();
  const wagmiConfig = useConfig();
  const { chainId } = useAccount();
  const [selectedOption, setSelectedOption] = useState<"Yes" | "No" | null>(
    null
  );
  const { user } = usePrivy();
  const { switchChain } = useSwitchChain();

  const tokens: Token[] = [
    {
      symbol: "MON",
      name: "Monad",
      totalHolding: 0,
      imageUrl: getTokenImage("MON"),
      decimals: 18,
      address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
      price: 0,
    },
    {
      symbol: "DAK",
      name: "Molandak",
      totalHolding: 0,
      imageUrl: getTokenImage("DAK"),
      decimals: 18,
      address: "0x0F0BDEbF0F83cD1EE3974779Bcb7315f9808c714",
      price: 0,
    },
    {
      symbol: "YAKI",
      name: "Moyaki",
      totalHolding: 0,
      imageUrl: getTokenImage("YAKI"),
      decimals: 18,
      address: "0xfe140e1dCe99Be9F4F15d657CD9b7BF622270C50",
      price: 0,
    },
    {
      symbol: "CHOG",
      name: "Chog",
      totalHolding: 0,
      imageUrl: getTokenImage("CHOG"),
      decimals: 18,
      address: "0xE0590015A873bF326bd645c3E1266d4db41C4E6B",
      price: 0,
    },
  ];

  useEffect(() => {
    const fetchSignal = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/signals/generated-signals/${params.id}`
        );
        const data = await response.json();

        console.log("data", data);

        if (data) {
          // Parse signal text to extract type, token, amount and confidence
          const type = data.signal.signal_text.startsWith("BUY")
            ? "Buy"
            : "Sell";
          const tokenMatch = data.signal.signal_text.match(/BUY|SELL\s+(\w+)/);
          const amountMatch = data.signal.signal_text.match(/(\d+\.\d+)/);
          const confidenceMatch = data.signal.signal_text.match(
            /Confidence Score of (\d+\.\d+)/
          );

          const formattedData = {
            ...data.signal,
            type,
            token: tokenMatch ? tokenMatch[1] : "",
            amount: amountMatch ? amountMatch[1] : "",
            confidenceScore: confidenceMatch ? confidenceMatch[1] : "0",
            userSignals: data.userSignals || [],
          };
          setSignal(formattedData);
        } else {
          console.error("Unexpected API response structure:", data);
          setError("Invalid signal data received");
        }
      } catch (error) {
        console.error("Error fetching signal:", error);
        setError("Failed to fetch signal");
      } finally {
        setIsLoading(false);
      }
    };

    if (params.id) {
      fetchSignal();
    }
  }, [params.id]);

  const mapConfidenceToRisk = (confidenceScore: string | undefined) => {
    if (!confidenceScore) return "Aggressive";
    const score = parseFloat(confidenceScore);
    if (score >= 9) return "Conservative";
    if (score >= 8.5) return "Moderate";
    return "Aggressive";
  };

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

  const onNo = useCallback(() => {
    // Update local state only, API call is handled in handleOptionSelect
    setSignal((prev) =>
      prev ? { ...prev, userSignal: { choice: "No" } } : prev
    );
  }, []);

  const handleOptionSelect = useCallback(
    async (signalId: string, option: "Yes" | "No") => {
      setSelectedOption(option);

      if (option === "Yes") {
        if (!signal) return;

        const { symbol, amount } = parseSignalText(signal.signal_text);
        const token = tokens.find((t) => symbol === t.symbol);
        if (!token) return;

        await onYes(token, amount, signal.type as "Buy" | "Sell");
      } else {
        onNo();
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

      // Update the signal state to add the user's choice
      setSignal((prev) =>
        prev ? { ...prev, userSignal: { choice: option } } : prev
      );
    },
    [signal, tokens, onYes, onNo, user?.wallet?.address]
  );

  return (
    <div className="flex min-h-screen bg-gray-100 text-gray-800">
      {/* Mobile menu button */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-full bg-gray-200"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        aria-label="Toggle menu"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d={
              isMobileMenuOpen
                ? "M6 18L18 6M6 6l12 12"
                : "M4 6h16M4 12h16M4 18h16"
            }
          />
        </svg>
      </button>

      {/* Sidebar */}
      <div
        className={`
          fixed lg:static
          ${
            isMobileMenuOpen
              ? "translate-x-0"
              : "-translate-x-full lg:translate-x-0"
          }
          transition-transform duration-300 ease-in-out
          z-40 lg:z-0
          bg-white
          shadow-xl lg:shadow-none
          w-64 lg:w-auto
        `}
      >
        <Sidebar
          selectedPage={selectedPage}
          setSelectedPage={setSelectedPage}
        />
      </div>

      {/* Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <LoadingOverlay />
          ) : error ? (
            <div className="text-red-500">{error}</div>
          ) : !signal ? (
            <div className="p-4">
              <div className="text-red-500">Signal not found</div>
              <div className="text-sm text-gray-500 mt-2">ID: {params.id}</div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-full overflow-hidden">
                    <Image
                      src={getTokenImage(signal.token || "")}
                      alt={signal.token || ""}
                      width={48}
                      height={48}
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold">{signal.signal_text}</h1>
                    <div className="flex items-center gap-2 mt-2">
                      <span
                        className={`px-3 py-1 rounded-full text-sm ${
                          signal.type === "Buy"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {signal.type || "Unknown"}
                      </span>
                      <span
                        className={`px-3 py-1 rounded-full text-sm ${
                          mapConfidenceToRisk(signal.confidenceScore) ===
                          "Conservative"
                            ? "bg-green-100 text-green-800"
                            : mapConfidenceToRisk(signal.confidenceScore) ===
                              "Moderate"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {mapConfidenceToRisk(signal.confidenceScore)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-500 mb-1">Amount</div>
                    <div className="text-lg font-medium">
                      {signal.amount || "0"} {signal.token || ""}
                    </div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-500 mb-1">
                      Confidence Score
                    </div>
                    <div className="text-lg font-medium">
                      {signal.confidenceScore || "0"}
                    </div>
                  </div>
                </div>

                {signal.events &&
                  signal.events.length > 0 &&
                  signal.events[0].length > 0 && (
                    <div className="mb-6">
                      <h2 className="text-lg font-semibold mb-2">Events</h2>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="space-y-3">
                          {signal.events.map((event, index) => (
                            <div
                              key={index}
                              className="text-sm bg-white p-3 rounded-lg shadow-sm"
                            >
                              {event}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                {signal.userSignals && signal.userSignals.length > 0 && (
                  <div className="mb-6">
                    <h2 className="text-lg font-semibold mb-2">
                      User Responses
                    </h2>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="space-y-3">
                        {signal.userSignals.map((userSignal, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm"
                          >
                            <div className="flex items-center space-x-3">
                              <div
                                className={`px-3 py-1 rounded-full text-sm ${
                                  userSignal.choice === "Yes"
                                    ? "bg-green-100 text-green-800"
                                    : "bg-red-100 text-red-800"
                                }`}
                              >
                                {userSignal.choice}
                              </div>
                              <div
                                className="text-sm text-gray-600 hover:text-violet-600 cursor-pointer transition-colors duration-200"
                                onClick={() =>
                                  router.push(
                                    `/users/${userSignal.userAddress}`
                                  )
                                }
                              >
                                {userSignal.userAddress}
                              </div>
                            </div>
                            <div className="text-sm text-gray-500">
                              {new Date(userSignal.created_at).toLocaleString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div className="text-sm text-gray-500">
                  Created:{" "}
                  {(() => {
                    try {
                      console.log("signal", signal);
                      const date = new Date(signal.created_at);
                      return date.toLocaleString();
                    } catch (e) {
                      console.error("Error parsing date:", e);
                      return signal.created_at;
                    }
                  })()}
                </div>

                {/* Replace the existing Yes/No buttons section with this */}
                {signal && chainId === MONAD_CHAIN_ID && (
                  <div className="flex items-center justify-center mb-6">
                    <div className="inline-flex rounded-full border border-gray-300 overflow-hidden">
                      <button
                        className={`px-4 py-2 text-sm flex items-center justify-center w-24 ${
                          selectedOption === "No"
                            ? "bg-gray-200 text-gray-700"
                            : "bg-white text-gray-500"
                        }`}
                        onClick={() => handleOptionSelect(signal._id, "No")}
                      >
                        <span>Refuse</span>
                        {selectedOption === "No" && (
                          <span className="ml-1">•</span>
                        )}
                      </button>
                      <button
                        className={`px-4 py-2 text-sm flex items-center justify-center w-24 ${
                          selectedOption === "Yes" || !selectedOption
                            ? "bg-violet-700 text-white"
                            : "bg-white text-gray-500"
                        }`}
                        onClick={() => handleOptionSelect(signal._id, "Yes")}
                      >
                        <span>Trade</span>
                        {selectedOption === "Yes" && (
                          <span className="ml-1">•</span>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {signal && chainId !== MONAD_CHAIN_ID && (
                  <div className="flex justify-center mb-6">
                    <button
                      className="px-4 py-2 text-sm bg-violet-700 text-white rounded-full hover:bg-violet-800 transition-colors"
                      onClick={() => switchChain({ chainId: MONAD_CHAIN_ID })}
                    >
                      Switch to Monad
                    </button>
                  </div>
                )}

                {signal?.userSignal?.choice && (
                  <div className="flex justify-center mb-6">
                    <span
                      className={`px-4 py-2 rounded-full text-sm ${
                        signal.userSignal.choice === "Yes"
                          ? "bg-green-200 text-green-700"
                          : "bg-red-200 text-red-700"
                      }`}
                    >
                      {signal.userSignal.choice === "Yes"
                        ? "Signal Accepted"
                        : "Signal Refused"}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
