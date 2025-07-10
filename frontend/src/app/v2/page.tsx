"use client";

import React, { useCallback, useMemo, useState, useEffect } from "react";
import Sidebar from "@/app/components/sidebar";
import Header from "@/app/components/header";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { abi } from "../abi/early-nft";
import { toast } from "react-toastify";
import { MONAD_CHAIN_ID } from "../utils/constants";
import { usePrivy } from "@privy-io/react-auth";
import Image from "next/image";

const V2Page = () => {
  const { address, isConnected } = useAccount();
  const { login } = usePrivy();
  const [selectedPage, setSelectedPage] = useState("V2");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { writeContract } = useWriteContract();
  const [tokenId, setTokenId] = useState<number | null>(null);
  const [accessCode, setAccessCode] = useState<string>("");
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const [accessCodeUsed, setAccessCodeUsed] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // NFT Contract
  const firstNFT = {
    address: "0xD0f38A3Fb0F71e3d2B60e90327afde25618e1150" as `0x${string}`,
    name: "Early Gorilla",
    isMintable: true,
    endDate: new Date("2025-04-17"),
  };

  // Read NFT balance for the first contract
  const { data: balanceData } = useReadContract({
    abi,
    functionName: "balanceOf",
    address: firstNFT.address,
    args: [address || "0x0"],
  });

  // Read total supply for the first contract
  const { data: totalSupplyData } = useReadContract({
    abi,
    functionName: "nextTokenId",
    address: firstNFT.address,
  });

  // Read collection name for the first contract
  const { data: nameData } = useReadContract({
    abi,
    functionName: "name",
    address: firstNFT.address,
  });

  // Set token ID if user has NFT
  const effectiveTokenId = address && balanceData && balanceData > 0 ? 1 : null;

  const [chainId, setChainId] = useState<number | null>(null);

  const alreadyMinted = useMemo(() => (balanceData ?? 0) > 0, [balanceData]);

  // Effect to set token ID when balance changes
  useEffect(() => {
    if (alreadyMinted && effectiveTokenId) {
      setTokenId(Number(effectiveTokenId));
    }
  }, [alreadyMinted, effectiveTokenId]);

  // Check V2 access status
  useEffect(() => {
    const checkAccessStatus = async () => {
      if (!address) return;
      
      setIsLoading(true);
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/access/status/${address.toLowerCase()}`);
        const data = await response.json();
        
        if (data.success) {
          setIsAuthorized(data.v2Enabled);
          if (data.accessCodeUsed) {
            setAccessCodeUsed(data.accessCodeUsed);
          }
        }
      } catch (error) {
        console.error("Error checking access status:", error);
        toast.error("Error checking access status");
      } finally {
        setIsLoading(false);
      }
    };

    checkAccessStatus();
  }, [address]);

  // Handle access code verification
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!address) {
      toast.error("Please connect your wallet first");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/access/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          code: accessCode, 
          address: address.toLowerCase() 
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setIsAuthorized(true);
        setAccessCodeUsed(data.accessCodeUsed || "DIRECT_ACCESS");
        toast.success("Access verified successfully!");
      } else {
        toast.error(data.message || "Verification error");
      }
    } catch (error) {
      console.error("Error verifying access code:", error);
      toast.error("Server connection error");
    } finally {
      setIsLoading(false);
    }
  };

  const onClick = useCallback(async () => {
    if (alreadyMinted) return;

    // First, check if wallet is connected
    if (!isConnected) {
      login();
      return;
    }

    // Then check if we're on Monad network
    if (chainId === null) {
      toast.error("Unable to determine network. Please try again.", {
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

    // Proceed with minting
    writeContract({
      abi,
      functionName: "mint",
      address: firstNFT.address,
    });
  }, [writeContract, alreadyMinted, chainId, isConnected, login, firstNFT.address]);

  // Get the current chain ID
  useEffect(() => {
    const getChainId = async () => {
      if (typeof window !== "undefined" && window.ethereum) {
        try {
          const chainId = await window.ethereum.request({
            method: "eth_chainId",
          });
          setChainId(parseInt(chainId, 16));
        } catch (error) {
          console.error("Error getting chain ID:", error);
        }
      }
    };

    getChainId();

    // Listen for chain changes
    if (typeof window !== "undefined" && window.ethereum) {
      window.ethereum.on("chainChanged", (chainId: string) => {
        setChainId(parseInt(chainId, 16));
      });
    }

    return () => {
      if (typeof window !== "undefined" && window.ethereum) {
        window.ethereum.removeListener("chainChanged", () => {});
      }
    };
  }, []);

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
        <div className="flex-1 overflow-y-auto">
          <div className="w-full max-w-5xl mx-auto p-4 md:p-6">
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
              </div>
            ) : alreadyMinted && tokenId !== null ? (
              <>
                <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
                  <div className="bg-gradient-to-r from-purple-600 to-purple-700 p-4">
                    <div className="flex items-center gap-2">
                      <span className="text-white text-2xl">🎫</span>
                      <h1 className="text-xl font-bold text-white">
                        Your V2 Access NFT
                      </h1>
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="flex flex-col-reverse md:flex-row gap-6">
                      {/* NFT Details */}
                      <div className="w-full md:w-1/2">
                        <div className="space-y-4">
                          <div>
                            <h3 className="text-sm font-medium text-gray-500">
                              Collection
                            </h3>
                            <p className="text-lg font-semibold">
                              {nameData || "Gorillionaire V2"}
                            </p>
                            <a
                              href="https://testnet.monadexplorer.com/address/0xD0f38A3Fb0F71e3d2B60e90327afde25618e1150"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-purple-600 hover:text-purple-700 underline"
                            >
                              View on Explorer
                            </a>
                          </div>

                          <div>
                            <h3 className="text-sm font-medium text-gray-500">
                              Token ID
                            </h3>
                            <p className="text-lg font-semibold">
                              #{tokenId} <span className="text-gray-400">OF</span>{" "}
                              #{totalSupplyData ? Number(totalSupplyData) : "..."}
                            </p>
                          </div>

                          <div>
                            <h3 className="text-sm font-medium text-gray-500">
                              Owner
                            </h3>
                            <a
                              href={`https://testnet.monadexplorer.com/address/${address}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-lg font-medium text-purple-600 hover:text-purple-700 truncate block"
                            >
                              {address}
                            </a>
                          </div>

                          <div className="pt-4">
                            <div className="bg-purple-50 rounded-lg p-4">
                              <div className="flex items-center">
                                <div className="w-2 h-2 bg-purple-400 rounded-full mr-2"></div>
                                <p className="text-sm text-purple-700">
                                  You are on the V2 waitlist! Stay tuned for
                                  updates.
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* NFT Image */}
                      <div className="w-full md:w-1/3">
                        <div className="aspect-square w-full bg-gradient-to-br from-purple-100 to-indigo-100 rounded-lg flex border-2 border-purple-200 overflow-hidden">
                          <Image
                            src="/earlygorilla.jpg"
                            alt="Your V2 Access NFT"
                            width={800}
                            height={800}
                            className="w-full h-full object-cover"
                            priority
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Access Code Section */}
                <div className="max-w-7xl w-full mx-auto flex flex-col md:flex-row gap-8 mb-6">
                  {!isAuthorized ? (
                    <>
                      <div className="flex-1 bg-white rounded-xl shadow-lg p-6">
                        <div className="text-center mb-8">
                          <h2 className="text-xl font-bold text-gray-900">
                            Have an access code?
                          </h2>
                          <p>Enter it below to get immediate access to V2</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                          <div>
                            <label
                              htmlFor="accessCode"
                              className="block text-sm font-medium text-gray-700 mb-2"
                            >
                              V2 Access Code
                            </label>
                            <input
                              type="text"
                              id="accessCode"
                              value={accessCode}
                              onChange={(e) => setAccessCode(e.target.value)}
                              placeholder="Enter your access code"
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
                              disabled={isLoading}
                            />
                          </div>

                          <button
                            type="submit"
                            className={`w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 px-4 rounded-lg font-medium hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                            disabled={isLoading}
                          >
                            {isLoading ? 'Verifying...' : 'Verify Access'}
                          </button>
                        </form>
                      </div>

                      <div className="flex-1 bg-white rounded-xl shadow-lg p-6">
                        <h3 className="font-semibold text-lg mb-2">
                          Didn&apos;t get your access code yet?
                        </h3>
                        <p className="text-gray-600 mb-4">
                          Follow these simple steps to be among the first users to get
                          access to Gorillionaire V2
                        </p>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between bg-gray-50 rounded-md px-4 py-3">
                            <div className="flex items-center gap-3">
                              <span className="w-6 h-6 flex items-center justify-center rounded-full bg-purple-100 text-purple-600 font-bold">
                                1
                              </span>
                              <span>Join our Discord Server</span>
                            </div>
                            <a
                              href="https://discord.gg/yYtgzHywRF"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-4 py-1 border border-purple-500 text-purple-600 rounded-md font-medium hover:bg-purple-50 transition text-sm w-24 text-center"
                            >
                              Join Server
                            </a>
                          </div>
                          <div className="flex items-center justify-between bg-gray-50 rounded-md px-4 py-3">
                            <div className="flex items-center gap-3">
                              <span className="w-6 h-6 flex items-center justify-center rounded-full bg-purple-100 text-purple-600 font-bold">
                                2
                              </span>
                              <span>
                                Drop your wallet address in the &quot;V2 Shortlist&quot; channel
                              </span>
                            </div>
                            <a
                              href="https://discord.gg/yYtgzHywRF"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-4 py-1 border border-purple-500 text-purple-600 rounded-md font-medium hover:bg-purple-50 transition text-sm w-24 text-center"
                            >
                              Drop It
                            </a>
                          </div>
                          <div className="flex items-center justify-between bg-gray-50 rounded-md px-4 py-3">
                            <div className="flex items-center gap-3">
                              <span className="w-6 h-6 flex items-center justify-center rounded-full bg-purple-100 text-purple-600 font-bold">
                                3
                              </span>
                              <span>Redeem your code and start using Gorillionaire V2!</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="w-full bg-white rounded-xl shadow-lg p-6">
                      <div className="text-center p-8">
                        <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
                          <span className="text-3xl">🎉</span>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">
                          Welcome to Gorillionaire V2!
                        </h2>
                        <p className="text-gray-600 mb-6">
                          You now have full access to all V2 features and benefits.
                        </p>
                        <button
                          onClick={() => {
                            // Add navigation to V2 features here
                          }}
                          className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-2 px-6 rounded-lg font-medium hover:from-purple-700 hover:to-indigo-700 transition-all duration-200"
                        >
                          Explore V2 Features
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
                <div className="bg-gradient-to-r from-purple-600 to-purple-700 p-4">
                  <div className="flex items-center gap-2">
                    <span className="text-white text-2xl">🦍</span>
                    <h1 className="text-xl font-bold text-white">
                      Gorillionaire V2 - Coming Soon
                    </h1>
                  </div>
                </div>

                <div className="p-6">
                  <div className="flex flex-col-reverse md:flex-row gap-6">
                    <div className="w-full">
                      <div className="bg-indigo-50 p-4 rounded-lg mb-6">
                        <p className="text-indigo-800 font-medium">
                          We are working hard on bringing you an even better
                          Gorillionaire experience
                        </p>
                        <p className="text-indigo-700 text-sm mt-1">
                          Stay tuned for updates and secure your spot in our
                          exclusive waiting list
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-2xl">📈</span>
                            <h3 className="font-medium text-lg">
                              Enhanced Signals
                            </h3>
                          </div>
                          <p className="text-gray-600">
                            More accurate and timely trading signals with
                            advanced analytics
                          </p>
                        </div>

                        <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-2xl">✨</span>
                            <h3 className="font-medium text-lg">Improved UI</h3>
                          </div>
                          <p className="text-gray-600">
                            Better user experience and interface with modern
                            design
                          </p>
                        </div>

                        <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-2xl">🚀</span>
                            <h3 className="font-medium text-lg">
                              New Features
                            </h3>
                          </div>
                          <p className="text-gray-600">
                            Exciting new capabilities for traders and enhanced
                            tools
                          </p>
                        </div>

                        <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-2xl">⚡️</span>
                            <h3 className="font-medium text-lg">Performance</h3>
                          </div>
                          <p className="text-gray-600">
                            Faster and more reliable platform with optimized
                            infrastructure
                          </p>
                        </div>
                      </div>

                      <div className="bg-gray-100 p-4 rounded-lg mt-6">
                        <div className="flex items-center">
                          <div className="w-2 h-2 bg-yellow-400 rounded-full mr-2"></div>
                          <p className="text-sm text-gray-700">
                            Join the{" "}
                            <span className="font-medium">Gorillionaires</span>{" "}
                            waiting list by minting your NFT
                          </p>
                        </div>
                      </div>

                      <div className="mt-6 flex justify-center">
                        <button
                          onClick={onClick}
                          disabled={alreadyMinted}
                          className={`w-full py-3 px-4 rounded-lg font-medium text-white ${
                            alreadyMinted || !isConnected
                              ? "bg-gray-400"
                              : "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                          } transition-all duration-200 flex items-center justify-center`}
                        >
                          {!isConnected
                            ? "Connect Wallet to Mint"
                            : alreadyMinted
                            ? "NFT Minted"
                            : "Mint NFT to Join Waitlist"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default V2Page;