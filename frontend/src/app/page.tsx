"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";

export default function HomePage() {
  const [accessCode, setAccessCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const { login, authenticated, ready } = usePrivy();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check if user is authenticated
    if (!authenticated) {
      login();
      return;
    }

    setIsLoading(true);
    setError("");

    // Access code validation rules from the original code
    if (accessCode.trim() === "") {
      // Empty code grants access
      localStorage.setItem("hasAccess", "true");
      router.push("/v2");
    } else {
      // Any non-empty code shows error
      setError("Invalid access code");
      setAccessCode("");
      setIsLoading(false);
    }
  };

  if (!ready) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="max-w-7xl w-full mx-auto flex flex-col md:flex-row gap-8">
          {/* Left: Connect Wallet Prompt */}
          <div className="flex-1 bg-white rounded-xl shadow-lg flex flex-col items-center justify-center p-10 min-h-[420px]">
            <div className="text-center mb-8">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-lg flex items-center justify-center">
                  <span className="text-2xl text-white font-bold">🦍</span>
                </div>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Gorillionaire
              </h1>
            </div>
            <h2 className="text-xl font-semibold mb-4">Connect your wallet</h2>
            <p className="text-gray-600 mb-6 text-center">
              Please connect your wallet to access Gorillionaire V2 signals.
            </p>
            <button
              onClick={login}
              className="px-6 py-3 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium hover:from-purple-700 hover:to-indigo-700 transition-all duration-200"
            >
              Connect Wallet
            </button>

            {/* V1 Access Link - Always visible */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600 mb-3">
                Or access V1 without wallet connection
              </p>
              <a
                href="/v1"
                className="inline-flex items-center justify-center px-6 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                <span className="mr-2">🦍</span>
                Access V1
              </a>
            </div>
          </div>
          {/* Right: Steps */}
          <div className="flex-1 bg-white rounded-xl shadow-lg p-10 min-h-[420px] flex flex-col justify-center">
            <h3 className="font-semibold text-lg mb-2">
              Didn&apos;t get your access code yet?
            </h3>
            <p className="text-gray-600 mb-4">
              Follow these simple steps to be among the first users to get
              access to Gorillionaire V2
            </p>
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-gray-50 rounded-md px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 flex items-center justify-center rounded-full bg-purple-100 text-purple-600 font-bold">
                    1
                  </span>
                  <span>Join our Discord Server</span>
                </div>
                <a
                  href="https://discord.gg/yYtgzHywRF"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-1 border border-purple-500 text-purple-600 rounded-md font-medium hover:bg-purple-50 transition text-sm"
                >
                  Join Server
                </a>
              </div>
              <div className="flex items-center justify-between bg-gray-50 rounded-md px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 flex items-center justify-center rounded-full bg-purple-100 text-purple-600 font-bold">
                    2
                  </span>
                  <span>
                    Drop your wallet address in the &quot;V2 Shortlist&quot;
                    channel
                  </span>
                </div>
                <a
                  href="https://discord.gg/yYtgzHywRF"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-1 border border-purple-500 text-purple-600 rounded-md font-medium hover:bg-purple-50 transition text-sm"
                >
                  Drop It
                </a>
              </div>
              <div className="flex items-center justify-between bg-gray-50 rounded-md px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 flex items-center justify-center rounded-full bg-purple-100 text-purple-600 font-bold">
                    3
                  </span>
                  <span>
                    Redeem your code and start using Gorillionaire V2!
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="max-w-7xl w-full mx-auto flex flex-col md:flex-row gap-8">
        {/* Left: Access Code Form */}
        <div className="flex-1 bg-white rounded-xl shadow-lg p-6">
          {/* Logo and Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-2xl text-white font-bold">🦍</span>
              </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Gorillionaire
            </h1>
            <p className="text-gray-600">
              Enter your V2 access code to continue
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="accessCode"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                V2 Access Code
              </label>
              <input
                type="text"
                id="accessCode"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                placeholder="Leave empty for access (or enter code)"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
                disabled={isLoading}
              />
            </div>

            {error && (
              <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 px-4 rounded-lg font-medium hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Verifying...
                </div>
              ) : (
                "Verify Access"
              )}
            </button>
          </form>
        </div>

        {/* Right: Steps */}
        <div className="flex-1 bg-white rounded-xl shadow-lg p-6">
          <h3 className="font-semibold text-lg mb-2">
            Didn&apos;t get your access code yet?
          </h3>
          <p className="text-gray-600 mb-4">
            Follow these simple steps to be among the first users to get access
            to Gorillionaire V2
          </p>
          <div className="space-y-3">
            <div className="flex items-center justify-between bg-gray-50 rounded-md px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 flex items-center justify-center rounded-full bg-purple-100 text-purple-600 font-bold">
                  1
                </span>
                <span>Join our Discord Server</span>
              </div>
              <a
                href="https://discord.gg/yYtgzHywRF"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-1 border border-purple-500 text-purple-600 rounded-md font-medium hover:bg-purple-50 transition text-sm"
              >
                Join Server
              </a>
            </div>
            <div className="flex items-center justify-between bg-gray-50 rounded-md px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 flex items-center justify-center rounded-full bg-purple-100 text-purple-600 font-bold">
                  2
                </span>
                <span>
                  Drop your wallet address in the &quot;V2 Shortlist&quot;
                  channel
                </span>
              </div>
              <a
                href="https://discord.gg/yYtgzHywRF"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-1 border border-purple-500 text-purple-600 rounded-md font-medium hover:bg-purple-50 transition text-sm"
              >
                Drop It
              </a>
            </div>
            <div className="flex items-center justify-between bg-gray-50 rounded-md px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 flex items-center justify-center rounded-full bg-purple-100 text-purple-600 font-bold">
                  3
                </span>
                <span>Redeem your code and start using Gorillionaire V2!</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
