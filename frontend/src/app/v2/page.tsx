"use client";

import React, { useCallback, useMemo, useState, useEffect } from "react";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { abi } from "../abi/early-nft";
import { toast } from "react-toastify";
import { MONAD_CHAIN_ID } from "../utils/constants";
import { usePrivy } from "@privy-io/react-auth";
import Image from "next/image";

const V2Page = () => {
  const { address, isConnected } = useAccount();
  const { login } = usePrivy();
  const { writeContract } = useWriteContract();
  const [tokenId, setTokenId] = useState<number | null>(null);

  // NFT Contract
  const firstNFT = useMemo(() => ({
    address: "0xD0f38A3Fb0F71e3d2B60e90327afde25618e1150" as `0x${string}`,
    name: "Early Gorilla",
    isMintable: true,
    endDate: new Date("2025-04-17"),
  }), []);

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

  console.log("effectiveTokenId", effectiveTokenId);

  const [chainId, setChainId] = useState<number | null>(null);

  const alreadyMinted = useMemo(() => (balanceData ?? 0) > 0, [balanceData]);

  // Effect to set token ID when balance changes
  useEffect(() => {
    if (alreadyMinted && effectiveTokenId) {
      setTokenId(Number(effectiveTokenId));
    }
  }, [alreadyMinted, effectiveTokenId]);

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
  }, [writeContract, alreadyMinted, chainId, isConnected, login, firstNFT]);

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
    <div className="flex-1 overflow-y-auto">
      <div className="w-full max-w-5xl mx-auto p-4 md:p-6">
        {alreadyMinted && tokenId !== null ? (
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
                        #{tokenId} <span className="text-gray-400">OF</span> #
                        {totalSupplyData ? Number(totalSupplyData) : "..."}
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
                            You are on the V2 waitlist! Stay tuned for updates.
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
                        More accurate and timely trading signals with advanced
                        analytics
                      </p>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">✨</span>
                        <h3 className="font-medium text-lg">Improved UI</h3>
                      </div>
                      <p className="text-gray-600">
                        Better user experience and interface with modern design
                      </p>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">🚀</span>
                        <h3 className="font-medium text-lg">New Features</h3>
                      </div>
                      <p className="text-gray-600">
                        Exciting new capabilities for traders and enhanced tools
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
  );
};

export default V2Page;
