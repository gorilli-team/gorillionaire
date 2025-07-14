"use client";

import { useAuth } from "@/app/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAccount } from "wagmi";

interface ProtectProps {
  children: React.ReactNode;
  requireV2Access?: boolean;
}

export default function ProtectPage({ 
  children, 
  requireV2Access = false 
}: ProtectProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const { address } = useAccount();
  const router = useRouter();
  
  const [hasV2Access, setHasV2Access] = useState(false);
  const [v2AccessLoading, setV2AccessLoading] = useState(true);
  const [v2AccessInfo, setV2AccessInfo] = useState<{
    enabledAt?: string;
    accessCodeUsed?: string;
  }>({});

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/v2");
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (requireV2Access && isAuthenticated && !isLoading && address) {
      const checkV2Access = async () => {
        try {
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/access/status/${address.toLowerCase()}`
          );
          const data = await response.json();
          
          if (data.success) {
            setHasV2Access(data.v2Enabled || false);
            setV2AccessInfo({
              enabledAt: data.enabledAt,
              accessCodeUsed: data.accessCodeUsed,
            });
          }
        } catch (error) {
          console.error("Error checking V2 access:", error);
          setHasV2Access(false);
        } finally {
          setV2AccessLoading(false);
        }
      };

      checkV2Access();
    } else if (!requireV2Access) {
      setV2AccessLoading(false);
    }
  }, [requireV2Access, isAuthenticated, isLoading, address]);

  if (isLoading) return null;

  if (!isAuthenticated) return null;

  if (requireV2Access && v2AccessLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verifying V2 access...</p>
        </div>
      </div>
    );
  }

  if (requireV2Access && !hasV2Access) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full mx-4">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L4.616 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              V2 Access Required
            </h1>
            <p className="text-gray-600 mb-4">
              To access V2 signals you must first redeem a valid access code
            </p>
          </div>

          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-blue-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-sm text-blue-800 font-medium">
                    How to get access:
                  </p>
                  <p className="text-sm text-blue-700 mt-1">
                    Go to the V2 page and enter your access code to enable signals access
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => router.push("/v2")}
              className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors duration-200"
            >
              Go to V2 Page
            </button>
          </div>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              Wallet connected: {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "Not connected"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}