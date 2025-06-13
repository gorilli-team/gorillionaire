"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/app/components/sidebar";
import Header from "@/app/components/header";

const DiscordPage = () => {
  const router = useRouter();

  useEffect(() => {
    const handleDiscordCallback = async () => {
      // Get URL parameters
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get("code");
      const state = urlParams.get("state");
      const error = urlParams.get("error");

      if (error) {
        router.push(`/users/${state}?discord_error=auth_error`);
        return;
      }

      if (code && state) {
        try {
          // Call backend to verify membership
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/discord/membership/verify`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                code: code,
                address: state,
              }),
            }
          );

          const data = await response.json();

          if (response.ok && data.isMember === true) {
            router.push(`/users/${state}`);
          } else {
            router.push(`/users/${state}?discord_error=not_member`);
          }

        } catch (error) {
          console.error("Discord verification failed:", error);
          router.push(`/users/${state}?discord_error=network_error`);
        }
      }
    };
    handleDiscordCallback();
  }, [router]);

  return (
    <div className="flex min-h-screen bg-gradient-to-r from-violet-50 to-indigo-50 text-gray-800">
      <div className="w-64 bg-white shadow-xl">
        <Sidebar selectedPage="" setSelectedPage={() => {}} />
      </div>

      <div className="flex-1 flex flex-col min-h-screen">
        <Header />
        <div className="flex-1 overflow-y-auto">
          <div className="w-full px-4 py-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-12">
                <div className="bg-white rounded-2xl shadow-lg p-6 h-full">
                  <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="text-center p-8 bg-white rounded-xl shadow-lg max-w-md">
                      <div className="text-6xl mb-6">🦍</div>
                      <h1 className="text-3xl font-bold text-gray-800 mb-4">
                        Discord verifying!
                      </h1>
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600 mx-auto mb-2"></div>
                      <p className="text-sm text-gray-500">
                        Checking membership...
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiscordPage;