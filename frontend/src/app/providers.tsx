"use client";
import type { ReactNode } from "react";
import { PrivyProvider } from "@privy-io/react-auth";
import { defineChain, createPublicClient, http } from "viem";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createConfig, WagmiProvider } from "wagmi";
import { coinbaseWallet } from "wagmi/connectors";
import { NNS } from "@nadnameservice/nns-viem-sdk";
import { AuthProvider } from "@/app/contexts/AuthContext";

// Viem define chain
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

const viemClient = createPublicClient({
  chain: monadChain,
  transport: http(),
});

export const nnsClient = new NNS(viemClient);

const wagmiConfig = createConfig({
  chains: [monadChain],
  connectors: [
    coinbaseWallet({
      appName: "Gorillionaire",
      preference: "smartWalletOnly",
      version: "4",
    }),
  ],
  ssr: true,
  transports: {
    [10143]: http(),
  },
});

const queryClient = new QueryClient();

export function Providers({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <PrivyProvider
          appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || ""}
          config={{
            appearance: {
              theme: "light",
              accentColor: "#3B82F6",
            },
            embeddedWallets: {
              createOnLogin: "users-without-wallets",
            },
            supportedChains: [monadChain],
            loginMethods: [
              "email",
              "google",
              "apple",
              "discord",
              "twitter",
              "wallet",
            ],
            fundingMethodConfig: {
              moonpay: {
                paymentMethod: "credit_debit_card", // Purchase with credit or debit card
                uiConfig: {
                  accentColor: "#696FFD",
                  theme: "light",
                },
              },
            },
          }}
        >
          <AuthProvider>{children}</AuthProvider>
        </PrivyProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
