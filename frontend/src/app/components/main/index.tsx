/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useEffect } from "react";
import styles from "./index.module.css";

import { useAccount } from "wagmi";
import Tokens from "../tokens";
import Signals from "../signals";
import Agents from "../agents";
import Leaderboard from "../leaderboard";

interface MainProps {
  selectedPage: string;
  setSelectedPage: React.Dispatch<React.SetStateAction<string>>;
}

export default function Main({ selectedPage, setSelectedPage }: MainProps) {
  const renderContent = () => {
    switch (selectedPage) {
      case "Tokens":
        return (
          <div className="w-full flex flex-col justify-center items-center text-gray-800">
            <Tokens />
          </div>
        );
      case "Signals":
        return (
          <div className="w-full flex flex-col justify-center items-center text-gray-800">
            <Signals />
          </div>
        );
      case "Agents":
        return (
          <div className="w-full flex flex-col justify-center items-center text-gray-800">
            <Agents />
          </div>
        );
      case "Leaderboard":
        return (
          <div className="w-full flex flex-col justify-center items-center text-gray-800">
            <Leaderboard />
          </div>
        );
      default:
        return <div className="p-4 text-gray-800">Select a page</div>;
    }
  };

  return (
    <main
      className={`flex-1 overflow-y-auto h-screen bg-gray-200 ${styles.mainContent}`}
    >
      {renderContent()}
    </main>
  );
}
