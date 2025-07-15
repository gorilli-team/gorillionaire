import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Token } from "@/app/types";
import { getTokenImage } from "@/app/utils/tokens";
import { useAccount, useSwitchChain } from "wagmi";
import { MONAD_CHAIN_ID } from "@/app/utils/constants";

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
}) => {
  const [inputAmount, setInputAmount] = useState<string>("");
  const [outputAmount, setOutputAmount] = useState<string>("0");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { chainId } = useAccount();
  const { switchChain } = useSwitchChain();

  const inputToken = type === "Buy" ? pairToken : token; 
  const outputToken = type === "Buy" ? token : pairToken;

  const calculateInputForBuy = useCallback(async (targetAmount: number) => {
    setIsLoading(true);
    try {
      const estimatedInput = targetAmount * amount;
      setInputAmount(estimatedInput.toFixed(6));
      setIsLoading(false);
    } catch (error) {
      console.error("Error calculating input amount:", error);
      setIsLoading(false);
    }
  }, [amount]);

  const calculateOutputForSell = useCallback(async (sourceAmount: number) => {
    setIsLoading(true);
    try {
      const estimatedOutput = sourceAmount * amount;
      setOutputAmount(estimatedOutput.toFixed(6));
      setIsLoading(false);
    } catch (error) {
      console.error("Error calculating output amount:", error);
      setIsLoading(false);
    }
  }, [amount]);

  useEffect(() => {
    if (isOpen) {
      if (type === "Buy") {
        setOutputAmount(amount.toString());
        calculateInputForBuy(amount);
      } else {
        setInputAmount(amount.toString());
        calculateOutputForSell(amount);
      }
    }
  }, [isOpen, type, token, pairToken, amount, calculateInputForBuy, calculateOutputForSell]);

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
        const tokenAmount = parseFloat(value) / amount;
        setOutputAmount(tokenAmount.toFixed(6));
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
        const inputNeeded = parseFloat(value) * amount;
        setInputAmount(inputNeeded.toFixed(6));
      } else if (value && type === "Sell") {
        const inputNeeded = parseFloat(value) / amount;
        setInputAmount(inputNeeded.toFixed(6));
      } else {
        setInputAmount("0");
      }
    }
  };

  const mapConfidenceToRisk = (score: string) => {
    if (!score) return "Aggressive";
    const parsedScore = parseFloat(score);
    if (parsedScore >= 9) return "Conservative";
    if (parsedScore >= 8.5) return "Moderate";
    return "Aggressive";
  };

  const getRiskTagColor = (risk: string) => {
    switch (risk) {
      case "Conservative":
        return "bg-green-100 text-green-800";
      case "Moderate":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-red-100 text-red-800";
    }
  };

  if (!token || !token.symbol || !pairToken || !pairToken.symbol) {
    console.error("Invalid tokens passed to DexModalV2:", { token, pairToken });
    return null;
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 overflow-hidden">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-gray-900">
            {type === "Buy" ? "Buy" : "Sell"} {token.symbol}
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
                    src={token.imageUrl || getTokenImage(token.symbol)}
                    alt={token.symbol}
                    width={32}
                    height={32}
                    className="rounded-full"
                  />
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">
                  {signalText}
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
                  {confidenceScore && (
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${getRiskTagColor(
                        mapConfidenceToRisk(confidenceScore)
                      )}`}
                    >
                      {mapConfidenceToRisk(confidenceScore)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Trading Pair Information */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="bg-gray-50 rounded-lg p-2">
            <div className="text-xs text-gray-500">{token.symbol} Price</div>
            <div className="flex items-center">
              <div className="w-4 h-4 mr-1 relative">
                <Image
                  src={token.imageUrl || getTokenImage(token.symbol)}
                  alt={token.symbol}
                  width={16}
                  height={16}
                  className="rounded-full"
                />
              </div>
              <div className="text-sm font-medium">
                {amount.toFixed(6)} {pairToken.symbol}
              </div>
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-2">
            <div className="text-xs text-gray-500">Trading Pair</div>
            <div className="flex items-center">
              <div className="text-sm font-medium">
                {token.symbol}/{pairToken.symbol}
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
                  {inputToken.symbol}
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
                </div>
                <div className="flex items-center space-x-2 bg-white rounded-full px-3 py-2 shadow-sm">
                  <div className="w-6 h-6 relative">
                    <Image
                      src={inputToken.imageUrl || getTokenImage(inputToken.symbol)}
                      alt={inputToken.symbol}
                      width={24}
                      height={24}
                      className="rounded-full"
                    />
                  </div>
                  <span className="font-medium">{inputToken.symbol}</span>
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
                  {outputToken.symbol}
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
                </div>
                <div className="flex items-center space-x-2 bg-white rounded-full px-3 py-2 shadow-sm">
                  <div className="w-6 h-6 relative">
                    <Image
                      src={outputToken.imageUrl || getTokenImage(outputToken.symbol)}
                      alt={outputToken.symbol}
                      width={24}
                      height={24}
                      className="rounded-full"
                    />
                  </div>
                  <span className="font-medium">{outputToken.symbol}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col space-y-3 mb-5">
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>Rate</span>
                <span>
                  1 {token.symbol} = {amount.toFixed(6)} {pairToken.symbol}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>Network</span>
                <span>Monad</span>
              </div>
            </div>

            <button
              onClick={handleConfirm}
              disabled={isLoading || !inputAmount || parseFloat(inputAmount) <= 0}
              className={`w-full py-3 rounded-full font-medium text-white 
                ${
                  isLoading || !inputAmount || parseFloat(inputAmount) <= 0
                    ? "bg-gray-400 cursor-not-allowed"
                    : type === "Buy"
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-red-600 hover:bg-red-700"
                }`}
            >
              {isLoading
                ? "Loading..."
                : `Confirm ${type === "Buy" ? "Buy" : "Sell"}`}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default DexModalV2;