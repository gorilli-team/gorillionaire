"use client";

import React, { useState, useEffect } from "react";
import V2Layout from "@/app/components/layout/V2Layout";
import { useAccount } from "wagmi";
import { UserService } from "@/app/services/userService";

const V2Dashboard = () => {
  const { address } = useAccount();
  const [selectedPage, setSelectedPage] = useState("V2");
  const [v2Access, setV2Access] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  // Check V2 access from user service
  useEffect(() => {
    const checkV2Access = async () => {
      if (address) {
        setLoading(true);
        try {
          const hasAccess = await UserService.checkV2Access(address);
          setV2Access(hasAccess);
        } catch (error) {
          console.error("Error checking V2 access:", error);
          setV2Access(false);
        } finally {
          setLoading(false);
        }
      } else {
        setV2Access(false);
        setLoading(false);
      }
    };

    checkV2Access();
  }, [address]);

  if (loading) {
    return (
      <V2Layout selectedPage={selectedPage} setSelectedPage={setSelectedPage}>
        <div className="w-full max-w-5xl mx-auto p-4 md:p-6">
          <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
            <div className="p-6 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading V2 Dashboard...</p>
            </div>
          </div>
        </div>
      </V2Layout>
    );
  }

  if (!v2Access) {
    return (
      <V2Layout selectedPage={selectedPage} setSelectedPage={setSelectedPage}>
        <div className="w-full max-w-5xl mx-auto p-4 md:p-6">
          <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
            <div className="bg-gradient-to-r from-red-600 to-red-700 p-4">
              <div className="flex items-center gap-2">
                <span className="text-white text-2xl">❌</span>
                <h1 className="text-xl font-bold text-white">
                  V2 Access Required
                </h1>
              </div>
            </div>
            <div className="p-6 text-center">
              <p className="text-gray-600 mb-4">
                You need V2 access to view this dashboard.
              </p>
              <button
                onClick={() => (window.location.href = "/v2")}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Get V2 Access
              </button>
            </div>
          </div>
        </div>
      </V2Layout>
    );
  }

  return (
    <V2Layout selectedPage={selectedPage} setSelectedPage={setSelectedPage}>
      <div className="w-full max-w-5xl mx-auto p-4 md:p-6">
        {/* Welcome Section */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-green-600 to-green-700 p-4">
            <div className="flex items-center gap-2">
              <span className="text-white text-2xl">✅</span>
              <h1 className="text-xl font-bold text-white">
                Welcome to Gorillionaire V2
              </h1>
            </div>
          </div>
          <div className="p-6">
            <div className="flex flex-col-reverse md:flex-row gap-6">
              {/* User Info */}
              <div className="w-full md:w-1/2">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">
                      Access Status
                    </h3>
                    <p className="text-lg font-semibold text-green-600">
                      ✅ V2 Access Enabled
                    </p>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-500">
                      User Address
                    </h3>
                    <a
                      href={`https://testnet.monadexplorer.com/address/${address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-lg font-medium text-purple-600 hover:text-purple-700 truncate block"
                    >
                      {address}
                    </a>
                  </div>

                  <div className="pt-4">
                    <div className="bg-green-50 rounded-lg p-4">
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                        <p className="text-sm text-green-700">
                          You have exclusive access to Gorillionaire V2
                          features!
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* V2 Logo */}
              <div className="w-full md:w-1/3">
                <div className="aspect-square w-full bg-gradient-to-br from-green-100 to-blue-100 rounded-lg flex border-2 border-green-200 overflow-hidden items-center justify-center">
                  <div className="text-center">
                    <div className="text-6xl mb-4">🦍</div>
                    <h3 className="text-xl font-bold text-green-700">
                      V2 Dashboard
                    </h3>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* V2 Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">📈</span>
              </div>
              <h3 className="text-lg font-semibold">Enhanced Signals</h3>
            </div>
            <p className="text-gray-600">
              Advanced trading signals with improved accuracy and real-time
              analytics.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">⚡</span>
              </div>
              <h3 className="text-lg font-semibold">Faster Performance</h3>
            </div>
            <p className="text-gray-600">
              Optimized infrastructure for lightning-fast signal delivery and
              execution.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">🎯</span>
              </div>
              <h3 className="text-lg font-semibold">Precision Trading</h3>
            </div>
            <p className="text-gray-600">
              More precise entry and exit points with advanced risk management.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">📊</span>
              </div>
              <h3 className="text-lg font-semibold">Advanced Analytics</h3>
            </div>
            <p className="text-gray-600">
              Comprehensive market analysis and portfolio tracking tools.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">🔔</span>
              </div>
              <h3 className="text-lg font-semibold">Smart Notifications</h3>
            </div>
            <p className="text-gray-600">
              Intelligent alerts for optimal trading opportunities and market
              changes.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">🛡️</span>
              </div>
              <h3 className="text-lg font-semibold">Enhanced Security</h3>
            </div>
            <p className="text-gray-600">
              Advanced security measures to protect your trading activities.
            </p>
          </div>
        </div>

        {/* Coming Soon Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4">
            🚀 More V2 Features Coming Soon
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <span className="text-2xl">🤖</span>
              <div>
                <h4 className="font-medium">AI Trading Bots</h4>
                <p className="text-sm text-gray-600">
                  Automated trading strategies
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <span className="text-2xl">🌐</span>
              <div>
                <h4 className="font-medium">Cross-Chain Support</h4>
                <p className="text-sm text-gray-600">
                  Multi-chain trading capabilities
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <span className="text-2xl">📱</span>
              <div>
                <h4 className="font-medium">Mobile App</h4>
                <p className="text-sm text-gray-600">
                  Native mobile experience
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <span className="text-2xl">🎮</span>
              <div>
                <h4 className="font-medium">Social Trading</h4>
                <p className="text-sm text-gray-600">Follow top traders</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </V2Layout>
  );
};

export default V2Dashboard;
