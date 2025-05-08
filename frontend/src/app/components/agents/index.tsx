"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useSwitchChain,
} from "wagmi";
import { usePrivy } from "@privy-io/react-auth";
import { NFT_ACCESS_ADDRESS } from "../../utils/constants";
import { abi } from "../../abi/access-nft";
import Image from "next/image";
import { MONAD_CHAIN_ID } from "../../utils/constants";
import { nnsClient } from "@/app/providers";
import { HexString } from "@/app/types";
type Holder = {
  ownerAddress: string;
  nadName: string;
};

// Define the signal type
type Signal = {
  id: string;
  text: string;
  confidence: number;
  timestamp: string;
  token?: string;
  action?: string;
};

const Agents = () => {
  const { isConnected, address, chainId } = useAccount();
  const { switchChain } = useSwitchChain();
  const { login } = usePrivy();
  const [isMinting, setIsMinting] = useState(false);
  const [mintSuccess, setMintSuccess] = useState(false);
  const [hasNFT, setHasNFT] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [holders, setHolders] = useState<Holder[]>([]);

  // State for Nillion API
  const [signals, setSignals] = useState<Signal[]>([]);
  const [isLoadingSignals, setIsLoadingSignals] = useState(false);
  const [signalError, setSignalError] = useState("");
  const [selectedSignal, setSelectedSignal] = useState<Signal | null>(null);

  // Add state for raw JSON
  const [rawJsonResponse, setRawJsonResponse] = useState<string>("");

  const { data: price } = useReadContract({
    address: NFT_ACCESS_ADDRESS,
    abi,
    functionName: "s_price",
    query: { enabled: isConnected },
  });

  const { data: nftBalance } = useReadContract({
    address: NFT_ACCESS_ADDRESS,
    abi,
    functionName: "balanceOf",
    args: [address ?? "0x1"],
    query: { enabled: isConnected && !!address },
  });

  useEffect(() => {
    if (Number(nftBalance) > 0) {
      setHasNFT(true);
      setMintSuccess(true);
    }
  }, [nftBalance]);

  const { writeContractAsync, data: hash, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash,
      query: { enabled: !!hash },
    });

  useEffect(() => {
    const fetchHolders = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/gorilli-nft/holders`
        );

        if (!response.ok) {
          throw new Error(
            `Failed to fetch holders. Status: ${response.status}`
          );
        }

        // Check if the response has content
        const text = await response.text();
        if (!text || text.trim() === "") {
          console.warn("Empty response received from holders API");
          setHolders([]);
          return;
        }

        // Try to parse the JSON
        let data;
        try {
          data = JSON.parse(text);
        } catch (parseError) {
          console.error("Error parsing JSON response:", parseError);
          console.log("Raw response:", text);
          setHolders([]);
          return;
        }

        // Check if data has the expected structure
        if (
          data &&
          data.result &&
          data.result.data &&
          Array.isArray(data.result.data)
        ) {
          const nadProfiles = await nnsClient.getProfiles(
            data.result.data.map((h: Holder) => h.ownerAddress as HexString)
          );

          setHolders(
            data.result.data.map((h: Holder, i: number) => ({
              ...h,
              nadName: nadProfiles[i]?.primaryName,
            }))
          );
          if (data.result.data.length > 0) {
            data.result.data.forEach((holder: Holder) => {
              if (holder.ownerAddress === address) {
                setHasNFT(true);
                setMintSuccess(true);
              }
            });
          }
        } else {
          console.warn("Unexpected data structure from holders API:", data);
          setHolders([]);
        }
      } catch (error) {
        console.error("Error fetching holders:", error);
        setHolders([]);
      }
    };
    fetchHolders();
  }, [mintSuccess, isConnected, address]);

  useEffect(() => {
    if (isConfirming) {
      setIsMinting(true);
    } else if (isConfirmed) {
      setIsMinting(false);
      setMintSuccess(true);
    } else if (error) {
      setIsMinting(false);
      setErrorMessage(error.message || "Transaction failed. Please try again.");
    }
  }, [isConfirming, isConfirmed, error]);

  const fetchSignals = async () => {
    setIsLoadingSignals(true);
    setSignalError("");

    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/nillion/data?schemaId=${process.env.NEXT_PUBLIC_NILLION_SCHEMA_ID}`
      );

      // Store the raw JSON response
      setRawJsonResponse(JSON.stringify(response.data, null, 2));

      if (response.data && response.data.result) {
        setSignals(response.data.result);
      } else {
        setSignals([]);
      }
    } catch (error) {
      console.error("Error fetching signals from Nillion:", error);
      setSignalError(
        "Failed to fetch signals from Nillion's Secret Vault. Please try again."
      );
    } finally {
      setIsLoadingSignals(false);
    }
  };

  const handleMint = async () => {
    if (!isConnected) {
      login();
      return;
    }

    if (chainId !== MONAD_CHAIN_ID) {
      switchChain({ chainId: MONAD_CHAIN_ID });
      return;
    }

    setErrorMessage("");
    setIsMinting(true);

    try {
      // Call mint function with 1 MON as payment
      await writeContractAsync({
        address: NFT_ACCESS_ADDRESS,
        abi,
        chainId: MONAD_CHAIN_ID,
        functionName: "mint",
        value: price, // 1 MON = 1 * 10^18 wei
      });
    } catch (err) {
      console.error("Mint error:", err);
      setIsMinting(false);
      setErrorMessage("Failed to start minting process. Please try again.");
    }
  };

  const handleSignalClick = (signal: Signal) => {
    setSelectedSignal(signal);
  };

  return (
    <div className="w-full min-h-screen bg-gray-50">
      <div className="w-full px-4 py-6">
        {/* Main info section - now full width */}
        <div className="flex flex-col items-center justify-center">
          {/* NFT Access Section - now full width with clearer agent messaging */}
          <div className="w-full">
            <div className="bg-white rounded-lg border border-gray-200 shadow-md overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg md:text-xl font-bold text-white">
                    🔒 Unlock Premium Agent Trading Signals
                  </h3>
                  <div className="hidden sm:flex items-center gap-1 bg-white rounded-lg p-2">
                    <span className="text-md text-violet-900">Powered by</span>
                    <Image
                      src="/nillion_full_brand_blue.png"
                      alt="Nillion"
                      width={64}
                      height={16}
                      className="ml-1"
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 md:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h4 className="text-lg font-semibold text-gray-800">
                      Agent Trading API Access NFT
                    </h4>
                    <p className="text-gray-600 mt-1">Mint price: 1 MON</p>
                  </div>
                  <div className="h-16 w-16 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
                    <span className="text-2xl text-white">🦍</span>
                  </div>
                </div>

                <div className="bg-indigo-50 p-4 rounded-lg mb-6">
                  <p className="text-indigo-800 font-medium">
                    Power your trading agents with exclusive Gorillionaire
                    signals
                  </p>
                  <p className="text-indigo-700 text-sm mt-1">
                    Feed our high-confidence signals directly to your autonomous
                    trading bots via our secure API, protected by Nillion
                    zero-knowledge encryption
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                  <div className="flex items-start">
                    <span className="text-green-500 mr-2 flex-shrink-0">✓</span>
                    <p className="text-gray-700">
                      Direct signal integration with your trading agents
                    </p>
                  </div>
                  <div className="flex items-start">
                    <span className="text-green-500 mr-2 flex-shrink-0">✓</span>
                    <p className="text-gray-700">
                      Agent-optimized API endpoints with confidence scores
                    </p>
                  </div>
                  <div className="flex items-start">
                    <span className="text-green-500 mr-2 flex-shrink-0">✓</span>
                    <p className="text-gray-700">
                      MEV-aware signal feeds for all tokens
                    </p>
                  </div>
                  <div className="flex items-start">
                    <span className="text-green-500 mr-2 flex-shrink-0">✓</span>
                    <p className="text-gray-700">
                      Agent performance boosting alpha strategies
                    </p>
                  </div>
                  <div className="flex items-start">
                    <span className="text-green-500 mr-2 flex-shrink-0">✓</span>
                    <p className="text-gray-700">
                      Nillion Secret Vault for encrypted signal storage
                    </p>
                  </div>
                  <div className="flex items-start">
                    <span className="text-green-500 mr-2 flex-shrink-0">✓</span>
                    <p className="text-gray-700">
                      Zero-knowledge access control via NFT verification
                    </p>
                  </div>
                </div>

                <div className="bg-gray-100 p-4 rounded-lg mb-6">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-yellow-400 rounded-full mr-2 flex-shrink-0"></div>
                    <p className="text-sm text-gray-700">
                      Join the{" "}
                      <span className="font-medium">Gorillionaires</span>{" "}
                      powering their agents with our Nillion-secured signals
                    </p>
                  </div>
                </div>

                {errorMessage && (
                  <div className="bg-red-100 border border-red-200 text-red-700 p-4 rounded-lg mb-6">
                    <div className="flex items-center">
                      <span className="text-xl mr-2 flex-shrink-0">⚠️</span>
                      <p>{errorMessage}</p>
                    </div>
                  </div>
                )}

                {mintSuccess ? (
                  <div className="bg-green-100 border border-green-200 text-green-700 p-4 rounded-lg mb-6">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <span className="text-xl mr-2 flex-shrink-0">✅</span>
                      <div>
                        <p className="font-medium">NFT Successfully Minted!</p>
                        <p className="text-sm">
                          Your trading agents now have access to premium signals
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={handleMint}
                    disabled={isMinting || hasNFT}
                    className={`w-full py-3 px-4 rounded-lg font-medium text-white ${
                      isMinting || hasNFT
                        ? "bg-gray-400"
                        : "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                    } transition-all duration-200 flex items-center justify-center`}
                  >
                    {!isConnected ? (
                      "Connect Wallet to Mint"
                    ) : isMinting ? (
                      <>
                        <svg
                          className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Minting...
                      </>
                    ) : hasNFT ? (
                      "You Already Own This NFT"
                    ) : chainId === MONAD_CHAIN_ID ? (
                      "Mint NFT to Fuel Your Trading Agents"
                    ) : (
                      "Switch to Monad chain to unlock access to signals"
                    )}
                  </button>
                )}

                {mintSuccess && (
                  <div className="mt-6">
                    <h5 className="font-medium text-gray-800 mb-2">
                      Your Schema ID
                    </h5>
                    <div className="bg-gray-100 p-3 rounded-lg flex items-center justify-between">
                      <code className="text-xs text-gray-600 truncate">
                        {process.env.NEXT_PUBLIC_NILLION_SCHEMA_ID}
                      </code>
                      <button
                        className="text-purple-600 hover:text-purple-800 flex-shrink-0 ml-2"
                        onClick={() => {
                          if (address) {
                            navigator.clipboard.writeText(address);
                          }
                        }}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                          />
                        </svg>
                      </button>
                    </div>

                    <div className="mt-4 bg-blue-50 p-3 rounded-lg">
                      <h6 className="font-medium text-blue-800 text-xs">
                        Integration Example:
                      </h6>
                      <div className="mt-2 bg-gray-800 text-gray-200 p-3 rounded max-w-full">
                        <pre className="whitespace-pre-wrap break-words overflow-x-auto">
                          <code className="block text-xs break-words">
                            {`// Connect your trading agent to our Nillion-secured signal API
const response = await fetch(
\`https://api.gorillionai.re/nillion/data?schemaId=\${process.env.YOUR_SCHEMA_ID}\`);
const signals = await response.json();

// Nillion's Secret Vault decrypts signals only for authorized agents
if (signals.data) {
  myTradingAgent.consumeSignals(signals.data);
} else {
  console.error('No signals data available');
}`}
                          </code>
                        </pre>
                      </div>
                    </div>

                    <div className="mt-4 bg-indigo-50 p-3 rounded-lg">
                      <h6 className="font-medium text-indigo-800 text-sm">
                        How Nillion Secures Your Trading Signals:
                      </h6>
                      <ul className="mt-2 space-y-2 text-sm text-indigo-700">
                        <li className="flex items-start">
                          <span className="text-indigo-500 mr-2 flex-shrink-0">
                            •
                          </span>
                          <p>
                            Signals are encrypted and distributed across Nillion
                            Secret Vault nodes
                          </p>
                        </li>
                        <li className="flex items-start">
                          <span className="text-indigo-500 mr-2 flex-shrink-0">
                            •
                          </span>
                          <p>
                            Zero-knowledge proofs verify your NFT ownership
                            without revealing your wallet
                          </p>
                        </li>
                        <li className="flex items-start">
                          <span className="text-indigo-500 mr-2 flex-shrink-0">
                            •
                          </span>
                          <p>
                            Signal content and event data are fully encrypted -
                            only timestamps remain in plain text
                          </p>
                        </li>
                      </ul>
                    </div>

                    {/* Nillion Signal Viewer */}
                    <div className="mt-6">
                      <div className="flex items-center justify-between mb-4">
                        <h5 className="font-medium text-gray-800">
                          Your Nillion-Protected Signals
                        </h5>
                        <button
                          onClick={fetchSignals}
                          className="px-3 py-1 text-sm bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 transition-colors"
                          disabled={isLoadingSignals}
                        >
                          {isLoadingSignals ? "Loading..." : "Refresh"}
                        </button>
                      </div>

                      {signalError && (
                        <div className="bg-red-50 p-3 rounded-lg mb-4 text-sm text-red-600">
                          {signalError}
                        </div>
                      )}

                      {isLoadingSignals ? (
                        <div className="flex items-center justify-center p-6 bg-gray-50 rounded-lg">
                          <svg
                            className="animate-spin h-6 w-6 text-indigo-600"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                          <span className="ml-2 text-gray-600">
                            Decrypting signals from Nillion Secret Vault...
                          </span>
                        </div>
                      ) : rawJsonResponse ? (
                        <div className="bg-gray-800 p-4 rounded-lg">
                          <div className="flex justify-between items-center mb-2">
                            <h6 className="text-white font-medium">
                              Raw JSON Response
                            </h6>
                            <button
                              onClick={() =>
                                navigator.clipboard.writeText(rawJsonResponse)
                              }
                              className="px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors"
                            >
                              Copy
                            </button>
                          </div>
                          <div className="overflow-x-auto">
                            <pre
                              className="text-green-400 text-sm whitespace-pre-wrap break-words"
                              style={{
                                maxHeight: "400px",
                                overflowY: "auto",
                                wordBreak: "break-all",
                                whiteSpace: "pre-wrap",
                              }}
                            >
                              <code>{rawJsonResponse}</code>
                            </pre>
                          </div>
                        </div>
                      ) : signals.length > 0 ? (
                        <div className="bg-white border border-gray-200 rounded-lg">
                          <div className="divide-y divide-gray-200">
                            {signals.map((signal) => (
                              <div
                                key={signal.id}
                                className={`p-3 cursor-pointer transition-colors ${
                                  selectedSignal?.id === signal.id
                                    ? "bg-indigo-50"
                                    : "hover:bg-gray-50"
                                }`}
                                onClick={() => handleSignalClick(signal)}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center">
                                    <div
                                      className={`h-2 w-2 rounded-full ${
                                        signal.confidence >= 80
                                          ? "bg-green-500"
                                          : signal.confidence >= 60
                                          ? "bg-yellow-500"
                                          : "bg-red-500"
                                      } mr-2`}
                                    ></div>
                                    <p className="font-medium text-gray-800">
                                      {signal.token || "Unknown Token"}
                                    </p>
                                  </div>
                                  <span
                                    className={`px-2 py-1 text-xs rounded-full ${
                                      signal.action === "BUY"
                                        ? "bg-green-100 text-green-800"
                                        : signal.action === "SELL"
                                        ? "bg-red-100 text-red-800"
                                        : "bg-blue-100 text-blue-800"
                                    }`}
                                  >
                                    {signal.action || "HOLD"}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                  {signal.text}
                                </p>
                                <div className="flex justify-between mt-2 text-xs text-gray-500">
                                  <span>Confidence: {signal.confidence}%</span>
                                  <span>
                                    {new Date(
                                      signal.timestamp
                                    ).toLocaleString()}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="bg-gray-50 p-4 rounded-lg text-center">
                          <p className="text-gray-600">
                            No signals found. Signals are generated and secured
                            by Nillion.
                          </p>
                        </div>
                      )}

                      {/* Selected Signal Detail View */}
                      {selectedSignal && (
                        <div className="mt-4 bg-white border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h6 className="font-medium text-gray-800">
                              Signal Details
                            </h6>
                            <span
                              className={`px-2 py-1 text-xs rounded-full ${
                                selectedSignal.action === "BUY"
                                  ? "bg-green-100 text-green-800"
                                  : selectedSignal.action === "SELL"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-blue-100 text-blue-800"
                              }`}
                            >
                              {selectedSignal.action || "HOLD"}
                            </span>
                          </div>

                          <div className="space-y-2">
                            <div>
                              <p className="text-xs text-gray-500">Token</p>
                              <p className="font-medium">
                                {selectedSignal.token || "Unknown Token"}
                              </p>
                            </div>

                            <div>
                              <p className="text-xs text-gray-500">Analysis</p>
                              <p className="text-sm">{selectedSignal.text}</p>
                            </div>

                            <div className="flex items-center">
                              <p className="text-xs text-gray-500 mr-2">
                                Confidence:
                              </p>
                              <div className="flex-1 bg-gray-200 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full ${
                                    selectedSignal.confidence >= 80
                                      ? "bg-green-500"
                                      : selectedSignal.confidence >= 60
                                      ? "bg-yellow-500"
                                      : "bg-red-500"
                                  }`}
                                  style={{
                                    width: `${selectedSignal.confidence}%`,
                                  }}
                                ></div>
                              </div>
                              <span className="ml-2 text-xs font-medium">
                                {selectedSignal.confidence}%
                              </span>
                            </div>

                            <div>
                              <p className="text-xs text-gray-500">
                                Generated at
                              </p>
                              <p className="text-sm">
                                {new Date(
                                  selectedSignal.timestamp
                                ).toLocaleString()}
                              </p>
                            </div>

                            <div className="pt-2 mt-2 border-t border-gray-100">
                              <p className="text-xs text-gray-500 flex items-center">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-3 w-3 mr-1"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                                  />
                                </svg>
                                Securely decrypted by Nillion Secret Vault
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-gray-200 p-4 bg-gray-50">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center text-sm text-gray-500">
                    <span className="mr-1">Powered by</span>
                    <span className="font-medium text-purple-600">
                      Monad 10,000 TPS Infrastructure & Nillion Secret Vault
                    </span>
                  </div>
                  <div className="flex items-center">
                    <div className="h-2 w-2 bg-green-500 rounded-full mr-1 flex-shrink-0"></div>
                    <span className="text-sm text-gray-600">
                      Live encrypted agent signals
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Nillion Security Explanation */}
            <div className="mt-8 bg-white rounded-lg border border-gray-200 shadow-md overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4">
                <h3 className="font-medium text-white flex items-center">
                  <Image
                    src="/nillion_full_brand_blue.png"
                    alt="Nillion"
                    width={64}
                    height={16}
                    className="mr-2 bg-white p-1 rounded"
                  />
                  Secure Signal Infrastructure
                </h3>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <h4 className="font-medium text-gray-800 mb-2">
                      1. Signal Generation
                    </h4>
                    <p className="text-sm text-gray-600">
                      Langchain&apos;s agent generates trading signals, which
                      are immediately encrypted and stored in Nillion&apos;s
                      Secret Vault.
                    </p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <h4 className="font-medium text-gray-800 mb-2">
                      2. Distributed Encryption
                    </h4>
                    <p className="text-sm text-gray-600">
                      Signals are fragmented and distributed across three nilDB
                      nodes, with each storing only encrypted fragments.
                    </p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <h4 className="font-medium text-gray-800 mb-2">
                      3. NFT-based Access
                    </h4>
                    <p className="text-sm text-gray-600">
                      Your NFT serves as the access key, allowing only your
                      trading agents to decrypt and utilize our alpha signals.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Mints Section - with agent language */}
            <div className="mt-8 bg-white rounded-lg border border-gray-200 shadow-md overflow-hidden">
              <div className="bg-gray-50 border-b border-gray-200 p-4">
                <h3 className="font-medium text-gray-700">
                  Recent Agent API Activations
                </h3>
              </div>
              {holders.length > 0 && (
                <div className="divide-y divide-gray-200">
                  {holders.map((holder, index) => (
                    <div
                      key={index}
                      className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2"
                    >
                      <div className="flex items-center">
                        <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 mr-3 flex-shrink-0">
                          🤖
                        </div>
                        <div className="overflow-hidden max-w-full">
                          <p className="text-sm font-medium text-gray-700 break-all">
                            {holder.nadName || holder.ownerAddress}
                          </p>
                        </div>
                      </div>
                      <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full sm:ml-2 flex-shrink-0">
                        Activated
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Agents;
