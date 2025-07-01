"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { UserService } from "@/app/services/userService";

interface ProtectPageProps {
  children: ReactNode;
}

export default function ProtectPage({ children }: ProtectPageProps) {
  const router = useRouter();
  const { address } = useAccount();
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      if (!address) {
        console.log("No address");
        // router.push("/v2/access");
        return;
      }

      try {
        const hasV2Access = await UserService.checkV2Access(address);
        if (!hasV2Access) {
          console.log("No access");
          // router.push("/v2/access");
          return;
        }
        setHasAccess(true);
      } catch (error) {
        console.error("Error checking access:", error);
        // router.push("/v2/access");
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, [address, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-700"></div>
      </div>
    );
  }

  if (!hasAccess) {
    return null;
  }

  return <>{children}</>;
}
