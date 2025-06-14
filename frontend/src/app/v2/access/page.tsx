"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";

export default function AccessPage() {
  const [code, setCode] = useState<string[]>(Array(6).fill(""));
  const [error, setError] = useState("");
  const router = useRouter();
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const { login, authenticated, ready } = usePrivy();

  useEffect(() => {
    inputRefs.current = inputRefs.current.slice(0, 6);
  }, []);

  const handleChange = (index: number, value: string) => {
    // Only allow letters and numbers
    const sanitizedValue = value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();

    if (sanitizedValue.length > 1) {
      // If multiple characters are pasted, distribute them
      const chars = sanitizedValue.split("").slice(0, 6);
      const newCode = [...code];
      chars.forEach((char, i) => {
        if (index + i < 6) {
          newCode[index + i] = char;
        }
      });
      setCode(newCode);

      // Focus the next empty input or the last one
      const nextEmptyIndex = newCode.findIndex((char) => !char);
      if (nextEmptyIndex !== -1) {
        inputRefs.current[nextEmptyIndex]?.focus();
      } else {
        inputRefs.current[5]?.focus();
      }
    } else {
      // Single character input
      const newCode = [...code];
      newCode[index] = sanitizedValue;
      setCode(newCode);

      // Move to next input if character is entered
      if (sanitizedValue && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      // Move to previous input on backspace if current input is empty
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const accessCode = code.join("");
    if (accessCode === "") {
      localStorage.setItem("hasAccess", "true");
      router.push("/v2/signals");
    } else {
      setError("Invalid access code");
      setCode(Array(6).fill(""));
      inputRefs.current[0]?.focus();
    }
  };

  if (!ready) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-7xl w-full mx-auto p-6 flex flex-col md:flex-row gap-8">
          {/* Left: Connect Wallet Prompt */}
          <div className="flex-1 bg-white rounded-xl shadow-sm flex flex-col items-center justify-center p-10 min-h-[420px]">
            <h2 className="text-xl font-semibold mb-4">Connect your wallet</h2>
            <p className="text-gray-600 mb-6 text-center">
              Please connect your wallet to access Gorillionaire V2 signals.
            </p>
            <button
              onClick={login}
              className="px-6 py-2 rounded-md bg-purple-600 text-white font-medium hover:bg-purple-700 transition"
            >
              Connect Wallet
            </button>
          </div>
          {/* Right: Steps */}
          <div className="flex-1 bg-white rounded-xl shadow-sm p-10 min-h-[420px] flex flex-col justify-center">
            <h3 className="font-semibold text-lg mb-2">
              Didn&apos;t got your access code yet?
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
                  href="https://discord.gg/your-link"
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
                  href="https://discord.gg/your-link"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-1 border border-purple-500 text-purple-600 rounded-md font-medium hover:bg-purple-50 transition text-sm"
                >
                  Drop address
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
                <button className="px-4 py-1 border border-purple-500 text-purple-600 rounded-md font-medium hover:bg-purple-50 transition text-sm">
                  Redeem code
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-7xl w-full mx-auto p-6 flex flex-col md:flex-row gap-8">
        {/* Left: Access Code Input */}
        <div className="flex-1 bg-white rounded-xl shadow-sm flex flex-col items-center justify-center p-10 min-h-[420px]">
          <form
            onSubmit={handleSubmit}
            className="w-full flex flex-col items-center"
          >
            <h2 className="text-xl font-semibold mb-6">
              Enter your V2 access code
            </h2>
            <div className="flex flex-nowrap gap-3 mb-6 overflow-x-auto">
              {code.map((char, index) => (
                <input
                  key={index}
                  ref={(el) => {
                    if (el) inputRefs.current[index] = el;
                  }}
                  type="text"
                  maxLength={1}
                  value={char}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="w-12 h-12 text-center text-xl font-bold border-2 border-gray-200 rounded-md focus:border-purple-500 focus:ring-1 focus:ring-purple-500 bg-gray-50"
                  style={{ textTransform: "uppercase" }}
                  autoComplete="off"
                />
              ))}
            </div>
            {error && <div className="text-red-500 text-sm mb-4">{error}</div>}
            <button
              type="submit"
              className="px-8 py-2 rounded-md bg-purple-600 text-white font-medium hover:bg-purple-700 transition"
            >
              Verify
            </button>
          </form>
        </div>
        {/* Right: Steps */}
        <div className="flex-1 bg-white rounded-xl shadow-sm p-10 min-h-[420px] flex flex-col justify-center">
          <h3 className="font-semibold text-lg mb-2">
            Didn&apos;t got your access code yet?
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
                href="https://discord.gg/your-link"
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
                href="https://discord.gg/your-link"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-1 border border-purple-500 text-purple-600 rounded-md font-medium hover:bg-purple-50 transition text-sm"
              >
                Drop address
              </a>
            </div>
            <div className="flex items-center justify-between bg-gray-50 rounded-md px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 flex items-center justify-center rounded-full bg-purple-100 text-purple-600 font-bold">
                  3
                </span>
                <span>Redeem your code and start using Gorillionaire V2!</span>
              </div>
              <button className="px-4 py-1 border border-purple-500 text-purple-600 rounded-md font-medium hover:bg-purple-50 transition text-sm">
                Redeem code
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
