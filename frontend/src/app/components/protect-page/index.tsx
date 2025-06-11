"use client";

import { useAuth } from "@/app/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

interface ProtectProps {
  children: React.ReactNode;
}

export default function ProtectPage({ children }: ProtectProps) {
  const { isAuthenticated, isLoading } = useAuth(); // 👈 include loading state
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/v2");
    }
  }, [isAuthenticated, isLoading, router]);

  // Don't render anything while auth state is being determined
  if (isLoading) return null;

  // After auth is resolved
  if (!isAuthenticated) return null;

  return <>{children}</>;
}