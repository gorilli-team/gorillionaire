"use client";

import React, { createContext, useContext, ReactNode } from "react";
import { toast } from "react-toastify";
import { usePrivy } from "@privy-io/react-auth";
import { useAccount, useSwitchChain } from "wagmi";
import { MONAD_CHAIN_ID } from "@/app/utils/constants";
import { Token } from "@/app/types";

interface TradeContextType {
  handleOptionSelect: (params: {
    signal_id: string;
    option: "Yes" | "No";
    user: any;
    tokens?: Token[];
    amount?: number;
    type?: string;
    chainId?: number | null;
  }) => void;
}

const TradeContext = createContext<TradeContextType | undefined>(undefined);

export const useTradeV2 = () => {
  const context = useContext(TradeContext);
  if (context === undefined) {
    throw new Error("useTradeV2 must be used within a TradeProviderV2");
  }
  return context;
};

interface TradeProviderProps {
  children: ReactNode;
}

export const TradeProviderV2: React.FC<TradeProviderProps> = ({ children }) => {
  const { user } = usePrivy();
  const { chainId } = useAccount();
  const { switchChain } = useSwitchChain();

  const handleOptionSelect = async (params: {
    signal_id: string;
    option: "Yes" | "No";
    user: any;
    tokens?: Token[];
    amount?: number;
    type?: string;
    chainId?: number | null;
  }) => {
    const {
      signal_id,
      option,
      user: userParam,
      tokens,
      amount,
      type,
      chainId: paramChainId,
    } = params;

    if (!userParam?.wallet?.address) {
      toast.error("Please connect your wallet first");
      return;
    }

    // Check if we're on Monad network for "Yes" option
    if (option === "Yes" && paramChainId !== MONAD_CHAIN_ID) {
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

    try {
      // Make API call to record user's response using V2 API
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_V2_URL}/signals/generated-signals/user-signal`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("auth-token")}`,
          },
          body: JSON.stringify({
            userAddress: userParam.wallet.address,
            signalId: signal_id,
            choice: option,
          }),
        }
      );

      if (response.status === 400) {
        toast.error("You have already 5 No signals in the last 24 hours");
        return;
      }

      if (response.ok) {
        toast.success(
          `Signal ${option === "Yes" ? "accepted" : "refused"} successfully`
        );
      } else {
        toast.error("Failed to record signal response");
      }
    } catch (error) {
      console.error("Error recording signal response:", error);
      toast.error("Failed to record signal response");
    }
  };

  const value: TradeContextType = {
    handleOptionSelect,
  };

  return (
    <TradeContext.Provider value={value}>{children}</TradeContext.Provider>
  );
};
