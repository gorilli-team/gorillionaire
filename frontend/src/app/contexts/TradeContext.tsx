import { createContext, useCallback, useContext, useState } from "react";
import { toast } from "react-toastify";
import Cookies from 'js-cookie';
import { MONAD_CHAIN_ID } from "../utils/constants";
import DexModal from "@/app/components/ui/DexModal";
import { LoadingOverlay } from "@/app/components/ui/LoadingSpinner";
import { waitForTransactionReceipt } from "wagmi/actions";
import { concat, erc20Abi, numberToHex, parseUnits } from "viem";
import { MON_ADDRESS, WMONAD_ADDRESS, PERMIT2_ADDRESS } from "@/app/utils/constants";
import {
    useWriteContract,
    useConfig,
    useSignTypedData,
    useSendTransaction,
  } from "wagmi";
import { Token } from "../types";

interface OnNoParams {
  signal_id: string;
  user: {
    wallet: {
      address: string;
    };
  };
  setSignal: (prev: { userSignal?: { choice: string } } | null) => void;
}

interface HandleOptionSelectParams {
  signal_id: string;
  option: "Yes" | "No";
  user: {
    wallet: {
      address: string;
    };
  } | null;
  tokens: Token[];
  chainId: number | null;
  amount?: number;
  type?: string;
  setSignal?: (prev: { userSignal?: { choice: string } } | null) => void;
}

interface SignalState {
  userSignal?: { choice: string };
}

interface ExecuteTradeParams {
  wagmiConfig: ReturnType<typeof useConfig>;
  sendTransactionAsync: ReturnType<typeof useSendTransaction>["sendTransactionAsync"];
  currentDexTokens: Token[];
  currentDexType: string;
  currentDexAmount: number;
  currentDexInputAmount: string;
  currentDexOutputAmount: string;
  user: { wallet: { address: string } };
  signal_id: string;
  setSignal: (value: SignalState | null) => void;
  setIsModalOpen: (isOpen: boolean) => void;
}

const TradeContext = createContext<{
  isModalOpen: boolean;
  setIsModalOpen: (isOpen: boolean) => void;
  handleOptionSelect: (params: HandleOptionSelectParams) => Promise<void>;
}>({
  isModalOpen: false,
  setIsModalOpen: () => {},
  handleOptionSelect: async () => {},
});

    const TradeProvider = ({ children }: { children: React.ReactNode }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [currentDexTokens, setCurrentDexTokens] = useState<Token[]>([]);
    const [currentDexAmount, setCurrentDexAmount] = useState<number>(0);
    const [currentDexType, setCurrentDexType] = useState<string>("");
    const { writeContractAsync } = useWriteContract();
    const { signTypedDataAsync } = useSignTypedData();
    const [error] = useState<string | null>(null);


    const executeTrade = useCallback(async ({
        currentDexTokens,
        currentDexType,
        currentDexAmount,
        currentDexInputAmount,
        currentDexOutputAmount,
        user,
        // signal_id,
        setSignal,
        setIsModalOpen,
        wagmiConfig,
        sendTransactionAsync,
      }: ExecuteTradeParams) => {
        if (!currentDexTokens || !user?.wallet?.address) return;
      
        const token = currentDexTokens[0];
        const type = currentDexType;
        let amount =
          type && type.toLowerCase() === "buy"
            ? parseFloat(currentDexOutputAmount || "0")
            : parseFloat(currentDexInputAmount || "0");
      
        if (isNaN(amount)) amount = currentDexAmount || 0;
      
        const params = new URLSearchParams({
          token: token.symbol,
          amount: amount.toString(),
          type: (type || "buy").toLowerCase(),
          userAddress: user?.wallet?.address,
        });
      
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/trade/0x-quote?${params.toString()}`
        );
        const quoteData = await res.json();
        if (!quoteData || quoteData.issues?.balance) {
          toast.error("Insufficient balance");
          return;
        }
      
        toast("Trade request in progress...", { autoClose: 5000 });
      
        // Native MONAD
        if (quoteData.sellToken?.toLowerCase() === MON_ADDRESS.toLowerCase()) {
          const txHash = await sendTransactionAsync({
            account: user.wallet.address as `0x${string}`,
            to: quoteData.transaction.to,
            data: quoteData.transaction.data,
            value: BigInt(quoteData.transaction.value),
            gas: quoteData.transaction.gas ? BigInt(quoteData.transaction.gas) : undefined,
            gasPrice: quoteData.transaction.gasPrice ? BigInt(quoteData.transaction.gasPrice) : undefined,
            chainId: MONAD_CHAIN_ID,
          });
      
          if (!wagmiConfig) return;
          await waitForTransactionReceipt(wagmiConfig, { hash: txHash, confirmations: 1 });
        //   await trackTradePoints(user.wallet.address, txHash, quoteData.intentId, signal_id);
        //   await recordUserSignal(user.wallet.address, txHash, quoteData.intentId, signal_id);
      
          if (!setSignal) return;
          setSignal({ userSignal: { choice: "Yes" } });
          if (setIsModalOpen) setIsModalOpen(false);
          return;
        }
      
        if (quoteData.issues?.allowance !== null) {
          const hash = await writeContractAsync({
            abi: erc20Abi,
            address: type && type.toLowerCase() === "sell" ? token.address : WMONAD_ADDRESS,
            functionName: "approve",
            args: [PERMIT2_ADDRESS, parseUnits(amount.toString(), token.decimals)],
          });
      
          await waitForTransactionReceipt(wagmiConfig, { hash, confirmations: 1 });
        }
      
        if (quoteData.permit2?.eip712) {
          const signature = await signTypedDataAsync(quoteData.permit2.eip712);
          const signatureLengthInHex = numberToHex(signature.length, { size: 32 });
          quoteData.transaction.data = concat([
            quoteData.transaction.data,
            signatureLengthInHex,
            signature,
          ]);
        }
      
        const hash = await sendTransactionAsync({
          account: user.wallet.address as `0x${string}`,
          to: quoteData.transaction.to,
          data: quoteData.transaction.data,
          gas: quoteData.transaction.gas ? BigInt(quoteData.transaction.gas) : undefined,
          chainId: MONAD_CHAIN_ID,
        });
      
        if (!wagmiConfig) return;
        await waitForTransactionReceipt(wagmiConfig, { hash, confirmations: 1 });
        // await trackTradePoints(user.wallet.address, hash, quoteData.intentId, signal_id);
        // await recordUserSignal(user.wallet.address, hash, quoteData.intentId, signal_id);
      
        if (!setSignal) return;
        setSignal({ userSignal: { choice: "Yes" } });
        if (setIsModalOpen) setIsModalOpen(false);
        return;
      },[signTypedDataAsync, writeContractAsync]);

    const onYes = useCallback(async ({
        tokens,
        amount,
        type,
        user,
        chainId,
        signal_id,
        option,
        setSignal
      }: HandleOptionSelectParams) => {
        console.log("onYes", user, chainId);
        if (!user?.wallet?.address || chainId !== MONAD_CHAIN_ID) {
          toast.error("Please switch to Monad network");
          return;
        }
        console.log("onYes", tokens, amount, type, user, chainId);
        setCurrentDexTokens(tokens);
        setCurrentDexAmount(amount || 0);
        setCurrentDexType(type || "");
        setIsModalOpen(true);
        await onYes({
          tokens,
          amount,
          type,
          user,
          chainId,
          signal_id,
          option,
          setSignal
        });
      },[]);

    const onNo = useCallback(async ({
        signal_id,
        user,
        setSignal,
    }: OnNoParams) => {
        const privyToken = Cookies.get("privy-token");
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/signals/generated-signals/user-signal`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${privyToken}`,
            },
            body: JSON.stringify({
              userAddress: user.wallet.address,
              signalId: signal_id,
              choice: "No", 
            }),
          }
        );
      
        if (res.status === 400) {
          toast.error("You have already 5 No signals in the last 24 hours");    
        } else {
          await onNo({ signal_id, user, setSignal });
        }
      }
,[]);

    const handleOptionSelect = useCallback(async ({
        signal_id,
        amount,
        type,
        option,
        user,
        tokens,
        setSignal,
        chainId,
      }: HandleOptionSelectParams) => {
        setIsLoading(true);
        if (option === "Yes") {
          await onYes({
            tokens,
            amount,
            type,
            user,
            chainId,
            signal_id,
            option,
            setSignal
          });
        } else {
          const privyToken = Cookies.get("privy-token");
          const res = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/signals/generated-signals/user-signal`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${privyToken}`,
              },
              body: JSON.stringify({
                userAddress: user?.wallet?.address,
                signalId: signal_id,
                choice: "No",
              }),
            }
          );
      
          if (res.status === 400) {
            toast.error("You have already 5 No signals in the last 24 hours");
          } else {
            if (!setSignal) return;
            await onNo({ signal_id, user: user as { wallet: { address: string } }, setSignal });
          }
          setIsLoading(false);
        }
    }, [onNo, onYes, setIsLoading]);     


    const value = {
        isModalOpen,
        setIsModalOpen,
        handleOptionSelect,
        // executeTrade,
    };
    const wagmiConfig = useConfig();
    const { sendTransactionAsync } = useSendTransaction();
    return (
      <TradeContext.Provider value={value}>
        {children}

      {currentDexTokens && (
        <DexModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onConfirm={() => executeTrade({
            currentDexTokens,
            currentDexType,
            currentDexAmount,
            currentDexInputAmount: "",
            currentDexOutputAmount: "",
            user: { wallet: { address: "" } },
            signal_id: "",
            setSignal: (prev: SignalState | null) => prev,
            setIsModalOpen: () => {},
            wagmiConfig: wagmiConfig,
            sendTransactionAsync: sendTransactionAsync,
          })}
          tokens={currentDexTokens}
          amount={currentDexAmount}
          type={currentDexType as "Buy" | "Sell"}
          token={currentDexTokens[0]}
        //   monBalance={tokens.find((t) => t.symbol === "MON")?.totalHolding || 0}
        //   monPrice={tokens.find((t) => t.symbol === "MON")?.price || 0}
        //   signalText={signal?.signal_text}
        //   confidenceScore={signal?.confidenceScore}
        //   onAmountChange={(inputAmount, outputAmount) => {
        //     setCurrentDexInputAmount(inputAmount);
        //     setCurrentDexOutputAmount(outputAmount);
        //   }}
        />
      )}
      {isLoading && <LoadingOverlay />}
      {error && <div className="text-red-500">{error}</div>}
      </TradeContext.Provider>
    );
  };
  
const useTrade = () => useContext(TradeContext);

  export { TradeProvider, useTrade };