"use client";

import React from "react";
import Sidebar from "@/app/components/sidebar";
import Header from "@/app/components/header";
import ProtectPage from "@/app/components/protect-page/index";
import { useRouter } from "next/navigation";
import { useState, useCallback, useEffect } from "react";
import { apiClient } from "@/app/services/api";
import { ENDPOINTS } from "@/app/const/Endpoints";
import { getTimeAgo } from "@/app/utils/time";
import { useSSE } from "@/app/hooks/useSSE";
import { Pagination } from "flowbite-react";
import { usePrivy } from "@privy-io/react-auth";
import { useAccount, useSwitchChain } from "wagmi";
import { Token } from "@/app/types";
import { getTokenImage } from "@/app/utils/tokens";
import { MONAD_CHAIN_ID } from "@/app/utils/constants";
import { toast } from "react-toastify";
import Cookies from 'js-cookie';
import DexModalV2 from "@/app/components/ui/DexModalV2";
import {
  useWriteContract,
  useConfig,
  useSignTypedData,
  useSendTransaction,
} from "wagmi";
import { waitForTransactionReceipt } from "wagmi/actions";
import { concat, erc20Abi, numberToHex, parseUnits, size } from "viem";
import {
  MON_ADDRESS,
  PERMIT2_ADDRESS,
  WMONAD_ADDRESS,
} from "@/app/utils/constants";

type Signal = {
  id: string;
  name: string;
  timeframe: string;
  description: string;
};

type Event = {
  id: string;
  token_id: string;
  signal_id: string;
  signal_name: string;
  currency: string;
  action: string;
  symbol: string;
  price: number;
  timestamp: string;
};

type ChartData = {
  timestamp: string;
  price: number;
};

type TokenData = {
  token_id: string;
  symbol: string;
  name: string;
  decimal: string;
};

const chart = (data: ChartData[]) => {
  if (!data || data.length === 0) {
    return (
      <div className="w-24 h-8 bg-gray-50 rounded flex items-center justify-center text-gray-400 text-xs">
        No data
      </div>
    );
  }

  const prices = data.map((d) => d.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice;

  const width = 100;
  const height = 40;
  const padding = 4;

  const points = data
    .map((d, i) => {
      const x = (i / (data.length - 1)) * (width - padding * 2) + padding;
      const y =
        height -
        padding -
        ((d.price - minPrice) / priceRange) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");

  const firstPoint = points.split(" ")[0];
  const lastPoint = points.split(" ")[points.split(" ").length - 1];
  const areaPath = `M ${firstPoint} L ${points} L ${lastPoint.split(",")[0]},${
    height - padding
  } L ${firstPoint.split(",")[0]},${height - padding} Z`;

  const firstPrice = data[0].price;
  const lastPrice = data[data.length - 1].price;
  const isPositive = lastPrice >= firstPrice;
  const lineColor = isPositive ? "#22c55e" : "#ef4444";
  const fillColor = isPositive
    ? "rgba(34, 197, 94, 0.1)"
    : "rgba(239, 68, 68, 0.1)";

  return (
    <div className="w-24 h-8">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <path d={areaPath} fill={fillColor} />
        <polyline
          points={points}
          fill="none"
          stroke={lineColor}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};

export default function SignalsPage() {
  const router = useRouter();
  const [selectedPage, setSelectedPage] = useState("V2");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [signals, setSignals] = useState<Map<string, Signal>>(new Map());
  const [tokens, setTokens] = useState<Map<string, Token>>(new Map());
  const [events, setEvents] = useState<Event[]>([]);
  const [latestEventId, setLatestEventId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 15;
  const [charts, setCharts] = useState<Map<string, ChartData[]>>(new Map());
  const { user } = usePrivy();
  const { chainId } = useAccount();
  const { switchChain } = useSwitchChain();

  const { writeContractAsync } = useWriteContract();
  const { signTypedDataAsync } = useSignTypedData();
  const { sendTransactionAsync } = useSendTransaction();
  const wagmiConfig = useConfig();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentDexToken, setCurrentDexToken] = useState<Token | null>(null);
  const [currentDexPairToken, setCurrentDexPairToken] = useState<Token | null>(null);
  const [currentDexAmount, setCurrentDexAmount] = useState(0);
  const [currentDexType, setCurrentDexType] = useState<"Buy" | "Sell">("Buy");
  const [currentSignalId, setCurrentSignalId] = useState<string>("");
  const [currentEvent, setCurrentEvent] = useState<Event | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const allowedTokens = ['MON', 'DAK', 'YAKI', 'CHOG'];
  const [currentTradeInfo, setCurrentTradeInfo] = useState<{token: Token; apiType: string} | null>(null);

  const filterAllowedTokens = (event: Event) => {
    const symbols = event.symbol.split('/');
    return symbols.some(symbol => allowedTokens.includes(symbol.toUpperCase()));
  };

  const filteredEvents = events.filter(filterAllowedTokens);

  const getTokensFromSymbol = useCallback((symbol: string): Token[] => {
    const symbols = symbol.split("/");
    const validTokens: Token[] = [];
    
    const hardcodedTokens: Record<string, Partial<Token>> = {
      "MON": {
        symbol: "MON",
        name: "Monad",
        decimals: 18,
        address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
        chainId: MONAD_CHAIN_ID,
      },
      "DAK": {
        symbol: "DAK",
        name: "Molandak",
        decimals: 18,
        address: "0x0F0BDEbF0F83cD1EE3974779Bcb7315f9808c714",
        chainId: MONAD_CHAIN_ID,
      },
      "YAKI": {
        symbol: "YAKI",
        name: "Moyaki",
        decimals: 18,
        address: "0xfe140e1dCe99Be9F4F15d657CD9b7BF622270C50",
        chainId: MONAD_CHAIN_ID,
      },
      "CHOG": {
        symbol: "CHOG",
        name: "Chog",
        decimals: 18,
        address: "0xE0590015A873bF326bd645c3E1266d4db41C4E6B",
        chainId: MONAD_CHAIN_ID,
      },
      "WMON": {
        symbol: "MON",
        name: "Monad",
        decimals: 18,
        address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
        chainId: MONAD_CHAIN_ID,
      },
      "JAI": {
        symbol: "JAI",
        name: "Jai Token",
        decimals: 18,
        address: "0x0000000000000000000000000000000000000000",
        chainId: MONAD_CHAIN_ID,
      },
      "WETH": {
        symbol: "WETH",
        name: "Wrapped Ethereum",
        decimals: 18,
        address: "0x0000000000000000000000000000000000000000",
        chainId: MONAD_CHAIN_ID,
      },
      "USDC": {
        symbol: "USDC",
        name: "USD Coin",
        decimals: 6,
        address: "0x0000000000000000000000000000000000000000",
        chainId: MONAD_CHAIN_ID,
      },
    };
    
    symbols.forEach((sym) => {
      const token = tokens.get(sym);
      if (token) {
        validTokens.push(token);
      } else {
        console.warn(`Token not found in API: ${sym}, using hardcoded`);
        const hardcoded = hardcodedTokens[sym.toUpperCase()];
        
        if (hardcoded) {
          validTokens.push({
            symbol: hardcoded.symbol!,
            name: hardcoded.name!,
            decimals: hardcoded.decimals!,
            address: hardcoded.address!,
            chainId: hardcoded.chainId!,
            totalHolding: 0,
            price: 0,
            imageUrl: getTokenImage(hardcoded.symbol!),
          });
        } else {
          validTokens.push({
            symbol: sym,
            name: sym,
            decimals: 18,
            address: "0x0000000000000000000000000000000000000000" as `0x${string}`,
            chainId: MONAD_CHAIN_ID,
            totalHolding: 0,
            price: 0,
            imageUrl: getTokenImage(sym),
          });
        }
      }
    });
    
    return validTokens;
  }, [tokens]);

  const mapSymbolForDisplay = (symbol: string): string => {
    return symbol.replace(/WMON/g, "MON");
  };

  const getTokenToTrade = useCallback((event: Event): { token: Token; apiType: string } | null => {
    const symbols = event.symbol.split('/');
    const firstToken = symbols[0];
    const secondToken = symbols[1];
    
    const tokensFromSymbol = getTokensFromSymbol(event.symbol);

    if (firstToken === "MON" || firstToken === "WMON") {
      if (event.action === "BUY") {
        const tokenToTrade = tokensFromSymbol.find(t => 
          t.symbol === secondToken || 
          (secondToken === "WMON" && t.symbol === "MON")
        );
        return tokenToTrade ? { token: tokenToTrade, apiType: "sell" } : null;
      } else {
        const tokenToTrade = tokensFromSymbol.find(t => 
          t.symbol === secondToken || 
          (secondToken === "WMON" && t.symbol === "MON")
        );
        return tokenToTrade ? { token: tokenToTrade, apiType: "buy" } : null;
      }
    }
    return null;
  }, [getTokensFromSymbol]);

  const onYes = useCallback(
    async (tokenToTrade: Token, pairToken: Token, amount: number, type: "Buy" | "Sell") => {
      if (!user?.wallet?.address) {
        toast.error("Please connect your wallet");
        return;
      }

      if (chainId !== MONAD_CHAIN_ID) {
        toast.error("Please switch to Monad network to continue");
        return;
      }

      setCurrentDexToken(tokenToTrade);
      setCurrentDexPairToken(pairToken);
      setCurrentDexAmount(amount);
      setCurrentDexType(type);
      setIsModalOpen(true);
    },
    [user?.wallet?.address, chainId]
  );

  const onNo = useCallback(async (signalId: string, event: Event) => {
    if (!user?.wallet?.address) {
      toast.error("Please connect your wallet");
      return;
    }

    const privyToken = Cookies.get("privy-token");
    if (!privyToken) {
      toast.error("Authentication required");
      return;
    }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/signals/generated-signals/user-signal-v2`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${privyToken}`,
          },
          body: JSON.stringify({
            userAddress: user?.wallet?.address || "",
            signalId: signalId,
            choice: "No",
            type: event.action === "BUY" ? "Buy" : "Sell",
            symbol: event.symbol,
            amount: event.price.toString(),
          }),
        }
      );

      if (response.status === 400) {
        const errorData = await response.json();
        toast.error(errorData.error || "You have already 5 No signals in the last 24 hours");
      } else if (response.ok) {
        toast.success("Signal refused successfully");
        setEvents(prev => prev.map(e => 
          e.signal_id === signalId 
            ? { ...e, userChoice: "No" } 
            : e
        ));
      } else {
        toast.error("Failed to refuse signal");
      }
    } catch (error) {
      console.error("Error refusing signal:", error);
      toast.error("Network error occurred");
    }
  }, [user?.wallet?.address]);
  const handleOptionSelect = useCallback(
    async (event: Event, option: "Yes" | "No") => {
      if (option === "Yes") {
        const tradeInfo = getTokenToTrade(event);
  
        if (!tradeInfo) {
          toast.error("Token not found");
          return;
        }
        setCurrentSignalId(event.signal_id);
        setCurrentEvent(event);
        setCurrentTradeInfo(tradeInfo);
  
        const tokensFromSymbol = getTokensFromSymbol(event.symbol);
        const actionType: "Buy" | "Sell" = event.action === "BUY" ? "Buy" : "Sell";
        
        let tokenToShow, pairTokenToShow;
        
        if (actionType === "Buy") {
          tokenToShow = tradeInfo.token;
          pairTokenToShow = tokensFromSymbol.find(t => t.symbol !== tradeInfo.token.symbol) || tokensFromSymbol[0]; // MON (quello che vendi)
        } else {
          tokenToShow = tradeInfo.token;
          pairTokenToShow = tokensFromSymbol.find(t => t.symbol !== tradeInfo.token.symbol) || tokensFromSymbol[1]; // MON (quello che ricevi)
        }
  
        await onYes(tokenToShow, pairTokenToShow, event.price, actionType);
      } else {
        setSelectedOptions({
          ...selectedOptions,
          [event.signal_id]: option,
        });
        await onNo(event.signal_id, event);
      }
    },
    [selectedOptions, getTokenToTrade, onYes, onNo, getTokensFromSymbol]
  );
  

  const executeTrade = useCallback(
    async (inputAmount: string) => {
      if (!currentDexToken || !user?.wallet?.address || !currentEvent || !currentTradeInfo) {
        toast.error("Missing token or wallet address");
        return;
      }
  
      try {
        const token = currentTradeInfo.token;
        const type = currentTradeInfo.apiType;
        const amount = parseFloat(inputAmount);
  
        const apiTokenSymbol = token.symbol;
      
  
        const params = new URLSearchParams({
          token: apiTokenSymbol,
          amount: amount.toString(),
          type: type.toLowerCase(),
          userAddress: user.wallet.address,
        });

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/trade/0x-quote?${params.toString()}`
        );
        const quoteData = await res.json();

        if (!quoteData) {
          toast.error("Failed to get quote");
          return;
        }

        if (quoteData.issues?.balance) {
          toast.error("Insufficient balance");
          return;
        }

        toast("Trade request in progress...", {
          position: "bottom-right",
          autoClose: 10000,
          hideProgressBar: false,
          closeOnClick: true,
          draggable: true,
          theme: "light",
        });

        const isNativeSell = quoteData.sellToken?.toLowerCase() === MON_ADDRESS.toLowerCase();
        
        // Helper function to update state after successful transaction
        const updateSuccessState = async (txHash: string) => {
          await fetch(`${process.env.NEXT_PUBLIC_API_URL}/activity/track/trade-points`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${Cookies.get("privy-token")}`,
            },
            body: JSON.stringify({
              address: user?.wallet?.address || "",
              txHash,
              intentId: quoteData.intentId,
              signalId: currentSignalId,
            }),
          });

          // 2. Success toast
          toast.success(`Trade ${currentDexType} ${inputAmount} ${token.symbol} executed!`);
          
          // 3. Update UI state
          if (currentSignalId) {
            setEvents(prev => prev.map(event => 
              event.signal_id === currentSignalId 
                ? { ...event, userChoice: "Yes" } 
                : event
            ));
            
            // FIX: Update selectedOptions only after successful transaction
            setSelectedOptions(prev => ({
              ...prev,
              [currentSignalId]: "Yes"
            }));
          }

          // 4. Save user signal V2
          await fetch(`${process.env.NEXT_PUBLIC_API_URL}/signals/generated-signals/user-signal-v2`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${Cookies.get("privy-token")}`,
            },
            body: JSON.stringify({
              userAddress: user?.wallet?.address || "",
              signalId: currentSignalId,
              choice: "Yes",
              type: type,
              symbol: currentEvent.symbol,
              amount: amount.toString(),
            }),
          });

          // 5. Close modal
          setIsModalOpen(false);
        };

        if (isNativeSell) {
          const txHash = await sendTransactionAsync({
            account: user.wallet.address as `0x${string}`,
            gas: quoteData.transaction.gas ? BigInt(quoteData.transaction.gas) : undefined,
            to: quoteData.transaction.to,
            data: quoteData.transaction.data,
            value: BigInt(quoteData.transaction.value),
            gasPrice: quoteData.transaction.gasPrice ? BigInt(quoteData.transaction.gasPrice) : undefined,
            chainId: MONAD_CHAIN_ID,
          });

          await waitForTransactionReceipt(wagmiConfig, {
            hash: txHash,
            confirmations: 1,
          });

          await updateSuccessState(txHash);
          return;
        }

        if (quoteData.issues && quoteData.issues.allowance !== null) {
          const hash = await writeContractAsync({
            abi: erc20Abi,
            address: type === "Sell" ? token.address : WMONAD_ADDRESS,
            functionName: "approve",
            args: [PERMIT2_ADDRESS, parseUnits(amount.toString(), token.decimals)],
          });

          await waitForTransactionReceipt(wagmiConfig, {
            hash,
            confirmations: 1,
          });
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
          signatureLengthInHex = numberToHex(size(signature), { signed: false, size: 32 });
          transaction.data = concat([transaction.data, signatureLengthInHex, signature]);
        }

        const hash = await sendTransactionAsync({
          account: user.wallet.address as `0x${string}`,
          gas: transaction.gas ? BigInt(transaction.gas) : undefined,
          to: transaction.to,
          data: transaction.data,
          chainId: MONAD_CHAIN_ID,
        });

        await waitForTransactionReceipt(wagmiConfig, {
          hash,
          confirmations: 1,
        });

        await updateSuccessState(hash);

      } catch (error) {
        console.error("Transaction failed:", error);
        toast.error("Transaction failed. Please try again.");
      }
    },
    [currentDexToken, currentDexType, user?.wallet?.address, currentSignalId, currentEvent, currentTradeInfo, sendTransactionAsync, signTypedDataAsync, wagmiConfig, writeContractAsync]
  );

  const handleModalClose = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const handleEvent = useCallback(
    (data: Event) => {
      console.log("New sse event", data);
      if (latestEventId === null || data.id > latestEventId) {
        setLatestEventId(data.id);
      }
      setEvents((prev) =>
        [data, ...prev]
          .slice(0, 50)
          .sort(
            (a, b) =>
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          )
      );
      setTimeout(() => setLatestEventId(null), 3000);
    },
    [latestEventId]
  );

  const navigateToSignalDetail = (id: string) => {
    router.push(`/v2/signals/${id}`);
  };

  const fetchSignals = async () => {
    const response = await apiClient.get({
      url: ENDPOINTS.SIGNALS_LIST,
      auth: true,
    });
    if (response && response.status === 200) {
      const signals = new Map<string, Signal>(
        (response.data as { signals: Signal[] }).signals.map(
          (signal: Signal) => [signal.id, signal]
        )
      );
      setSignals(signals);
    }
  };

  const fetchTokens = useCallback(async () => {
    const response = await apiClient.get<TokenData[]>({
      url: ENDPOINTS.TOKENS_INFO + "?type=token",
      auth: true,
    });
    if (response && response.status === 200) {
      const tokens = response.data;
      setTokens((prev) => { 
        const newTokens = new Map(prev);
        tokens.forEach((token: TokenData) => {
          const token_ids = token.token_id.split(":");
          const chainId = parseInt(token_ids[0]);
          const tokenAddress = token_ids[1];
          newTokens.set(token.symbol, {
            symbol: token.symbol,
            name: token.name,
            decimals: parseInt(token.decimal),
            address: tokenAddress as `0x${string}`,
            chainId: chainId,
            totalHolding: 0,
            price: 0,
            imageUrl: getTokenImage(token.symbol),
          });
        });
        return newTokens;
      });
    }
  }, []);

  const fetchCharts = useCallback(async (events: Event[]) => {
    for (const event of events) {
      try {
        const response = await apiClient.get({
          url:
            ENDPOINTS.PRICE_DATA.replace(":id", event.token_id) + "?limit=500",
          auth: true,
        });

        // Check if response.data has the expected structure
        if (!response.data) {
          console.warn("No data in response for token", event.token_id);
          continue;
        }

        // Handle different possible response structures
        let chartData: ChartData[] = [];

        if (Array.isArray(response.data)) {
          // If response.data is directly an array
          chartData = response.data.map(
            (item: { timestamp: string; close: number }) => ({
              timestamp: item.timestamp,
              price: item.close,
            })
          );
        } else if (
          response.data &&
          typeof response.data === "object" &&
          "data" in response.data &&
          Array.isArray(response.data.data)
        ) {
          // If response.data.data is the array
          chartData = response.data.data.map(
            (item: { timestamp: string; close: number }) => ({
              timestamp: item.timestamp,
              price: item.close,
            })
          );
        } else {
          console.warn(
            "Unexpected response structure for token",
            event.token_id,
            ":",
            response.data
          );
          continue;
        }

        chartData.sort(
          (a: ChartData, b: ChartData) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        setCharts((prev) => {
          const newCharts = new Map(prev);
          newCharts.set(event.token_id, chartData);
          return newCharts;
        });
      } catch (error) {
        console.error(
          "Error fetching chart data for token",
          event.token_id,
          ":",
          error
        );
      }
    }
  }, []);

  const fetchEvents = useCallback(async () => {
    const response = await apiClient.get<{ data: Event[] }>({
      url: ENDPOINTS.SIGNAL_EVENTS_ALL,
      auth: true,
    });
    if (response && response.status === 200) {
      const events = Array.isArray(response.data)
        ? response.data.slice(0, 50)
        : [];
      setEvents(events);
      const uniqueEvents = events.filter(
        (event: Event, index: number, self: Event[]) => {
          return index === self.findIndex((t) => t.token_id === event.token_id);
        }
      );
      fetchCharts(uniqueEvents);
    }
  }, [fetchCharts]);

  useEffect(() => {
    fetchSignals();
    fetchTokens();
  }, [fetchTokens]);

  useEffect(() => {
    fetchEvents();
  }, [signals, fetchEvents]);

  useSSE(
    `${process.env.NEXT_PUBLIC_API_V2_URL}${ENDPOINTS.SIGNAL_SSE_EVENTS}`,
    handleEvent
  );

  const colorSignalName = (name: string) => {
    const base =
      "px-2.5 py-1 rounded-md text-sm font-medium text-center inline-block";
    switch (name) {
      case "RSI":
        return (
          <span className={`text-green-700 bg-green-50 ${base}`}>{name}</span>
        );
      case "MACD":
        return (
          <span className={`text-blue-700 bg-blue-50 ${base}`}>{name}</span>
        );
      case "ADX":
        return (
          <span className={`text-orange-700 bg-orange-50 ${base}`}>{name}</span>
        );
      case "SMA":
        return <span className={`text-red-700 bg-red-50 ${base}`}>{name}</span>;
      default:
        return (
          <span className={`text-gray-800 bg-gray-100 ${base}`}>{name}</span>
        );
    }
  };

  const getTimeframeBadge = (timeframe: string) => {
    return (
      <span className="bg-gray-100 text-gray-800 rounded-md px-2.5 py-1 text-sm font-medium inline-block">
        {timeframe}
      </span>
    );
  };

  return (
    <ProtectPage requireV2Access={true}>
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
            <div className="w-full px-4 md:px-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                  <h2 className="text-2xl font-bold text-gray-900">
                    V2 Signals
                  </h2>
                  <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
                    <div className="flex flex-wrap gap-2">
                      <select className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-gray-300">
                        <option value="">All Actions</option>
                        <option value="BUY">Buy</option>
                        <option value="SELL">Sell</option>
                      </select>

                      <select className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-gray-300">
                        <option value="">All Timeframes</option>
                        <option value="1h">1 Hour</option>
                        <option value="4h">4 Hours</option>
                        <option value="1d">1 Day</option>
                        <option value="1w">1 Week</option>
                      </select>

                      <select className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-gray-300">
                        <option value="">All Signals</option>
                        <option value="PRICE_CHANGE">Price Change</option>
                        <option value="VOLUME_SPIKE">Volume Spike</option>
                        <option value="ACTIVITY_SPIKE">Activity Spike</option>
                        <option value="HOLDER_CHANGE">Holder Change</option>
                      </select>
                    </div>

                    <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                      <button
                        className="px-4 py-2 text-sm flex items-center justify-center w-16 bg-blue-50 text-blue-700 border-r border-gray-200 transition-all duration-200 hover:bg-blue-100"
                        onClick={() => {
                          /* TODO: Implement filter */
                        }}
                      >
                        All
                      </button>
                      <button
                        className="px-4 py-2 text-sm flex items-center justify-center w-16 bg-white text-gray-600 transition-all duration-200 hover:bg-gray-50 border-r border-gray-200"
                        onClick={() => {
                          /* TODO: Implement filter */
                        }}
                      >
                        Buy
                      </button>
                      <button
                        className="px-4 py-2 text-sm flex items-center justify-center w-16 bg-white text-gray-600 transition-all duration-200 hover:bg-gray-50"
                        onClick={() => {
                          /* TODO: Implement filter */
                        }}
                      >
                        Sell
                      </button>
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <div className="min-w-full">
                    {/* Desktop view */}
                    <div>
                      <table className="w-full border-collapse hidden md:table">
                        <thead className="sticky top-0 bg-white z-10">
                          <tr className="text-left text-sm text-gray-600 bg-gray-50 font-medium border-b border-gray-200">
                            <th className="px-4 py-3 text-sm">ACTION</th>
                            <th className="px-4 py-3 text-sm">PAIR</th>
                            <th className="px-4 py-3 text-sm">PRICE</th>
                            <th className="px-4 py-3 text-sm text-center">
                              CHART
                            </th>
                            <th className="px-4 py-3 text-sm">SIGNAL</th>
                            <th className="px-4 py-3 text-sm">TIMEFRAME</th>
                            <th className="px-4 py-3 text-sm">CREATED</th>
                            <th className="px-4 py-3 text-sm text-center">
                              DECISION
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredEvents
                            .slice(
                              (currentPage - 1) * rowsPerPage,
                              currentPage * rowsPerPage
                            )
                            .map((event) => (
                              <tr
                                key={event.id}
                                className={`border-b border-gray-100 text-sm transition-colors duration-1000 ${
                                  latestEventId === event.id
                                    ? event.action === "BUY"
                                      ? "bg-emerald-50"
                                      : "bg-rose-50"
                                    : ""
                                }`}
                              >
                                <td className="text-gray-900 px-4 py-2 text-sm">
                                  <div className="flex items-center">
                                    <div
                                      className={`w-5 h-5 rounded-full mr-2 flex items-center justify-center ${
                                        event.action === "BUY"
                                          ? "bg-emerald-500"
                                          : "bg-rose-500"
                                      }`}
                                    >
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="w-3 h-3 text-white"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                      >
                                        {event.action === "BUY" ? (
                                          <>
                                            <line
                                              x1="12"
                                              y1="20"
                                              x2="12"
                                              y2="10"
                                              stroke="currentColor"
                                              strokeWidth="2"
                                            />
                                            <path
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                              strokeWidth={2}
                                              d="M5 15l7-7 7 7"
                                            />
                                          </>
                                        ) : (
                                          <>
                                            <line
                                              x1="12"
                                              y1="4"
                                              x2="12"
                                              y2="14"
                                              stroke="currentColor"
                                              strokeWidth="2"
                                            />
                                            <path
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                              strokeWidth={2}
                                              d="M19 9l-7 7-7-7"
                                            />
                                          </>
                                        )}
                                      </svg>
                                    </div>
                                    <span className="text-sm font-medium text-gray-900">
                                      {event.action.charAt(0).toUpperCase() +
                                        event.action.slice(1).toLowerCase()}
                                    </span>
                                  </div>
                                </td>
                                <td className="text-gray-900 text-sm font-semibold">
                                  <a
                                    className="text-sm font-semibold cursor-pointer px-4 py-2 hover:text-violet-600 transition-colors"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigateToSignalDetail(
                                        `${event.signal_id}|${event.token_id}|${event.currency}`
                                      );
                                    }}
                                  >
                                    {mapSymbolForDisplay(event.symbol)}
                                  </a>
                                </td>
                                <td className="text-gray-900 px-4 py-2 text-sm font-medium">
                                  {event.price.toFixed(6)}
                                </td>
                                <td className="text-gray-900 px-4 py-2 text-sm">
                                  <a
                                    className="cursor-pointer hover:opacity-80 transition-opacity"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigateToSignalDetail(
                                        `${event.signal_id}|${event.token_id}|${event.currency}`
                                      );
                                    }}
                                  >
                                    {chart(charts.get(event.token_id) || [])}
                                  </a>
                                </td>
                                <td className="text-gray-900 px-4 py-2 text-sm">
                                  {colorSignalName(
                                    signals.get(event.signal_id)?.name ||
                                      event.signal_id
                                  )}
                                </td>
                                <td className="text-gray-900 px-4 py-3 text-sm">
                                  {getTimeframeBadge(
                                    signals.get(event.signal_id)?.timeframe ||
                                      ""
                                  )}
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-600">
                                  {getTimeAgo(event.timestamp)}
                                </td>
                                <td className="px-4 py-3 text-sm flex justify-end items-center">
                                  {selectedOptions[event.signal_id] ? (
                                    <span
                                      className={`px-3 py-1.5 text-xs rounded-lg ${
                                        selectedOptions[event.signal_id] === "Yes"
                                          ? "bg-green-100 text-green-700"
                                          : "bg-red-100 text-red-700"
                                      }`}
                                    >
                                      {selectedOptions[event.signal_id] === "Yes" 
                                        ? "Accepted" 
                                        : "Refused"}
                                    </span>
                                  ) : chainId !== MONAD_CHAIN_ID ? (
                                    <button
                                      className="px-3 py-1.5 text-xs bg-violet-600 text-white rounded-lg hover:bg-violet-700"
                                      onClick={() => switchChain({ chainId: MONAD_CHAIN_ID })}
                                    >
                                      Switch to Monad
                                    </button>
                                  ) : (
                                    <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                                      <button
                                        className="px-3 py-1.5 text-xs flex items-center justify-center w-16 bg-white text-gray-500 transition-all duration-200 hover:bg-gray-50 border-r border-gray-200"
                                        onClick={() => handleOptionSelect(event, "No")}
                                      >
                                        Refuse
                                      </button>
                                      <button 
                                        className="px-3 py-1.5 text-xs flex items-center justify-center w-16 bg-blue-50 text-blue-700 transition-all duration-200 hover:bg-blue-100"
                                        onClick={() => handleOptionSelect(event, "Yes")}
                                      >
                                        Accept
                                      </button>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>

                      {/* Mobile view */}
                      <div className="md:hidden">
                        {filteredEvents
                          .slice(
                            (currentPage - 1) * rowsPerPage,
                            currentPage * rowsPerPage
                          )
                          .map((event) => (
                            <div
                              key={event.id}
                              className={`border-b border-gray-100 p-4 transition-colors duration-1000 ${
                                latestEventId === event.id
                                  ? event.action === "BUY"
                                    ? "bg-emerald-50"
                                    : "bg-rose-50"
                                  : ""
                              }`}
                            >
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center">
                                  <div
                                    className={`w-6 h-6 rounded-full mr-3 flex items-center justify-center ${
                                      event.action === "BUY"
                                        ? "bg-emerald-500"
                                        : "bg-rose-500"
                                    }`}
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      className="w-4 h-4 text-white"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                    >
                                      {event.action === "BUY" ? (
                                        <>
                                          <line
                                            x1="12"
                                            y1="20"
                                            x2="12"
                                            y2="10"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                          />
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M5 15l7-7 7 7"
                                          />
                                        </>
                                      ) : (
                                        <>
                                          <line
                                            x1="12"
                                            y1="4"
                                            x2="12"
                                            y2="14"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                          />
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M19 9l-7 7-7-7"
                                          />
                                        </>
                                      )}
                                    </svg>
                                  </div>
                                  <div>
                                    <div className="text-lg font-semibold text-gray-900">
                                      {mapSymbolForDisplay(event.symbol)}
                                    </div>
                                    <div className="text-sm text-gray-600">
                                      {event.action.charAt(0).toUpperCase() +
                                        event.action.slice(1).toLowerCase()}
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-lg font-bold text-gray-900">
                                    {event.price.toFixed(6)}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {getTimeAgo(event.timestamp)}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center space-x-2">
                                  {colorSignalName(
                                    signals.get(event.signal_id)?.name ||
                                      event.signal_id
                                  )}
                                  <span className="bg-gray-50 text-gray-700 px-2.5 py-1 rounded-md text-xs font-medium">
                                    {signals.get(event.signal_id)?.timeframe ||
                                      ""}
                                  </span>
                                </div>
                                <a
                                  className="cursor-pointer hover:opacity-80 transition-opacity"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigateToSignalDetail(
                                      `${event.signal_id}|${event.token_id}|${event.currency}`
                                    );
                                  }}
                                >
                                  {chart(charts.get(event.token_id) || [])}
                                </a>
                              </div>

                              <div className="flex justify-end">
                                {selectedOptions[event.signal_id] ? (
                                  <span
                                    className={`px-4 py-2 text-sm rounded-lg ${
                                      selectedOptions[event.signal_id] === "Yes"
                                        ? "bg-green-100 text-green-700"
                                        : "bg-red-100 text-red-700"
                                    }`}
                                  >
                                    {selectedOptions[event.signal_id] === "Yes" 
                                      ? "Accepted" 
                                      : "Refused"}
                                  </span>
                                ) : chainId !== MONAD_CHAIN_ID ? (
                                  <button
                                    className="px-4 py-2 text-sm bg-violet-600 text-white rounded-lg hover:bg-violet-700"
                                    onClick={() => switchChain({ chainId: MONAD_CHAIN_ID })}
                                  >
                                    Switch to Monad
                                  </button>
                                ) : (
                                  <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                                    <button
                                      className="px-4 py-2 text-sm flex items-center justify-center w-20 bg-white text-gray-500 transition-all duration-200 hover:bg-gray-50 border-r border-gray-200"
                                      onClick={() => handleOptionSelect(event, "No")}
                                    >
                                      Refuse
                                    </button>
                                    <button 
                                      className="px-4 py-2 text-sm flex items-center justify-center w-20 bg-blue-50 text-blue-700 transition-all duration-200 hover:bg-blue-100"
                                      onClick={() => handleOptionSelect(event, "Yes")}
                                    >
                                      Accept
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>

                      {/* Pagination Controls */}
                      <div className="flex flex-col md:flex-row justify-between items-center p-4 gap-4">
                        <div className="text-sm text-gray-500 text-center md:text-left">
                          <span className="font-normal">Showing</span>{" "}
                          <span className="font-bold">
                            {(currentPage - 1) * rowsPerPage + 1}-
                            {Math.min(currentPage * rowsPerPage, events.length)}
                          </span>{" "}
                          <span className="font-normal">of</span>{" "}
                          <span className="font-bold">{events.length}</span>
                        </div>
                        <div className="flex-grow flex justify-center">
                          <Pagination
                            currentPage={currentPage}
                            totalPages={Math.ceil(filteredEvents.length / rowsPerPage)}
                            onPageChange={setCurrentPage}
                            showIcons={false}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {currentDexToken && currentDexPairToken && (
        <DexModalV2
          isOpen={isModalOpen}
          onClose={handleModalClose}
          onConfirm={executeTrade}
          token={currentDexToken}
          pairToken={currentDexPairToken}
          amount={currentDexAmount}
          type={currentDexType}
          signalText={`${currentDexType} ${currentDexToken.symbol} at ${currentDexAmount}`}
          confidenceScore="8.5"
        />
      )}
    </ProtectPage>
  );
}