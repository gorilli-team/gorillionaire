"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { UserService } from "@/app/services/userService";

export default function V2AccessPage() {
  const router = useRouter();
  const { address } = useAccount();

  useEffect(() => {
    const checkAccess = async () => {
      if (!address) {
        // If no wallet connected, stay on this page
        return;
      }

      try {
        const hasV2Access = await UserService.checkV2Access(address);
        if (hasV2Access) {
          // router.push("/v2");
        } else {
          // User doesn't have V2 access, show access denied message
          console.log("User doesn't have V2 access");
        }
      } catch (error) {
        console.error("Error checking V2 access:", error);
      }
    };

    checkAccess();
  }, [address, router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            V2 Access Required
          </h1>
          <p className="text-gray-600 mb-6">
            You need V2 access to view this page. Please connect your wallet to
            check your access status.
          </p>
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <p className="text-yellow-800 text-sm">
              V2 access is currently restricted to authorized users only.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
