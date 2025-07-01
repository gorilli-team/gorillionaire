"use client";

import React, { useCallback, useMemo, useState, useEffect } from "react";
import Sidebar from "@/app/components/sidebar";
import V2Layout from "@/app/components/layout/V2Layout";
import Header from "@/app/components/header";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { abi } from "../abi/early-nft";
import { toast } from "react-toastify";
import { MONAD_CHAIN_ID } from "../utils/constants";
import { usePrivy } from "@privy-io/react-auth";
import { UserService } from "../services/userService";

const V2Page = () => {
  const { address, isConnected } = useAccount();
  const { login } = usePrivy();
  const [selectedPage, setSelectedPage] = useState("V2");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { writeContract } = useWriteContract();

  const [v2Access, setV2Access] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

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

  const [chainId, setChainId] = useState<number | null>(null);

  const alreadyMinted = useMemo(() => (balanceData ?? 0) > 0, [balanceData]);

  // Check V2 access from user service
  useEffect(() => {
    const checkV2Access = async () => {
      if (address) {
        setLoading(true);
        try {
          const hasAccess = await UserService.checkV2Access(address);
          setV2Access(hasAccess);
        } catch (error) {
          console.error("Error checking V2 access:", error);
          setV2Access(false);
        } finally {
          setLoading(false);
        }
      } else {
        setV2Access(false);
        setLoading(false);
      }
    };

    checkV2Access();
  }, [address]);

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
  }, [
    writeContract,
    alreadyMinted,
    chainId,
    isConnected,
    login,
    firstNFT.address,
  ]);

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

  // If user has V2 access, use V2 layout and redirect to dashboard
  if (v2Access && !loading) {
    return (
      <V2Layout selectedPage={selectedPage} setSelectedPage={setSelectedPage}>
        <div className="w-full max-w-5xl mx-auto p-4 md:p-6">
          <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
            <div className="bg-gradient-to-r from-green-600 to-green-700 p-4">
              <div className="flex items-center gap-2">
                <span className="text-white text-2xl">✅</span>
                <h1 className="text-xl font-bold text-white">
                  V2 Access Granted
                </h1>
              </div>
            </div>
            <div className="p-6">
              <div className="flex flex-col-reverse md:flex-row gap-6">
                {/* V2 Access Details */}
                <div className="w-full md:w-1/2">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">
                        Access Status
                      </h3>
                      <p className="text-lg font-semibold text-green-600">
                        ✅ V2 Access Enabled
                      </p>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium text-gray-500">
                        User Address
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
                      <div className="bg-green-50 rounded-lg p-4">
                        <div className="flex items-center">
                          <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                          <p className="text-sm text-green-700">
                            You have V2 access! Welcome to Gorillionaire V2.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4">
                      <button
                        onClick={() => (window.location.href = "/v2/dashboard")}
                        className="w-full py-3 px-4 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 font-medium"
                      >
                        Go to V2 Dashboard
                      </button>
                    </div>
                  </div>
                </div>

                {/* V2 Logo */}
                <div className="w-full md:w-1/3">
                  <div className="aspect-square w-full bg-gradient-to-br from-green-100 to-blue-100 rounded-lg flex border-2 border-green-200 overflow-hidden items-center justify-center">
                    <div className="text-center">
                      <div className="text-6xl mb-4">🦍</div>
                      <h3 className="text-xl font-bold text-green-700">V2</h3>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </V2Layout>
    );
  }

  // Regular layout for non-V2 users
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
            {loading ? (
              <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
                <div className="p-6 text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Checking V2 access...</p>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
                {/* Purple gradient header */}
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
                    {/* Info Section */}
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
