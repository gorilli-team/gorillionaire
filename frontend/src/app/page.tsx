"use client";

import { useState, useEffect } from "react";
import Sidebar from "./components/sidebar/index";
import Header from "./components/header/index";
import Main from "./components/main/index";
import mixpanel from "mixpanel-browser";

export default function AppLayout() {
  const [selectedPage, setSelectedPage] = useState("Signals");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    mixpanel.init("519618776e9d2c52e9b4a4c02ae75267", {
      debug: true,
      track_pageview: true,
      persistence: "localStorage",
    });
  }, []);

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
      {/* Mobile menu button */}
      <button
        className="lg:hidden fixed top-4 left-4 z-40 p-2 rounded-full bg-gray-200 dark:bg-gray-700"
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
          bg-white dark:bg-gray-800
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
        <Header />
        <Main selectedPage={selectedPage} setSelectedPage={setSelectedPage} />
      </div>
    </div>
  );
}
