"use client";

import React, { useState } from "react";
import Sidebar from "@/app/components/sidebar";
import Header from "@/app/components/header";
import TokensComponent from "@/app/components/tokens";

const TokensPage = () => {
  const [selectedPage, setSelectedPage] = useState("Tokens");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen h-screen bg-gray-100 text-gray-800 overflow-hidden">
      {/* Mobile menu button */}
      <button
        className="lg:hidden fixed top-4 left-4 z-20 p-2 rounded-md bg-gray-200"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
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

      {/* Sidebar with mobile responsiveness */}
      <div
        className={`
        fixed lg:static
        h-screen
        ${
          isMobileMenuOpen
            ? "translate-x-0"
            : "-translate-x-full lg:translate-x-0"
        }
        transition-transform duration-300 ease-in-out
        z-10 lg:z-0
      `}
      >
        <Sidebar
          selectedPage={selectedPage}
          setSelectedPage={setSelectedPage}
        />
      </div>

      {/* Overlay for mobile */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-0 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <div className="flex-1 flex flex-col overflow-auto">
        <Header />
        <main className="flex-1 overflow-y-auto">
          <TokensComponent />
        </main>
      </div>
    </div>
  );
};

export default TokensPage;