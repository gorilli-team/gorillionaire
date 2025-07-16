import { useState, useCallback, useEffect } from "react";
import { useAccount, useSwitchChain } from "wagmi";
import { toast } from "react-toastify";

interface UseChainSwitchReturn {
  isChainSwitching: boolean;
  handleSwitchToChain: (
    targetChainId: number,
    chainName?: string
  ) => Promise<void>;
  isOnTargetChain: (targetChainId: number) => boolean;
}

export const useChainSwitch = (): UseChainSwitchReturn => {
  const [isChainSwitching, setIsChainSwitching] = useState(false);
  const { chainId } = useAccount();
  const { switchChain } = useSwitchChain();

  // Reset switching state when chain actually changes
  useEffect(() => {
    if (isChainSwitching) {
      // Small delay to ensure the chain switch has completed
      const timer = setTimeout(() => {
        setIsChainSwitching(false);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [chainId, isChainSwitching]);

  const handleSwitchToChain = useCallback(
    async (
      targetChainId: number,
      chainName: string = `Chain ${targetChainId}`
    ) => {
      try {
        setIsChainSwitching(true);
        await switchChain({ chainId: targetChainId });

        // Additional delay to allow the chain to fully switch
        setTimeout(() => {
          setIsChainSwitching(false);
        }, 1000);
      } catch (error) {
        console.error(`Failed to switch to ${chainName}:`, error);
        setIsChainSwitching(false);
        toast.error(`Failed to switch to ${chainName} network`);
      }
    },
    [switchChain]
  );

  const isOnTargetChain = useCallback(
    (targetChainId: number) => {
      return chainId === targetChainId;
    },
    [chainId]
  );

  return {
    isChainSwitching,
    handleSwitchToChain,
    isOnTargetChain,
  };
};
