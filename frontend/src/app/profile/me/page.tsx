"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { LoadingOverlay } from "@/app/components/ui/LoadingSpinner";

export default function ProfileMePage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();

  useEffect(() => {
    if (isConnected && address) {
      router.replace(`/users/${address}`);
    } else if (!isConnected) {
      router.replace("/");
    }
  }, [isConnected, address, router]);

  return <LoadingOverlay />;
} 