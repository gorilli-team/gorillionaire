"use client";
import type { ReactNode } from "react";
import { PrivyProvider } from '@privy-io/react-auth';
import { defineChain } from 'viem';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createConfig, http, WagmiProvider } from "wagmi";
import { coinbaseWallet } from "wagmi/connectors";

// Definizione della chain Monad utilizzando viem
export const monadChain = defineChain({
  id: 10143,
  name: "Monad testnet",
  network: "monad",
  nativeCurrency: {
    decimals: 18,
    name: "Monad",
    symbol: "MON",
  },
  rpcUrls: {
    default: {
      http: ["https://testnet-rpc.monad.xyz"],
    },
    public: {
      http: ["https://testnet-rpc.monad.xyz"],
    },
  },
  blockExplorers: {
    default: {
      name: "MonadExplorer",
      url: "https://testnet.monadexplorer.com",
    },
  },
});

const wagmiConfig = createConfig({
  chains: [monadChain],
  connectors: [
    coinbaseWallet({
      appName: "Your App Name",
      preference: "smartWalletOnly",
      version: "4",
    }),
  ],
  ssr: true,
  transports: {
    [10143]: http(),
  },
});

// Client per React Query
const queryClient = new QueryClient();

export function Providers({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <PrivyProvider
          appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || ""}
          config={{
            appearance: {
              theme: 'light',
              accentColor: '#3B82F6',
            },
            embeddedWallets: {
              createOnLogin: 'users-without-wallets',
            },
            supportedChains: [
              monadChain
            ],
            loginMethods: ['email', 'google', 'apple', 'discord', 'twitter', 'wallet'],
          }}
        >
          {children}
        </PrivyProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}