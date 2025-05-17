import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Token } from "@/app/types";
import { getTokenImage } from "@/app/utils/tokens";
import { useAccount, useSwitchChain } from "wagmi";
import { MONAD_CHAIN_ID } from "@/app/utils/constants";

// Extend the Token type to include the properties we need
interface ExtendedToken extends Token {
  imageUrl?: string;
  totalHolding: number;
  price: number;
}

interface DexModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (inputAmount: string) => void;
  token: ExtendedToken;
  amount: number;
  type: "Buy" | "Sell";
  monBalance?: number;
  monPrice?: number;
  signalText?: string;
  confidenceScore?: string;
  sellPercentage?: number;
  onAmountChange?: (inputAmount: string, outputAmount: string) => void;
}

const DexModal: React.FC<DexModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  token,
  amount,
  type,
  monBalance = 0,
  monPrice = 0,
  signalText = "",
  confidenceScore = "",
  sellPercentage = 100,
  onAmountChange,
}) => {
  const [inputAmount, setInputAmount] = useState<string>("");
  const [outputAmount, setOutputAmount] = useState<string>("0");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { chainId } = useAccount();
  const { switchChain } = useSwitchChain();

  // Define MON token for buying, using the passed in balance and price
  const monToken: ExtendedToken = {
    symbol: "MON",
    name: "Monad",
    address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
    decimals: 18,
    totalHolding: monBalance,
    price: monPrice,
    imageUrl: getTokenImage("MON"),
  };

  // Get input and output tokens based on transaction type
  const inputToken = type === "Buy" ? monToken : token;
  const outputToken = type === "Buy" ? token : monToken;

  useEffect(() => {
    if (isOpen) {
      if (type === "Buy") {
        // For buy: set the target amount in the output and calculate MON needed
        // Calculate how much MON is needed for the requested amount
        const usdValue = amount * token.price;
        const monNeeded = usdValue / monPrice;
        const monNeededWithSlippage = monNeeded * 1.005;
        // If user can't afford the requested amount, cap to max possible
        if (monNeededWithSlippage > monBalance) {
          // Calculate max tokens user can buy with their MON balance
          const maxTokenAmount = (monBalance * monPrice) / token.price;
          const adjustedTokenAmount = maxTokenAmount * 0.995;
          setOutputAmount(adjustedTokenAmount.toFixed(6));
          calculateInputForBuy(adjustedTokenAmount);
        } else {
          setOutputAmount(amount.toString());
          calculateInputForBuy(amount);
        }
      } else {
        // For sell: calculate amount based on percentage of total holdings
        const sellAmount = (token.totalHolding * sellPercentage) / 100;
        setInputAmount(sellAmount.toString());
        calculateOutputForSell(sellAmount);
      }
    }
  }, [isOpen, type, token, amount, sellPercentage, monBalance, monPrice]); //eslint-disable-line

  const calculateInputForBuy = async (targetAmount: number) => {
    setIsLoading(true);
    try {
      // Calculate how much MON we need based on token price and MON price
      // First get the USD value of the tokens we want to buy
      const usdValue = targetAmount * token.price;
      // Then convert USD value to MON amount
      const monNeeded = usdValue / monPrice;

      // Add 0.5% slippage tolerance
      const monNeededWithSlippage = monNeeded * 1.005;

      setInputAmount(monNeededWithSlippage.toFixed(6));
      setIsLoading(false);
    } catch (error) {
      console.error("Error calculating input amount:", error);
      setIsLoading(false);
    }
  };

  const calculateOutputForSell = async (sourceAmount: number) => {
    setIsLoading(true);
    try {
      // Calculate how much MON we'll get based on token price and MON price
      // First get the USD value of the tokens we want to sell
      const usdValue = sourceAmount * token.price;
      // Then convert USD value to MON amount
      const monReceived = usdValue / monPrice;

      // Subtract 0.5% slippage tolerance
      const monReceivedWithSlippage = monReceived * 0.995;

      setOutputAmount(monReceivedWithSlippage.toFixed(6));
      setIsLoading(false);
    } catch (error) {
      console.error("Error calculating output amount:", error);
      setIsLoading(false);
    }
  };

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      // Pass the current input amount to the parent component
      if (type === "Buy") {
        await onConfirm(outputAmount);
      } else {
        await onConfirm(inputAmount);
      }
      // Close the modal after successful confirmation
      onClose();
    } catch (error) {
      console.error("Error confirming trade:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^\d*\.?\d*$/.test(value)) {
      // For sell orders, check if input amount exceeds total holdings
      if (type === "Sell" && parseFloat(value) > inputToken.totalHolding) {
        setInputAmount(inputToken.totalHolding.toString());
        calculateOutputForSell(inputToken.totalHolding);
        return;
      }
      setInputAmount(value);
      if (value && type === "Sell") {
        // For sell: user changes input (token amount), calculate MON output
        calculateOutputForSell(parseFloat(value));
      } else if (value && type === "Buy") {
        // For buy: user changes input (MON amount), calculate token output
        const usdValue = parseFloat(value) * monPrice;
        const tokenAmount = usdValue / token.price;
        const newOutputAmount = (tokenAmount * 0.995).toFixed(6); // Apply slippage
        setOutputAmount(newOutputAmount);
        onAmountChange?.(value, newOutputAmount);
      } else {
        setOutputAmount("0");
        onAmountChange?.(value, "0");
      }
    }
  };

  const handleOutputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^\d*\.?\d*$/.test(value)) {
      if (type === "Buy" && value) {
        // For buy: user changes output (token amount), calculate MON input
        const usdValue = parseFloat(value) * token.price;
        const monNeeded = usdValue / monPrice;
        const newInputAmount = (monNeeded * 1.005).toFixed(6); // Apply slippage
        // If calculated MON needed exceeds balance, cap to max possible
        if (parseFloat(newInputAmount) > inputToken.totalHolding) {
          const maxTokenAmount =
            (inputToken.totalHolding * monPrice) / token.price;
          const adjustedOutputAmount = (maxTokenAmount * 0.995).toFixed(6);
          setOutputAmount(adjustedOutputAmount);
          setInputAmount(inputToken.totalHolding.toString());
          onAmountChange?.(
            inputToken.totalHolding.toString(),
            adjustedOutputAmount
          );
          return;
        }
        setOutputAmount(value);
        setInputAmount(newInputAmount);
        onAmountChange?.(newInputAmount, value);
      } else if (value && type === "Sell") {
        // For sell: user changes output (MON amount), calculate token input
        const usdValue = parseFloat(value) * monPrice;
        const tokenAmount = usdValue / token.price;
        const newInputAmount = (tokenAmount * 1.005).toFixed(6); // Apply slippage
        // Check if calculated token amount exceeds balance
        if (parseFloat(newInputAmount) > inputToken.totalHolding) {
          const maxMonAmount =
            (inputToken.totalHolding * token.price) / monPrice;
          const adjustedOutputAmount = (maxMonAmount * 0.995).toFixed(6);
          setOutputAmount(adjustedOutputAmount);
          setInputAmount(inputToken.totalHolding.toString());
          onAmountChange?.(
            inputToken.totalHolding.toString(),
            adjustedOutputAmount
          );
          return;
        }
        setOutputAmount(value);
        setInputAmount(newInputAmount);
        onAmountChange?.(newInputAmount, value);
      } else {
        setOutputAmount(value);
        setInputAmount("0");
        onAmountChange?.("0", value);
      }
    }
  };

  // Format a dollar amount to a nice string with 2-4 decimals depending on value
  const formatUSD = (value: number) => {
    if (value >= 100) return `$${value.toFixed(2)}`;
    if (value >= 1) return `$${value.toFixed(3)}`;
    return `$${value.toFixed(4)}`;
  };

  // Map confidence score to risk level
  const mapConfidenceToRisk = (score: string) => {
    if (!score) return "Aggressive";
    const parsedScore = parseFloat(score);
    if (parsedScore >= 9) return "Conservative";
    if (parsedScore >= 8.5) return "Moderate";
    return "Aggressive";
  };

  // Determine risk tag color
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
                    src={token.imageUrl || ""}
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

        {/* Market Information */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="bg-gray-50 rounded-lg p-2">
            <div className="text-xs text-gray-500">Current Price</div>
            <div className="flex items-center">
              <div className="w-4 h-4 mr-1 relative">
                <Image
                  src={token.imageUrl || ""}
                  alt={token.symbol}
                  width={16}
                  height={16}
                  className="rounded-full"
                />
              </div>
              <div className="text-sm font-medium">
                {formatUSD(token.price)}
              </div>
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-2">
            <div className="text-xs text-gray-500">MON Price</div>
            <div className="flex items-center">
              <div className="w-4 h-4 mr-1 relative">
                <Image
                  src={getTokenImage("MON")}
                  alt="MON"
                  width={16}
                  height={16}
                  className="rounded-full"
                />
              </div>
              <div className="text-sm font-medium">{formatUSD(monPrice)}</div>
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
                  Balance: {inputToken.totalHolding.toFixed(4)}
                  {type === "Sell" && ` (${sellPercentage}% of holdings)`}
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={inputAmount}
                    onChange={handleInputChange}
                    disabled={type === "Buy"} // For buy orders, input is calculated
                    className={`w-full bg-transparent text-lg font-semibold focus:outline-none ${
                      type === "Buy" ? "text-gray-600" : "text-gray-900"
                    }`}
                    placeholder="0.0"
                  />
                  {type === "Buy" && inputAmount && (
                    <div className="text-xs text-gray-500 mt-1">
                      ≈ {formatUSD(parseFloat(inputAmount) * monPrice)}
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-2 bg-white rounded-full px-3 py-2 shadow-sm">
                  {inputToken.imageUrl && (
                    <div className="w-6 h-6 relative">
                      <Image
                        src={inputToken.imageUrl}
                        alt={inputToken.symbol}
                        width={24}
                        height={24}
                        className="rounded-full"
                      />
                    </div>
                  )}
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
                  {isLoading ? "Calculating..." : ""}
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={outputAmount}
                    onChange={handleOutputChange}
                    disabled={type === "Sell"} // For sell orders, output is calculated
                    className={`w-full bg-transparent text-lg font-semibold focus:outline-none ${
                      type === "Sell" ? "text-gray-600" : "text-gray-900"
                    }`}
                    placeholder="0.0"
                  />
                  {outputAmount && (
                    <div className="text-xs text-gray-500 mt-1">
                      ≈{" "}
                      {formatUSD(
                        parseFloat(outputAmount) *
                          (type === "Buy" ? token.price : monPrice)
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-2 bg-white rounded-full px-3 py-2 shadow-sm">
                  {outputToken.imageUrl && (
                    <div className="w-6 h-6 relative">
                      <Image
                        src={outputToken.imageUrl}
                        alt={outputToken.symbol}
                        width={24}
                        height={24}
                        className="rounded-full"
                      />
                    </div>
                  )}
                  <span className="font-medium">{outputToken.symbol}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col space-y-3 mb-5">
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>Rate</span>
                <span>
                  1 {type === "Buy" ? "MON" : token.symbol} ≈{" "}
                  {type === "Buy"
                    ? (monPrice / token.price).toFixed(6)
                    : (token.price / monPrice).toFixed(6)}{" "}
                  {type === "Buy" ? token.symbol : "MON"}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>Slippage Tolerance</span>
                <span>0.5%</span>
              </div>

              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>Fee</span>
                <span>0% - FREE FOOD NOW 🦍</span>
              </div>
            </div>

            <button
              onClick={handleConfirm}
              disabled={
                isLoading ||
                (type === "Buy" && parseFloat(inputAmount) > monBalance) ||
                (type === "Sell" &&
                  parseFloat(inputAmount) > inputToken.totalHolding)
              }
              className={`w-full py-3 rounded-full font-medium text-white 
                ${
                  isLoading ||
                  (type === "Buy" && parseFloat(inputAmount) > monBalance) ||
                  (type === "Sell" &&
                    parseFloat(inputAmount) > inputToken.totalHolding)
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-violet-600 hover:bg-violet-700"
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

export default DexModal;
