"use client";
import Header from "@/app/components/header";
import Sidebar from "@/app/components/sidebar";
import { useState } from "react";
import { Providers } from "@/app/providers";
import { AuthProvider } from "@/app/contexts/AuthContext";
import { TradeProvider } from "@/app/contexts/TradeContext";

export default function GorillionaireLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [selectedPage, setSelectedPage] = useState("Signals");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <Providers>
      <AuthProvider>
        <TradeProvider>
          <div className="flex h-screen bg-gray-100 text-gray-800">
            {/* Mobile menu button */}
            <button
              className="lg:hidden fixed top-4 left-4 z-40 p-2 rounded-full bg-gray-200"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle mobile menu"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d={
                    isMobileMenuOpen
                      ? "M6 18L18 6M6 6l12 12"
                      : "M4 6h16M4 12h16M4 18h16"
                  }
                />
              </svg>
            </button>

            {/* Sidebar */}
            <div
              className={`
                  fixed lg:relative
                  ${
                    isMobileMenuOpen
                      ? "translate-x-0"
                      : "-translate-x-full lg:translate-x-0"
                  }
                  transition-transform duration-300 ease-in-out
                  z-30 lg:z-0
                  bg-white
                  shadow-xl lg:shadow-none
                  h-full
                `}
            >
              <Sidebar
                selectedPage={selectedPage}
                setSelectedPage={setSelectedPage}
              />
            </div>

            {/* Overlay (mobile only) */}
            {isMobileMenuOpen && (
              <div
                className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
                onClick={() => setIsMobileMenuOpen(false)}
              />
            )}

            {/* Main content */}
            <div className="flex-1 flex flex-col h-full">
              <div>
                <Header />
              </div>
              {children}
            </div>
          </div>
        </TradeProvider>
      </AuthProvider>
    </Providers>
  );
}
