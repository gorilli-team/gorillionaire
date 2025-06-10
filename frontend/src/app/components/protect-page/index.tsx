"use client";

import { useAuth } from "@/app/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

interface ProtectProps {
  children: React.ReactNode;
}

export default function ProtectPage({ children }: ProtectProps) {
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/unauthorized");
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    router.push("/unauthorized");
    return null;
  }

  return <>{children}</>;
}
