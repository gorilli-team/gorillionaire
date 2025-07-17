import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Token } from "@/app/types";
import { getTokenImage } from "@/app/utils/tokens";
import { useAccount, useSwitchChain } from "wagmi";
import { MONAD_CHAIN_ID } from "@/app/utils/constants";
import { usePrivy } from "@privy-io/react-auth";

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

interface DexModalV2Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (inputAmount: string) => void;
  token: Token;
  pairToken: Token;
  amount: number;
  type: "Buy" | "Sell";
  signalText?: string;
  confidenceScore?: string;
  eventSymbol?: string;
}

const DexModalV2: React.FC<DexModalV2Props> = ({
  isOpen,
  onClose,
  onConfirm,
  token,
  pairToken,
  amount,
  type,
  signalText = "",
  confidenceScore = "",
  eventSymbol = "",
}) => {
  const [inputAmount, setInputAmount] = useState<string>("");
  const [outputAmount, setOutputAmount] = useState<string>("0");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [tokenPrice, setTokenPrice] = useState<number>(0);
  const [pairTokenPrice, setPairTokenPrice] = useState<number>(0);
  const [priceLoading, setPriceLoading] = useState<boolean>(false);
  const [tokenBalance, setTokenBalance] = useState<number>(0);
  const [pairTokenBalance, setPairTokenBalance] = useState<number>(0);
  const [balanceLoading, setBalanceLoading] = useState<boolean>(false);
  const { chainId } = useAccount();
  const { switchChain } = useSwitchChain();
  const { user } = usePrivy();

  const mapSymbolForDisplay = (symbol: string): string => {
    return symbol === "WMON" ? "MON" : symbol;
  };

  const getTokenImageForDisplay = (symbol: string): string => {
    const displaySymbol = mapSymbolForDisplay(symbol);
    return getTokenImage(displaySymbol);
  };

  const getInputOutputTokens = () => {
    if (!eventSymbol) {
      // Fallback to original logic if no eventSymbol
      return {
        inputToken: { ...token, totalHolding: tokenBalance },
        outputToken: { ...pairToken, totalHolding: pairTokenBalance }
      };
    }

    const symbols = eventSymbol.split('/');
    const firstSymbol = symbols[0];
    const secondSymbol = symbols[1];
    
    if (type === "Buy") {
      const inputToken = secondSymbol === token.symbol ? 
        { ...token, totalHolding: tokenBalance } : 
        { ...pairToken, totalHolding: pairTokenBalance };
      const outputToken = firstSymbol === token.symbol ? 
        { ...token, totalHolding: tokenBalance } : 
        { ...pairToken, totalHolding: pairTokenBalance };
      return { inputToken, outputToken };
    } else {
      const inputToken = firstSymbol === token.symbol ? 
        { ...token, totalHolding: tokenBalance } : 
        { ...pairToken, totalHolding: pairTokenBalance };
      const outputToken = secondSymbol === token.symbol ? 
        { ...token, totalHolding: tokenBalance } : 
        { ...pairToken, totalHolding: pairTokenBalance };
      return { inputToken, outputToken };
    }
  };

  const { inputToken, outputToken } = getInputOutputTokens();

  // Fetch token balances using the same endpoint as the main signals page
  const fetchTokenBalances = useCallback(async () => {
    if (!user?.wallet?.address) return;
    
    setBalanceLoading(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/token/holders/user/${user.wallet.address}`
      );
      const data = await response.json();

      if (data.code === 0 && data.result && data.result.data && Array.isArray(data.result.data)) {
        data.result.data.forEach((tokenData: ApiTokenHolder) => {
          const balance = parseFloat(tokenData.balance);
          
          if (tokenData.symbol === token.symbol || (tokenData.symbol === "MON" && token.symbol === "WMON")) {
            setTokenBalance(balance);
          }
          if (tokenData.symbol === pairToken.symbol || (tokenData.symbol === "MON" && pairToken.symbol === "WMON")) {
            setPairTokenBalance(balance);
          }
        });
      }
    } catch (error) {
      console.error("Error fetching token balances:", error);
    } finally {
      setBalanceLoading(false);
    }
  }, [user?.wallet?.address, token.symbol, pairToken.symbol]);

  // Fetch oracle prices using the same endpoint as the main signals page
  const fetchOraclePrices = useCallback(async () => {
    if (!token || !pairToken) return;
    
    setPriceLoading(true);
    try {
      // Use the same endpoint as the main signals page
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/events/prices/latest`
      );
      const data = await response.json();

      if (data && data.data) {
        // Map symbols to handle WMON -> MON conversion
        const getSymbolForApi = (symbol: string) => {
          return symbol === "MON" ? "WMON" : symbol;
        };

        const tokenSymbolForApi = getSymbolForApi(token.symbol);
        const pairTokenSymbolForApi = getSymbolForApi(pairToken.symbol);

        // Find prices for both tokens
        const tokenPriceData = data.data.find(
          (item: { symbol: string; price: { price: number } }) =>
            item.symbol === tokenSymbolForApi
        );
        const pairTokenPriceData = data.data.find(
          (item: { symbol: string; price: { price: number } }) =>
            item.symbol === pairTokenSymbolForApi
        );

        setTokenPrice(tokenPriceData?.price?.price || 0);
        setPairTokenPrice(pairTokenPriceData?.price?.price || 0);
      } else {
        console.warn("Oracle price fetch failed, no data");
        setTokenPrice(0);
        setPairTokenPrice(0);
      }
    } catch (error) {
      console.error("Error fetching oracle prices:", error);
      setTokenPrice(0);
      setPairTokenPrice(0);
    } finally {
      setPriceLoading(false);
    }
  }, [token, pairToken]);

  const calculateInputForBuy = useCallback(async (targetAmount: number) => {
    setIsLoading(true);
    try {
      if (tokenPrice > 0 && pairTokenPrice > 0) {
        // Calculate based on oracle prices
        const usdValue = targetAmount * tokenPrice;
        const pairTokenNeeded = usdValue / pairTokenPrice;
        setInputAmount(pairTokenNeeded.toFixed(6));
      } else {
        // Wait for oracle prices to load
        setInputAmount("0");
      }
      setIsLoading(false);
    } catch (error) {
      console.error("Error calculating input amount:", error);
      setIsLoading(false);
    }
  }, [tokenPrice, pairTokenPrice]);

  const calculateOutputForSell = useCallback(async (sourceAmount: number) => {
    setIsLoading(true);
    try {
      if (tokenPrice > 0 && pairTokenPrice > 0) {
        // Calculate based on oracle prices
        const usdValue = sourceAmount * tokenPrice;
        const pairTokenReceived = usdValue / pairTokenPrice;
        setOutputAmount(pairTokenReceived.toFixed(6));
      } else {
        // Wait for oracle prices to load
        setOutputAmount("0");
      }
      setIsLoading(false);
    } catch (error) {
      console.error("Error calculating output amount:", error);
      setIsLoading(false);
    }
  }, [tokenPrice, pairTokenPrice]);

  useEffect(() => {
    if (isOpen) {
      fetchOraclePrices();
      fetchTokenBalances();
    }
  }, [isOpen, fetchOraclePrices, fetchTokenBalances]);

  useEffect(() => {
    if (isOpen && !priceLoading && !balanceLoading && tokenPrice > 0 && pairTokenPrice > 0) {
      // Start with empty fields - user decides what to trade
      setInputAmount("");
      setOutputAmount("");
    }
  }, [isOpen, priceLoading, balanceLoading, tokenPrice, pairTokenPrice]);

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      const amountToUse = type === "Buy" ? outputAmount : inputAmount;
      await onConfirm(amountToUse);
    } catch (error) {
      console.error("Error confirming trade:", error);
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^\d*\.?\d*$/.test(value)) {
      setInputAmount(value);
      if (value && type === "Sell") {
        calculateOutputForSell(parseFloat(value));
      } else if (value && type === "Buy") {
        if (tokenPrice > 0 && pairTokenPrice > 0) {
          // Use oracle prices
          const usdValue = parseFloat(value) * pairTokenPrice;
          const tokenAmount = usdValue / tokenPrice;
          setOutputAmount(tokenAmount.toFixed(6));
        } else {
          // Wait for oracle prices
          setOutputAmount("0");
        }
      } else {
        setOutputAmount("0");
      }
    }
  };

  const handleOutputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^\d*\.?\d*$/.test(value)) {
      setOutputAmount(value);
      if (value && type === "Buy") {
        if (tokenPrice > 0 && pairTokenPrice > 0) {
          // Use oracle prices
          const usdValue = parseFloat(value) * tokenPrice;
          const inputNeeded = usdValue / pairTokenPrice;
          setInputAmount(inputNeeded.toFixed(6));
        } else {
          // Wait for oracle prices
          setInputAmount("0");
        }
      } else if (value && type === "Sell") {
        if (tokenPrice > 0 && pairTokenPrice > 0) {
          // Use oracle prices
          const usdValue = parseFloat(value) * pairTokenPrice;
          const inputNeeded = usdValue / tokenPrice;
          setInputAmount(inputNeeded.toFixed(6));
        } else {
          // Wait for oracle prices
          setInputAmount("0");
        }
      } else {
        setInputAmount("0");
      }
    }
  };

  // Format a dollar amount to a nice string
  const formatUSD = (value: number) => {
    if (value >= 100) return `$${value.toFixed(2)}`;
    if (value >= 1) return `$${value.toFixed(3)}`;
    return `$${value.toFixed(4)}`;
  };

  if (!token || !token.symbol || !pairToken || !pairToken.symbol) {
    return null;
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 overflow-hidden">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-gray-900">
            {type === "Buy" ? "Buy" : "Sell"} {eventSymbol ? mapSymbolForDisplay(eventSymbol.split('/')[0]) : mapSymbolForDisplay(token.symbol)}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Signal Information */}
        {signalText && (
          <div className="bg-indigo-50 rounded-lg p-3 mb-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 mt-1">
                <div className="w-8 h-8 relative">
                  <Image
                    src={eventSymbol ? getTokenImageForDisplay(eventSymbol.split('/')[0]) : (token.imageUrl || getTokenImageForDisplay(token.symbol))}
                    alt={eventSymbol ? mapSymbolForDisplay(eventSymbol.split('/')[0]) : mapSymbolForDisplay(token.symbol)}
                    width={32}
                    height={32}
                    className="rounded-full"
                  />
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">
                  {type === "Buy" ? "Buy" : "Sell"} {eventSymbol ? mapSymbolForDisplay(eventSymbol.split('/')[0]) : mapSymbolForDisplay(token.symbol)} at {amount}
                </div>
                <div className="flex items-center mt-1 space-x-2">
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      type === "Buy"
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {type}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Market Information */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="bg-gray-50 rounded-lg p-2">
            <div className="text-xs text-gray-500">
              {mapSymbolForDisplay(token.symbol)} Price
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 mr-1 relative">
                <Image
                  src={token.imageUrl || getTokenImageForDisplay(token.symbol)}
                  alt={mapSymbolForDisplay(token.symbol)}
                  width={16}
                  height={16}
                  className="rounded-full"
                />
              </div>
              <div className="text-sm font-medium">
                {priceLoading ? "Loading..." : formatUSD(tokenPrice)}
              </div>
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-2">
            <div className="text-xs text-gray-500">
              {mapSymbolForDisplay(pairToken.symbol)} Price
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 mr-1 relative">
                <Image
                  src={pairToken.imageUrl || getTokenImageForDisplay(pairToken.symbol)}
                  alt={mapSymbolForDisplay(pairToken.symbol)}
                  width={16}
                  height={16}
                  className="rounded-full"
                />
              </div>
              <div className="text-sm font-medium">
                {priceLoading ? "Loading..." : formatUSD(pairTokenPrice)}
              </div>
            </div>
          </div>
        </div>

        {chainId !== MONAD_CHAIN_ID ? (
          <div className="text-center p-4 mb-4 bg-red-50 rounded-lg">
            <p className="text-red-600">
              Please switch to Monad network to continue
            </p>
            <button
              className="mt-2 px-4 py-2 bg-violet-600 text-white rounded-full text-sm"
              onClick={() => switchChain({ chainId: MONAD_CHAIN_ID })}
            >
              Switch to Monad
            </button>
          </div>
        ) : (
          <>
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-500">From</span>
                <span className="text-sm text-gray-500">
                  Balance: {inputToken.totalHolding ? inputToken.totalHolding.toFixed(4) : "0.0000"}
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={inputAmount}
                    onChange={handleInputChange}
                    className="w-full bg-transparent text-lg font-semibold focus:outline-none text-gray-900"
                    placeholder="0.0"
                  />
                  {inputAmount && (
                    <div className="text-xs text-gray-500 mt-1">
                      ≈ {formatUSD(parseFloat(inputAmount) * (inputToken.symbol === token.symbol ? tokenPrice : pairTokenPrice))}
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-2 bg-white rounded-full px-3 py-2 shadow-sm">
                  <div className="w-6 h-6 relative">
                    <Image
                      src={inputToken.imageUrl || getTokenImageForDisplay(inputToken.symbol)}
                      alt={mapSymbolForDisplay(inputToken.symbol)}
                      width={24}
                      height={24}
                      className="rounded-full"
                    />
                  </div>
                  <span className="font-medium">{mapSymbolForDisplay(inputToken.symbol)}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-center my-3">
              <div className="bg-gray-100 rounded-full p-1">
                <svg
                  className="w-5 h-5 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 14l-7 7m0 0l-7-7m7 7V3"
                  />
                </svg>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-500">To</span>
                <span className="text-sm text-gray-500">
                  {isLoading ? "Calculating..." : ""}
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={outputAmount}
                    onChange={handleOutputChange}
                    className="w-full bg-transparent text-lg font-semibold focus:outline-none text-gray-900"
                    placeholder="0.0"
                  />
                  {outputAmount && (
                    <div className="text-xs text-gray-500 mt-1">
                      ≈ {formatUSD(parseFloat(outputAmount) * (outputToken.symbol === token.symbol ? tokenPrice : pairTokenPrice))}
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-2 bg-white rounded-full px-3 py-2 shadow-sm">
                  <div className="w-6 h-6 relative">
                    <Image
                      src={outputToken.imageUrl || getTokenImageForDisplay(outputToken.symbol)}
                      alt={mapSymbolForDisplay(outputToken.symbol)}
                      width={24}
                      height={24}
                      className="rounded-full"
                    />
                  </div>
                  <span className="font-medium">{mapSymbolForDisplay(outputToken.symbol)}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col space-y-3 mb-5">
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>Rate</span>
                <span>
                  {tokenPrice > 0 && pairTokenPrice > 0 ? (
                    <>
                      1 {mapSymbolForDisplay(token.symbol)} = {(tokenPrice / pairTokenPrice).toFixed(6)} {mapSymbolForDisplay(pairToken.symbol)}
                    </>
                  ) : (
                    "Loading..."
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>Price Source</span>
                <span>Live Oracle</span>
              </div>

              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>Network</span>
                <span>Monad</span>
              </div>
            </div>

            <button
              onClick={handleConfirm}
              disabled={isLoading || priceLoading || balanceLoading || !inputAmount || parseFloat(inputAmount) <= 0 || parseFloat(inputAmount) > (inputToken.totalHolding || 0)}
              className={`w-full py-3 rounded-full font-medium text-white 
                ${
                  isLoading || priceLoading || balanceLoading || !inputAmount || parseFloat(inputAmount) <= 0 || parseFloat(inputAmount) > (inputToken.totalHolding || 0)
                    ? "bg-gray-400 cursor-not-allowed"
                    : type === "Buy"
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-red-600 hover:bg-red-700"
                }`}
            >
              {isLoading || priceLoading || balanceLoading
                ? "Loading..."
                : parseFloat(inputAmount) > (inputToken.totalHolding || 0)
                ? "Insufficient Balance"
                : `Confirm ${type === "Buy" ? "Buy" : "Sell"}`}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default DexModalV2;